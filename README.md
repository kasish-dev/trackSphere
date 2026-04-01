# TrackSphere

TrackSphere is a real-time team and safety tracking platform built with React, Vite, Express, Socket.IO, and MongoDB. It supports live map tracking, groups, chat, geofences, SOS workflows, notifications, analytics, and subscription upgrades.

## Repository Structure

```text
trackSphare/
  client/   React frontend
  server/   Express API + Socket.IO server
  docs/     Developer documentation
```

## Main Features
- JWT-based authentication
- Live location sharing across groups
- Group creation and invite-code joining
- Geofence creation with real-time enter/exit alerts
- SOS alerting and emergency contact workflows
- Group chat
- Location history playback
- Analytics dashboard
- Tier-based feature limits
- Stripe and Razorpay payment flows
- Browser notifications and basic PWA support

## Quick Start

### 1. Install dependencies
```powershell
cd client
npm install
cd ../server
npm install
```

### 2. Configure environment
Create a `.env` file inside `server/` with at least:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

Create a `.env` file inside `client/` if you want a custom API URL:

```env
VITE_API_URL=http://localhost:5000
```

### 3. Run the app
```powershell
cd server
npm run dev
```

```powershell
cd client
npm run dev
```

Frontend default: `http://localhost:5173`

Backend default: `http://localhost:5000`

## Documentation Index
- Product overview: `DOCUMENTATION.md`
- Local setup and env vars: `docs/SETUP.md`
- System design and flows: `docs/ARCHITECTURE.md`
- REST routes and socket events: `docs/API.md`
- Frontend/backend module map: `docs/MODULES.md`

## Notes
- The backend attempts to fall back to an in-memory MongoDB instance if `MONGO_URI` connection fails.
- Some premium flows have simulation fallbacks when external payment/SMS providers are not configured.
- The worktree currently contains active local changes; documentation was written to match the repository state as checked in this workspace.
