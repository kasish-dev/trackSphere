# API and Socket Reference

## Base URL
- Local API: `http://localhost:5000`
- Protected routes require `Authorization: Bearer <token>`

## REST API

### Auth

#### `POST /api/auth/register`
Create a user.

Body:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "secret123"
}
```

#### `POST /api/auth/login`
Authenticate a user.

Body:
```json
{
  "email": "jane@example.com",
  "password": "secret123"
}
```

#### `GET /api/auth/me`
Get the current authenticated user.

#### `PATCH /api/auth/preferences`
Update user preferences such as:
- `notifications`
- `pushNotifications`
- `locationPrivacy`
- `theme`

#### `PATCH /api/auth/profile`
Update profile fields currently supported by the controller:
- `name`
- `emergencyContacts`

#### `GET /api/auth/users`
Admin-only user listing endpoint.

### Groups

#### `GET /api/groups`
List groups where the authenticated user is a member.

#### `POST /api/groups`
Create a group.

Body:
```json
{
  "name": "Operations Team"
}
```

#### `POST /api/groups/join`
Join a group using its invite code.

Body:
```json
{
  "inviteCode": "ABC123"
}
```

#### `DELETE /api/groups/:groupId`
Delete a group. Only the owner may do this.

### Geofences

#### `GET /api/groups/:groupId/geofences`
List geofences for a group.

#### `POST /api/groups/:groupId/geofences`
Create a geofence.

Body:
```json
{
  "name": "Warehouse",
  "center": { "lat": 12.9716, "lng": 77.5946 },
  "radius": 100,
  "category": "work"
}
```

### Location

#### `PUT /api/location`
Persist the latest user location and append to history.

Body:
```json
{
  "lat": 12.9716,
  "lng": 77.5946,
  "accuracy": 18,
  "batteryLevel": 0.82,
  "isCharging": false
}
```

#### `POST /api/location/bulk`
Bulk-sync previously queued location samples.

Body:
```json
{
  "locations": [
    {
      "lat": 12.9716,
      "lng": 77.5946,
      "accuracy": 20,
      "batteryLevel": 0.8,
      "isCharging": false,
      "timestamp": "2026-03-28T10:00:00.000Z"
    }
  ]
}
```

#### `GET /api/location/group/:groupId`
Fetch the latest known location for all members of a group.

#### `GET /api/location/history/:userId`
Fetch recent history with tier-based retention.

#### `GET /api/location/history/range/:userId`
Fetch history for a time window.

Query params:
- `startTime`
- `endTime`

### Notifications

#### `GET /api/notifications`
Fetch the latest notifications for the current user.

#### `PATCH /api/notifications/:id/read`
Mark one notification as read.

#### `PATCH /api/notifications/read-all`
Mark all notifications as read.

#### `POST /api/notifications/test-sos`
Trigger the test SOS flow to saved emergency contacts.

Optional body:
```json
{
  "lat": 0,
  "lng": 0
}
```

### Chat

#### `GET /api/chat/:groupId`
Fetch chat history for a group with tier-based retention limits.

### Analytics

#### `GET /api/analytics/daily?days=7`
Fetch per-day movement, battery summaries, and safety alert counts.

### Payments

#### `POST /api/subscriptions/create-checkout-session`
Create a Stripe checkout session or return a simulated success URL if Stripe is not configured.

Body:
```json
{
  "planId": "pro"
}
```

#### `POST /api/payment/create-order`
Create a Razorpay order or a mock order if Razorpay is not configured.

Body:
```json
{
  "plan": "pro"
}
```

#### `POST /api/payment/verify-payment`
Verify a Razorpay payment and update the user's subscription tier.

Body:
```json
{
  "razorpay_order_id": "order_...",
  "razorpay_payment_id": "pay_...",
  "razorpay_signature": "signature",
  "plan": "pro"
}
```

## Socket.IO Events

## Client -> Server

### `join-groups`
Join multiple group rooms.

Payload:
```json
["groupId1", "groupId2"]
```

### `join-group`
Join a single group room.

### `leave-group`
Leave a group room.

### `update-location`
Broadcast a live location update for a specific group.

Common payload:
```json
{
  "userId": "userId",
  "userName": "Jane",
  "lat": 12.9716,
  "lng": 77.5946,
  "accuracy": 12,
  "batteryLevel": 0.8,
  "isCharging": false,
  "groupId": "groupId",
  "timestamp": "2026-03-28T10:00:00.000Z"
}
```

### `member-joined`
Notify a group that a new member joined.

### `sos-alert`
Trigger group SOS broadcasts and emergency-contact handling.

### `sos-recording-ready`
Notify group members that a recording URL is available.

### `send-message`
Create and broadcast a group chat message.

Payload:
```json
{
  "groupId": "groupId",
  "senderId": "userId",
  "userName": "Jane",
  "text": "Please check in"
}
```

## Server -> Client

### `location-broadcast`
Live location update from another group member.

### `geofence-alert`
Emitted when a member enters or exits a geofence.

### `geofence-created`
Emitted when a new geofence is created.

### `new-member-alert`
Emitted when a member joins a group.

### `sos-received`
Emitted to group members when SOS is triggered.

### `sos-recording-available`
Emitted when a shared SOS recording link is available.

### `receive-message`
Emitted when a new chat message is stored.

### `safety-anomaly`
Emitted for anomaly detection events such as stationary alerts, sudden stops, or route deviation.

## Health and Root Routes
- `GET /health`
- `GET /`

## Rate Limiting
- Auth endpoints: 20 requests per 15 minutes
- General API: 1000 requests per 15 minutes
