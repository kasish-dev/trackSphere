require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Group = require('../models/Group');
const Geofence = require('../models/Geofence');
const Location = require('../models/Location');
const LocationHistory = require('../models/LocationHistory');
const Notification = require('../models/Notification');
const SafetyAlert = require('../models/SafetyAlert');
const Message = require('../models/Message');
const PaymentRecord = require('../models/PaymentRecord');
const WorkSession = require('../models/WorkSession');

const DEMO_PASSWORD = 'Demo@12345';

const DEMO_USERS = [
  {
    name: 'Demo Admin',
    email: 'demo-admin@tracksphere.com',
    role: 'admin',
    accountType: 'business_owner',
    subscriptionTier: 'ENTERPRISE',
    trialStatus: 'converted',
    emergencyContacts: [
      { name: 'Operations Backup', phone: '+919999900001', preferredChannel: 'whatsapp' },
    ],
  },
  {
    name: 'Priya Operations',
    email: 'demo-ops@tracksphere.com',
    role: 'user',
    accountType: 'business_owner',
    subscriptionTier: 'BUSINESS',
    trialStatus: 'converted',
    emergencyContacts: [
      { name: 'Fleet Lead', phone: '+919999900002', preferredChannel: 'sms' },
    ],
  },
  {
    name: 'Rohan Driver',
    email: 'demo-driver@tracksphere.com',
    role: 'user',
    accountType: 'employee',
    subscriptionTier: 'PRO',
    trialStatus: 'converted',
    emergencyContacts: [
      { name: 'Family Contact', phone: '+919999900003', preferredChannel: 'whatsapp' },
    ],
  },
];

const getDateKey = (date) => date.toISOString().slice(0, 10);

const pointMinutesAgo = (minutesAgo, lat, lng, accuracy = 15) => ({
  lat,
  lng,
  accuracy,
  batteryLevel: 0.75,
  isCharging: false,
  timestamp: new Date(Date.now() - minutesAgo * 60 * 1000),
});

const createTrack = (baseLat, baseLng) => ([
  pointMinutesAgo(360, baseLat, baseLng),
  pointMinutesAgo(300, baseLat + 0.01, baseLng + 0.008),
  pointMinutesAgo(240, baseLat + 0.018, baseLng + 0.012),
  pointMinutesAgo(180, baseLat + 0.022, baseLng + 0.016),
  pointMinutesAgo(120, baseLat + 0.026, baseLng + 0.02),
  pointMinutesAgo(60, baseLat + 0.03, baseLng + 0.022),
  pointMinutesAgo(10, baseLat + 0.035, baseLng + 0.028),
]);

const resetDemoData = async (emails) => {
  const users = await User.find({ email: { $in: emails } });
  const userIds = users.map((user) => user._id);

  await Promise.all([
    PaymentRecord.deleteMany({ user: { $in: userIds } }),
    WorkSession.deleteMany({ user: { $in: userIds } }),
    Notification.deleteMany({ userId: { $in: userIds } }),
    SafetyAlert.deleteMany({ user: { $in: userIds } }),
    Message.deleteMany({ senderId: { $in: userIds } }),
    Location.deleteMany({ user: { $in: userIds } }),
    LocationHistory.deleteMany({ user: { $in: userIds } }),
  ]);

  const groups = await Group.find({
    $or: [
      { owner: { $in: userIds } },
      { members: { $in: userIds } },
    ],
  });
  const groupIds = groups.map((group) => group._id);

  await Geofence.deleteMany({ groupId: { $in: groupIds } });
  await Message.deleteMany({ groupId: { $in: groupIds } });
  await Group.deleteMany({ _id: { $in: groupIds } });
  await User.deleteMany({ _id: { $in: userIds } });
};

const seed = async () => {
  await connectDB();

  const demoEmails = DEMO_USERS.map((user) => user.email);
  await resetDemoData(demoEmails);

  const createdUsers = [];

  for (const userData of DEMO_USERS) {
    const user = await User.create({
      ...userData,
      password: DEMO_PASSWORD,
      preferences: {
        notifications: true,
        pushNotifications: true,
        locationPrivacy: false,
        theme: 'system',
      },
      subscriptionUpdatedAt: new Date(),
      lastActiveAt: new Date(),
    });
    createdUsers.push(user);
  }

  const [adminUser, opsUser, driverUser] = createdUsers;

  const operationsGroup = await Group.create({
    name: 'Demo Fleet Operations',
    owner: opsUser._id,
    members: [opsUser._id, driverUser._id, adminUser._id],
  });

  await Geofence.create([
    {
      name: 'Central Warehouse',
      groupId: operationsGroup._id,
      createdBy: opsUser._id,
      center: { lat: 12.9716, lng: 77.5946 },
      radius: 180,
      category: 'work',
    },
    {
      name: 'High Risk Zone',
      groupId: operationsGroup._id,
      createdBy: adminUser._id,
      center: { lat: 13.03, lng: 77.62 },
      radius: 220,
      category: 'danger',
    },
  ]);

  const userTracks = new Map([
    [opsUser._id.toString(), createTrack(12.9716, 77.5946)],
    [driverUser._id.toString(), createTrack(12.9352, 77.6146)],
    [adminUser._id.toString(), createTrack(12.98, 77.61)],
  ]);

  for (const user of createdUsers) {
    const track = userTracks.get(user._id.toString());
    const latest = track[track.length - 1];

    await Location.create({
      user: user._id,
      lat: latest.lat,
      lng: latest.lng,
      accuracy: latest.accuracy,
      batteryLevel: latest.batteryLevel,
      isCharging: latest.isCharging,
      timestamp: latest.timestamp,
    });

    await LocationHistory.insertMany(
      track.map((point) => ({
        user: user._id,
        lat: point.lat,
        lng: point.lng,
        accuracy: point.accuracy,
        batteryLevel: point.batteryLevel,
        isCharging: point.isCharging,
        timestamp: point.timestamp,
      }))
    );

    await WorkSession.create({
      user: user._id,
      dateKey: getDateKey(new Date()),
      checkInAt: track[0].timestamp,
      lastSeenAt: latest.timestamp,
      status: 'OPEN',
      autoCheckedOut: false,
      totalDistanceKm: 7.8,
      totalPings: track.length,
      firstLocation: { lat: track[0].lat, lng: track[0].lng },
      lastLocation: { lat: latest.lat, lng: latest.lng },
    });
  }

  await Notification.insertMany([
    {
      userId: adminUser._id,
      type: 'sos',
      message: 'EMERGENCY: Rohan Driver triggered an SOS!',
      data: { groupId: operationsGroup._id, userName: 'Rohan Driver', lat: 12.97, lng: 77.61 },
    },
    {
      userId: opsUser._id,
      type: 'geofence',
      message: 'Rohan Driver entered Central Warehouse',
      data: { groupId: operationsGroup._id, userName: 'Rohan Driver', fenceName: 'Central Warehouse', lat: 12.9716, lng: 77.5946 },
    },
  ]);

  await SafetyAlert.insertMany([
    {
      user: driverUser._id,
      group: operationsGroup._id,
      type: 'STATIONARY_ANOMALY',
      location: { lat: 12.99, lng: 77.61 },
      status: 'ACKNOWLEDGED',
      metadata: { duration: 18, details: 'Stopped outside expected route during demo shift.' },
    },
  ]);

  await Message.insertMany([
    {
      groupId: operationsGroup._id,
      senderId: opsUser._id,
      userName: opsUser.name,
      text: 'Morning team, begin demo route and keep SOS ready.',
      createdAt: new Date(Date.now() - 55 * 60 * 1000),
    },
    {
      groupId: operationsGroup._id,
      senderId: driverUser._id,
      userName: driverUser.name,
      text: 'On the way to the warehouse now.',
      createdAt: new Date(Date.now() - 52 * 60 * 1000),
    },
  ]);

  await PaymentRecord.insertMany([
    {
      user: opsUser._id,
      provider: 'razorpay',
      orderId: 'order_demo_ops',
      paymentId: 'pay_demo_ops',
      invoiceNumber: 'TS-DEMO-OPS-001',
      planId: 'business',
      tier: 'BUSINESS',
      planName: 'TrackSphere Business',
      amount: 999,
      currency: 'INR',
      status: 'paid',
      mode: 'mock',
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      user: driverUser._id,
      provider: 'razorpay',
      orderId: 'order_demo_driver',
      paymentId: 'pay_demo_driver',
      invoiceNumber: 'TS-DEMO-DRV-001',
      planId: 'pro',
      tier: 'PRO',
      planName: 'TrackSphere PRO',
      amount: 499,
      currency: 'INR',
      status: 'paid',
      mode: 'mock',
      paidAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  ]);

  console.log('\nDemo data seeded successfully.\n');
  console.log('Demo accounts:');
  DEMO_USERS.forEach((user) => {
    console.log(`- ${user.email} / ${DEMO_PASSWORD} (${user.subscriptionTier})`);
  });

  await mongoose.connection.close();
};

seed().catch(async (error) => {
  console.error('Demo seed failed:', error);
  try {
    await mongoose.connection.close();
  } catch {}
  process.exit(1);
});
