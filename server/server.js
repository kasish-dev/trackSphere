require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const safetyService = require('./services/safetyService');
const notificationService = require('./services/notificationService');
const attendanceService = require('./services/attendanceService');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const rawFrontendUrl = process.env.FRONTEND_URL || '*';
const frontendUrls = rawFrontendUrl.split(',').map(url => url.trim());
const allowedOrigins = frontendUrls.includes('*') ? ['*'] : [
  ...frontendUrls,
  ...frontendUrls.map(url => url.replace(/\/$/, "")),
  'http://localhost:5173', 
  'http://127.0.0.1:5173', 
  'http://localhost:5174', 
  'http://127.0.0.1:5174'
];

// 1. CORS Middleware (Must be before any routes or other middleware like helmet/limiter)
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}));

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Middleware
app.use(helmet());

// Rate Limiting
const isDevelopment = process.env.NODE_ENV !== 'production';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

app.use(express.json());
app.set('io', io); // Attach io to app for use in controllers

// State to track if user was inside a geofence (to prevent alert spam)
// In a real production app, this should be in Redis or DB
const userFenceStatus = {}; 

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/', apiLimiter);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/location', require('./routes/location'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/reports', require('./routes/reports'));

// Socket.io initialization
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  const joinGroupRoom = (groupId) => {
    if (groupId) {
      socket.join(groupId);
      console.log(`User ${socket.id} joined group room: ${groupId}`);
    }
  };

  const leaveGroupRoom = (groupId) => {
    if (groupId) {
      socket.leave(groupId);
      console.log(`User ${socket.id} left group room: ${groupId}`);
    }
  };

  // User joins their groups
  socket.on('join-groups', (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach(id => {
        joinGroupRoom(id);
      });
    }
  });

  socket.on('join-group', (groupId) => {
    joinGroupRoom(groupId);
  });

  socket.on('leave-group', (groupId) => {
    leaveGroupRoom(groupId);
  });

  // Handle live location update
  socket.on('update-location', async (data) => {
    // data: { userId, userName, lat, lng, groupId, ... }
    
    // SERVER-SIDE PRIVACY ENFORCEMENT
    try {
      const User = require('./models/User');
      const user = await User.findById(data.userId);
      
      // If user is invisible or location privacy is enabled, discard the update
      if (!user || user.preferences?.locationPrivacy || data.isInvisible) {
        return; 
      }
    } catch (err) {
      console.error('Privacy check error:', err);
      return;
    }

    if (data.groupId) {
      // Broadcast location to group members
      socket.to(data.groupId).emit('location-broadcast', data);

      // Process AI Safety Anomalies (Stationary / Velocity)
      safetyService.processUpdate(io, data);

      // Check for geofences in this group
      try {
        const Geofence = require('./models/Geofence');
        const geofences = await Geofence.find({ groupId: data.groupId });
        
        for (const fence of geofences) {
          // Calculate distance between user and fence center
          const dist = getDistance(
            data.lat, data.lng, 
            fence.center.lat, fence.center.lng
          );

          const isInside = dist <= fence.radius;
          const statusKey = `${data.userId}_${fence._id}`;
          const wasInside = userFenceStatus[statusKey] || false;

          // Only trigger if state changed (Enter or Exit)
          if (isInside !== wasInside) {
            userFenceStatus[statusKey] = isInside;
            
            const eventType = isInside ? 'enter' : 'exit';

            io.to(data.groupId).emit('geofence-alert', {
              userId: data.userId,
              userName: data.userName,
              fenceName: fence.name,
              type: eventType,
              timestamp: Date.now()
            });

            // INTEGRATE ATTENDANCE SYSTEM: Auto check-in/check-out for office geofences
            try {
              if (eventType === 'enter') {
                await attendanceService.handleGeofenceEntry(
                  data.userId,
                  fence._id,
                  new Date(),
                  { lat: data.lat, lng: data.lng }
                );
              } else if (eventType === 'exit') {
                await attendanceService.handleGeofenceExit(
                  data.userId,
                  fence._id,
                  new Date(),
                  { lat: data.lat, lng: data.lng }
                );
              }
            } catch (attendanceError) {
              console.error('Attendance processing error:', attendanceError);
            }

            // PERSISTENT NOTIFICATION: Save for all members in the group
            try {
              const Group = require('./models/Group');
              const Notification = require('./models/Notification');
              const group = await Group.findById(data.groupId);
              if (group) {
                const notifications = group.members
                  .filter(memberId => memberId.toString() !== data.userId.toString())
                  .map(memberId => ({
                    userId: memberId,
                    type: 'geofence',
                    message: `${data.userName} ${eventType === 'enter' ? 'entered' : 'left'} ${fence.name}`,
                    data: {
                      groupId: data.groupId,
                      userName: data.userName,
                      fenceName: fence.name,
                      type: eventType,
                      lat: data.lat,
                      lng: data.lng
                    }
                  }));
                if (notifications.length > 0) {
                  await Notification.insertMany(notifications);
                }
              }
            } catch (err) {
              console.error('Save geofence notification error:', err);
            }
          }
        }
      } catch (err) {
        console.error('Geofence check error:', err);
      }
    }
  });

  // Handle member joined notification
  socket.on('member-joined', (data) => {
    // data: { userName, groupId }
    if (data.groupId) {
      socket.to(data.groupId).emit('new-member-alert', {
        userName: data.userName,
        timestamp: Date.now()
      });
    }
  });

  // Handle SOS Alert
  socket.on('sos-alert', async (data) => {
    // data: { userId, userName, lat, lng, groupIds: [] }
      const User = require('./models/User');
      const userProfile = await User.findById(data.userId);

      // Notify Groups
      data.groupIds.forEach(async (groupId) => {
        // Broadcast to everyone in the room (including sender if they need feedback, but usually to others)
        socket.to(groupId).emit('sos-received', {
          userId: data.userId,
          userName: data.userName,
          lat: data.lat,
          lng: data.lng,
          timestamp: Date.now()
        });

        // PERSISTENT NOTIFICATION: Save for everyone in these groups
        try {
          const Group = require('./models/Group');
          const Notification = require('./models/Notification');
          const group = await Group.findById(groupId);
          if (group) {
            const notifications = group.members
              .filter(memberId => memberId.toString() !== data.userId.toString())
              .map(memberId => ({
                userId: memberId,
                type: 'sos',
                message: `EMERGENCY: ${data.userName} triggered an SOS!`,
                data: {
                  groupId: groupId,
                  userName: data.userName,
                  lat: data.lat,
                  lng: data.lng
                }
              }));
            if (notifications.length > 0) {
              await Notification.insertMany(notifications);
            }
          }
        } catch (err) {
          console.error('Save SOS notification error:', err);
        }
      });

      // Notify Personal Emergency Contacts
      if (userProfile && userProfile.emergencyContacts) {
        notificationService.sendEmergencyAlert({
          type: data.isTest ? 'TEST_SOS' : 'SOS_TRIGGERED',
          user: userProfile,
          contacts: userProfile.emergencyContacts,
          location: { lat: data.lat, lng: data.lng }
        });
      }

      console.log(`🚨 ${data.isTest ? 'TEST ' : ''}SOS Alert triggered by ${data.userName}`);
  });

  // Handle SOS Recording
  socket.on('sos-recording-ready', (data) => {
    // data: { userId, recordingUrl, groupIds: [] }
    if (data.groupIds && Array.isArray(data.groupIds)) {
      data.groupIds.forEach((groupId) => {
        socket.to(groupId).emit('sos-recording-available', data);
      });
    }
  });

  // Handle Group Chat Messages
  socket.on('send-message', async (data) => {
    // data: { groupId, senderId, userName, text }
    try {
      const Message = require('./models/Message');
      const newMessage = await Message.create({
        groupId: data.groupId,
        senderId: data.senderId,
        userName: data.userName,
        text: data.text
      });

      // Send immediately back to the sender and broadcast to the rest of the room.
      // This avoids depending on room-join timing for the sender's own UI update.
      socket.emit('receive-message', newMessage);
      socket.to(data.groupId).emit('receive-message', newMessage);
      
      console.log(`💬 Message from ${data.userName} in group ${data.groupId}`);
    } catch (err) {
      console.error('Socket Chat Error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Helper to calculate distance in meters (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in meters
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Ksynq Server is running' });
});

app.get('/', (req, res) => {
  res.send('Ksynq API is Live and Running!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
