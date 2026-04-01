# Module Map

## Frontend

### Entry and Routing
- `client/src/main.jsx`: React entrypoint, Redux provider, service worker registration
- `client/src/App.jsx`: route tree, protected routes, public-only routes
- `client/src/layouts/Layout.jsx`: sidebar shell, header, socket-driven notification listeners

### Pages
- `client/src/pages/Home.jsx`: landing page
- `client/src/pages/Login.jsx`: login form
- `client/src/pages/Register.jsx`: registration form
- `client/src/pages/Dashboard.jsx`: live map, tracking, geofences, SOS, anomaly UI, offline sync
- `client/src/pages/Groups.jsx`: group CRUD/join/share/member modal
- `client/src/pages/Chat.jsx`: real-time group chat UI
- `client/src/pages/History.jsx`: location history map view
- `client/src/pages/Notifications.jsx`: notification inbox
- `client/src/pages/Analytics.jsx`: charts and premium insights
- `client/src/pages/Settings.jsx`: privacy, push notifications, emergency contacts, test SOS
- `client/src/pages/Upgrade.jsx`: plan upgrade experience
- `client/src/pages/Success.jsx`: post-payment success page
- `client/src/pages/PublicSOS.jsx`: unauthenticated public SOS share page
- `client/src/pages/Admin.jsx`: admin dashboard for user listing

### Components
- `client/src/components/UpgradeModal.jsx`: premium upsell modal
- `client/src/components/HistoryPlaybackControls.jsx`: playback controls for route history
- `client/src/components/GroupChat.jsx`: reusable chat panel variant

### Redux Slices
- `client/src/redux/authSlice.js`: auth actions, token usage, profile/preferences updates
- `client/src/redux/groupSlice.js`: group fetch/create/join/delete
- `client/src/redux/locationSlice.js`: latest location persistence and invisible-mode flag
- `client/src/redux/geofenceSlice.js`: group geofence fetch/create
- `client/src/redux/notificationSlice.js`: notification fetch and local notification additions
- `client/src/redux/store.js`: store composition

### Services and Utilities
- `client/src/services/socket.js`: singleton socket client
- `client/src/services/paymentService.js`: Razorpay integration wrapper
- `client/src/services/browserNotifications.js`: permission + display helpers
- `client/src/services/batteryService.js`: browser battery helper
- `client/src/utils/sosLinks.js`: public SOS link/share text generation

### Public Assets
- `client/public/sw.js`: offline asset cache + notification click handler
- `client/public/manifest.json`: PWA manifest
- `client/public/icon-512.png`: notification/PWA icon

## Backend

### App Bootstrap
- `server/server.js`: DB connection, middleware, routes, Socket.IO handlers, health routes
- `server/config/db.js`: Mongo connection with in-memory fallback
- `server/config/subscriptionPlans.js`: plan metadata lookup

### Middleware
- `server/middleware/auth.js`: token verification and role authorization

### Routes
- `server/routes/auth.js`
- `server/routes/groups.js`
- `server/routes/location.js`
- `server/routes/notifications.js`
- `server/routes/subscriptions.js`
- `server/routes/analytics.js`
- `server/routes/chat.js`
- `server/routes/payment.js`

### Controllers
- `server/controllers/auth.js`
- `server/controllers/groups.js`
- `server/controllers/location.js`
- `server/controllers/notifications.js`
- `server/controllers/subscriptions.js`
- `server/controllers/analytics.js`
- `server/controllers/chat.js`

### Services
- `server/services/safetyService.js`: real-time anomaly detection
- `server/services/notificationService.js`: emergency-contact delivery and fallback link generation

### Data Models
- `server/models/User.js`
- `server/models/Group.js`
- `server/models/Location.js`
- `server/models/LocationHistory.js`
- `server/models/Geofence.js`
- `server/models/Notification.js`
- `server/models/Message.js`
- `server/models/SafetyAlert.js`

## Storage Responsibilities
- `User`: authentication, plan, preferences, emergency contacts
- `Group`: ownership, members, invite code
- `Location`: latest user state
- `LocationHistory`: historical point archive
- `Geofence`: circular zones per group
- `Notification`: user inbox records
- `Message`: chat persistence
- `SafetyAlert`: anomaly history
