# Setup Guide

## Requirements
- Node.js 18+ recommended
- npm
- MongoDB Atlas connection string, or allow the app to use the in-memory fallback for local experimentation

## Install

### Frontend
```powershell
cd client
npm install
```

### Backend
```powershell
cd server
npm install
```

## Environment Variables

### Backend `server/.env`

Required:

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=replace_with_a_secure_secret
FRONTEND_URL=http://localhost:5173
PORT=5000
```

Optional payment configuration:

```env
STRIPE_SECRET_KEY=sk_test_...
RAZORPAY_MODE=test
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

Razorpay modes:
- `test`: uses Razorpay test keys and opens the real Razorpay checkout in sandbox mode.
- `mock`: skips Razorpay entirely and uses the local demo payment fallback.
- `live`: uses live Razorpay keys for production payments.

Optional emergency alert configuration:

```env
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

### Frontend `client/.env`

Optional:

```env
VITE_API_URL=http://localhost:5000
```

If omitted, the frontend defaults to `http://localhost:5000`.

## Run Locally

### Start backend
```powershell
cd server
npm run dev
```

### Start frontend
```powershell
cd client
npm run dev
```

## Build

### Frontend production build
```powershell
cd client
npm run build
```

### Backend production start
```powershell
cd server
npm start
```

## Local URLs
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/health`

## Operational Notes
- CORS allows the configured `FRONTEND_URL` plus local Vite origins.
- JWT tokens are passed in the `Authorization` header using `Bearer <token>`.
- Browser notifications require user permission and service worker support.
- Geolocation, media recording, and battery status depend on browser/device capability.
- If MongoDB Atlas is unreachable, `server/config/db.js` attempts to start `mongodb-memory-server`. Data in that mode is temporary.

## Suggested First Test Flow
1. Register a user.
2. Create a group.
3. Open a second session with another user and join the same group.
4. Visit the dashboard and allow location access.
5. Confirm live map updates, chat, notifications, and SOS behavior.
