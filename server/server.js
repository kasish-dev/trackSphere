require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const frontendUrl = process.env.FRONTEND_URL || '*';
const allowedOrigins = frontendUrl === '*' ? '*' : [frontendUrl, frontendUrl.replace(/\/$/, "")];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/location', require('./routes/location'));

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
    // data: { userId, userName, lat, lng, groupId }
    if (data.groupId) {
      // Broadcast location to group members
      socket.to(data.groupId).emit('location-broadcast', data);

      // Check for geofences in this group
      try {
        const Geofence = require('./models/Geofence');
        const geofences = await Geofence.find({ groupId: data.groupId });
        
        geofences.forEach(fence => {
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
          }
        });
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
