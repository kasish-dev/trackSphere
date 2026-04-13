# TrackSphere Documentation

## Final Summary
Start with these 5 highest-impact business features:

- Admin Dashboard
- Free Trial System
- Reports (PDF)
- WhatsApp SOS
- Clear Pricing Page

## Product Overview
TrackSphere is a full-stack real-time tracking platform for teams, families, field staff, and fleet-style group coordination. It combines live location sharing, group management, geofencing, chat, SOS alerts, notification workflows, and subscription-based feature gating in one web application.

The repository is split into:

- `client/`: React + Vite frontend
- `server/`: Express + Socket.IO + MongoDB backend

## Core Capabilities

### Live Tracking
- Real-time location broadcasting with Socket.IO.
- Latest location persistence through REST endpoints.
- Offline queueing on the client with later bulk sync.
- Battery and charging metadata included with location updates when supported by the browser.

### Groups and Membership
- Users can create groups and join via invite codes.
- Group owners can delete their own groups.
- Free-tier users are restricted to a single group.
- Group size is limited by the group owner's subscription tier.

### Geofencing
- Group members can create geofences with a center, radius, and category.
- Enter/exit changes trigger live socket alerts.
- Geofence alerts are also stored as persistent notifications for group members.

### Safety and SOS
- One-tap SOS alert broadcasts location to all joined groups.
- Emergency contacts can be stored per user.
- Test SOS flow is available from settings.
- When Twilio is not configured, the app generates shareable fallback links for WhatsApp, Telegram, email, and a public SOS page.

### Chat and Communication
- Group chat is delivered over Socket.IO and stored in MongoDB.
- Chat history retention is tier-based:
- `FREE`: last 24 hours
- `PRO`, `BUSINESS`, `ENTERPRISE`: last 30 days

### History and Analytics
- Location history is written to a dedicated history collection.
- History access is tier-limited:
- `FREE`: last 1 day
- Paid tiers: last 30 days
- Analytics summarizes recent movement, battery trends, and safety alert counts.

### Notifications
- In-app notifications are stored in MongoDB.
- Browser notifications are supported through the service worker when permission is granted.
- Notification types currently include SOS, geofence, group-join, and informational events.

### Subscription and Payments
- Stripe checkout route exists for subscription session creation and supports a simulation mode when Stripe keys are absent.
- Razorpay order creation and payment verification are also implemented.
- User subscription tier is persisted on the `User` model.

## Business Model
- Subscription-based SaaS platform
- Pricing per user / per group / per vehicle
- Free trial: 7 days
- Monthly & yearly plans
- One-time setup fee for businesses
- White-label solution for companies

## Target Customers
- Delivery companies (Zomato-type small vendors)
- Sales teams (field employees)
- Security agencies
- Transport & fleet businesses
- Families (safety tracking)

## Monetization Features
The items below should be treated as the business-critical product roadmap. Some are partially present in the current codebase, while others still need to be implemented.

### Required Features for Earning

#### 1. Admin Dashboard
- Total users
- Active users
- Total groups
- Revenue tracking
- Alerts overview

Status:
- Partially present in the current project.
- Admin user listing exists.
- Revenue tracking and full business analytics still need implementation.

#### 2. Employee Tracking Module
- Auto check-in/check-out using location
- Work hours calculation
- Daily movement tracking

Status:
- Daily movement tracking is partially supported through location history and analytics.
- Auto attendance and work-hours calculation still need implementation.

#### 3. Reports System (PDF)
- Daily report
- Weekly summary
- Employee performance

Status:
- Analytics data exists.
- PDF report generation is not yet implemented.

#### 4. WhatsApp SOS Integration
- Send SOS with live location link
- Auto message to emergency contacts

Status:
- Live SOS, emergency contacts, and WhatsApp fallback links already exist.
- Direct automated WhatsApp provider integration still needs implementation.

#### 5. Free Trial System
- 7-day automatic trial
- After expiry -> restrict features

Status:
- Subscription tiers exist.
- Trial lifecycle and auto-expiry enforcement still need implementation.

#### 6. Payment Improvements
- Razorpay subscription (auto-renew)
- Payment success/failure handling
- Invoice generation

Status:
- Razorpay order creation and verification exist.
- Auto-renewing subscriptions, invoice generation, and fuller billing lifecycle handling still need implementation.

## Pricing Structure

### Pricing Plans

#### FREE
- 1 group
- Limited tracking
- 1-day history

#### PRO (INR 499/month)
- Up to 5 members
- 30-day history
- Geofencing + SOS

#### BUSINESS (INR 999/month)
- Up to 15 members
- Admin dashboard
- Reports & analytics

#### ENTERPRISE (Custom Pricing)
- Unlimited users
- White-label
- Dedicated support

## White Label Solution
- Custom logo
- Custom app name
- Custom domain (for example `companyname.tracksphere.com`)
- Separate database (optional)

Charge:

- INR 10,000 - INR 50,000 setup

## Go-To-Market Strategy
- Direct outreach to local businesses
- WhatsApp marketing campaigns
- LinkedIn networking
- Referral program (earn per user)

## Use Cases

### 1. Delivery Company
- Track delivery boys in real-time

### 2. Sales Team
- Monitor field visits & routes

### 3. Family Safety
- Track kids & emergency alerts

### 4. Fleet Tracking
- Monitor vehicles & routes

## Why TrackSphere?
- Real-time + offline sync
- Built-in SOS system
- Group-based tracking (unique)
- Affordable pricing for Indian market
- Works as PWA (no install needed)

## Future Enhancements
- AI anomaly detection (suspicious movement)
- Voice-triggered SOS
- Mobile app (Android/iOS)
- API for third-party integration
- Advanced analytics dashboard

## Roles and Access
- `user`: standard application access
- `admin`: can access admin-only user listing endpoints and frontend admin page

JWT bearer authentication protects private routes. Role-based authorization is enforced for admin-only endpoints.

## Tech Stack

### Frontend
- React 19
- Vite
- Redux Toolkit
- React Router
- Tailwind CSS
- Framer Motion
- Leaflet / React Leaflet
- Socket.IO client
- Recharts

### Backend
- Node.js
- Express 5
- Socket.IO
- MongoDB with Mongoose
- JWT authentication
- bcrypt password hashing
- Helmet
- express-rate-limit
- Stripe
- Razorpay

## Current Plans

| Plan | Tier | Price | Main Limits |
| --- | --- | --- | --- |
| Starter | `FREE` | INR 0 | 1 group, small group capacity, short history |
| TrackSphere PRO | `PRO` | INR 499/month | up to 5 members, 30-day history |
| TrackSphere Business | `BUSINESS` | INR 999/month | up to 15 members, 30-day history |

The codebase also recognizes `ENTERPRISE` for higher limits, although no dedicated purchase flow is defined in the current plan config file.

## Repository Goals
- Deliver live location visibility for small teams and groups.
- Improve safety response time through SOS and anomaly detection.
- Provide a monetizable SaaS foundation with plan upgrades and admin visibility.

## Get Started
- Contact for demo
- Free 7-day trial available
- Email / WhatsApp integration

## Where to Read Next
- Root project guide: `README.md`
- Setup guide: `docs/SETUP.md`
- Architecture guide: `docs/ARCHITECTURE.md`
- API and socket reference: `docs/API.md`
- Module map: `docs/MODULES.md`
