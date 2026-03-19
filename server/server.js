require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const safetyService = require('./services/safetyService');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const frontendUrl = process.env.FRONTEND_URL || '*';
const allowedOrigins = frontendUrl === '*' ? ['*'] : [frontendUrl, frontendUrl.replace(/\/$/, ""), 'http://localhost:5173', 'http://127.0.0.1:5173'];

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
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/location', require('./routes/location'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/chat', require('./routes/chat'));

// Socket.io initialization
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // User joins their groups
  socket.on('join-groups', (groupIds) => {
    if (Array.isArray(groupIds)) {
      groupIds.forEach(id => {
        socket.join(id);
        console.log(`User ${socket.id} joined group room: ${id}`);
      });
    }
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

          if (dist <= fence.radius) {
            // User is inside geofence
            io.to(data.groupId).emit('geofence-alert', {
              userId: data.userId,
              userName: data.userName,
              fenceName: fence.name,
              type: 'enter',
              timestamp: Date.now()
            });

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
                    message: `${data.userName} entered ${fence.name}`,
                    data: {
                      groupId: data.groupId,
                      userName: data.userName,
                      fenceName: fence.name,
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
  socket.on('sos-alert', (data) => {
    // data: { userId, userName, lat, lng, groupIds: [] }
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
      console.log(`🚨 SOS Alert triggered by ${data.userName} for groups:`, data.groupIds);
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

      // Broadcast to the whole group room including the sender (for multi-device sync)
      io.to(data.groupId).emit('receive-message', newMessage);
      
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
  res.status(200).json({ status: 'OK', message: 'TrackSphere Server is running' });
});

app.get('/', (req, res) => {
  res.send('TrackSphere API is Live and Running!');
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
