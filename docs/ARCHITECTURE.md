# Architecture

## High-Level Design
Ksynq is a two-part application:

- A React SPA in `client/` for authentication, maps, groups, chat, settings, analytics, and admin views.
- An Express + Socket.IO backend in `server/` that handles authentication, data persistence, real-time group communication, safety logic, and payment endpoints.

MongoDB is used for users, groups, locations, messages, notifications, safety alerts, and geofences.

## Runtime Flow

### Authentication
1. User registers or logs in through `/api/auth`.
2. Server returns a JWT plus a serialized user payload.
3. Frontend stores auth state in Redux.
4. Protected frontend routes require a logged-in user.
5. Protected backend routes use bearer-token middleware.

### Live Location
1. Dashboard starts browser geolocation tracking.
2. Client emits `update-location` over Socket.IO for each joined group.
3. Server enforces privacy checks before broadcasting.
4. Group members receive `location-broadcast`.
5. Frontend also periodically persists location through REST.
6. Offline location batches can later be synced with `/api/location/bulk`.

### Safety Processing
On incoming socket location updates, the backend also runs anomaly checks:

- stationary anomaly detection
- sudden stop detection
- basic route deviation detection
- geofence enter/exit transitions

Alerts are emitted to the group and some are also persisted as notifications or safety alerts.

### SOS Flow
1. User presses the SOS button in the dashboard.
2. Client emits `sos-alert` with current location and joined group IDs.
3. Server broadcasts to group rooms.
4. Server persists notification records for other group members.
5. Server optionally triggers emergency-contact delivery through the notification service.
6. Fallback share links and the public SOS page are used when direct provider integration is unavailable.

## Frontend Architecture

### Application Shell
- `client/src/main.jsx`: bootstraps React and Redux, registers service worker
- `client/src/App.jsx`: route configuration
- `client/src/layouts/Layout.jsx`: protected app shell, nav, notification listeners

### State Management
Redux Toolkit slices are used for:

- `auth`
- `groups`
- `location`
- `geofences`
- `notifications`

### Service Layer
- `client/src/services/socket.js`: Socket.IO client instance
- `client/src/services/paymentService.js`: Razorpay checkout launcher and verification flow
- `client/src/services/browserNotifications.js`: browser notification helpers
- `client/src/services/batteryService.js`: Web Battery API wrapper

### Key Pages
- `Home`: marketing/landing page
- `Login`, `Register`: authentication
- `Dashboard`: live map, SOS, geofences, anomaly display, history playback
- `Groups`: create, join, invite, inspect, delete groups
- `Chat`: group messaging
- `History`: historic route viewing
- `Notifications`: persisted alert center
- `Analytics`: premium metrics dashboard
- `Settings`: preferences, push notifications, invisible mode, emergency contacts
- `Upgrade`, `Success`: payment and post-checkout flows
- `PublicSOS`: unauthenticated shared SOS page
- `Admin`: admin-only user listing page

## Backend Architecture

### Entry Point
- `server/server.js`: Express app setup, DB connection, middleware, routes, Socket.IO server

### Middleware
- `server/middleware/auth.js`: bearer-token protection and role authorization

### Controllers
- `auth`: register, login, current user, preferences, profile, admin users
- `groups`: create/join/list/delete groups, geofence create/list
- `location`: latest location, bulk sync, group location fetch, history fetch
- `notifications`: list, mark read, mark all read, test SOS
- `chat`: message history fetch
- `analytics`: daily summaries and alert counts
- `subscriptions`: Stripe checkout session

### Services
- `safetyService`: anomaly detection on live location streams
- `notificationService`: Twilio SMS or share-link fallback handling for SOS

## Data Model Summary
- `User`: identity, password hash, role, plan tier, preferences, emergency contacts
- `Group`: owner, members, invite code
- `Location`: latest known location per user
- `LocationHistory`: time-series archive of location updates
- `Geofence`: group-linked circle zone
- `Message`: group chat message
- `Notification`: per-user alert inbox item
- `SafetyAlert`: persisted anomaly record

## Deployment Shape
- Frontend is set up for Vercel-style deployment.
- Backend is designed for Node hosting such as Render or Railway.
- Socket.IO shares the same backend server as the REST API.

## Current Implementation Notes
- Client sockets are opened lazily and reused across pages.
- Browser push uses service-worker notifications, not a push subscription backend.
- Payment support exists in two parallel paths:
- Stripe subscription checkout in `controllers/subscriptions.js`
- Razorpay order/verify flow in `routes/payment.js`
- Plan gating is enforced in several controller-level checks, especially around groups and history.
