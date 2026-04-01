const { validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const SafetyAlert = require('../models/SafetyAlert');
const PaymentRecord = require('../models/PaymentRecord');
const WorkSession = require('../models/WorkSession');
const { applyTrialState, serializeUser, startFreeTrial } = require('../utils/subscription');

const sanitizeEmergencyContacts = (contacts = []) => {
  return contacts
    .map((contact) => ({
      name: contact?.name?.trim?.() || '',
      email: contact?.email?.trim?.() || '',
      phone: contact?.phone?.trim?.() || '',
      preferredChannel: contact?.preferredChannel || 'sms',
    }))
    .filter((contact) => contact.name && (contact.phone || contact.email));
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database connection is not established. Please check your MONGO_URI in .env' 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, accountType } = req.body;
    const safeAccountType = ['individual', 'business_owner', 'employee'].includes(accountType)
      ? accountType
      : null;

    if (!safeAccountType) {
      return res.status(400).json({ success: false, error: 'Please choose an account type' });
    }

    const starterTier = safeAccountType === 'business_owner' ? 'BUSINESS' : 'PRO';

    // Create user
    const user = startFreeTrial(new User({
      name,
      email,
      password,
      accountType: safeAccountType,
    }), starterTier);

    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        success: false, 
        error: 'Database connection is not established. Please check your MONGO_URI in .env' 
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide an email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const { changed } = applyTrialState(user);
    user.lastActiveAt = new Date();
    if (changed || user.isModified()) {
      await user.save();
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  res.status(statusCode).json({
    success: true,
    token,
    user: serializeUser(user),
  });
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
// @desc    Update user preferences
// @route   PATCH /api/auth/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.preferences = {
      ...user.preferences,
      ...req.body
    };

    await user.save();

    res.status(200).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Update user profile (e.g. emergency contacts)
// @route   PATCH /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // List of allowed fields to update here
    const { name, emergencyContacts } = req.body;
    
    if (name) user.name = name;
    if (Array.isArray(emergencyContacts)) {
      user.emergencyContacts = sanitizeEmergencyContacts(emergencyContacts);
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: serializeUser(user),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/auth/users
// @access  Private/Admin
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort('-createdAt');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users.map(serializeUser),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Promote a user to admin
// @route   PATCH /api/auth/users/:id/promote-admin
// @access  Private/Admin
exports.promoteUserToAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'Use a different admin account to change this user' });
    }

    user.role = 'admin';
    if (!user.accountType || user.accountType === 'individual') {
      user.accountType = 'business_owner';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.name} is now an admin`,
      data: serializeUser(user),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get admin dashboard stats
// @route   GET /api/auth/dashboard
// @access  Private/Admin
exports.getAdminDashboard = async (req, res) => {
  try {
    const [users, totalGroups, unreadAlerts, safetyAlerts, payments, workSessions] = await Promise.all([
      User.find({}).sort('-createdAt'),
      Group.countDocuments(),
      Notification.countDocuments({ isRead: false }),
      SafetyAlert.countDocuments(),
      PaymentRecord.find({}).sort({ paidAt: -1 }),
      WorkSession.find({}).populate('user', 'name email').sort({ checkInAt: -1 }),
    ]);

    const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = users.filter((user) => user.lastActiveAt && user.lastActiveAt >= activeSince).length;
    const proUsers = users.filter((user) => user.subscriptionTier === 'PRO' && user.trialStatus !== 'active').length;
    const businessUsers = users.filter((user) => user.subscriptionTier === 'BUSINESS').length;
    const enterpriseUsers = users.filter((user) => user.subscriptionTier === 'ENTERPRISE').length;
    const trialUsers = users.filter((user) => user.trialStatus === 'active').length;

    const estimatedMonthlyRevenue = (proUsers * 499) + (businessUsers * 999);
    const paidPayments = payments.filter((payment) => payment.status === 'paid');
    const failedPayments = payments.filter((payment) => payment.status === 'failed');
    const totalRevenueCollected = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const monthlyRevenueCollected = paidPayments
      .filter((payment) => {
        const paidAt = new Date(payment.paidAt);
        const now = new Date();
        return paidAt.getMonth() === now.getMonth() && paidAt.getFullYear() === now.getFullYear();
      })
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todaysSessions = workSessions.filter((session) => session.dateKey === todayKey);
    const openSessions = todaysSessions.filter((session) => session.status === 'OPEN');
    const closedSessions = todaysSessions.filter((session) => session.status === 'CLOSED');

    const attendanceTotals = todaysSessions.reduce((acc, session) => {
      const endTime = session.checkOutAt || session.lastSeenAt || session.checkInAt;
      const durationMinutes = Math.max(
        0,
        Math.round((new Date(endTime).getTime() - new Date(session.checkInAt).getTime()) / 60000)
      );

      acc.workMinutes += durationMinutes;
      acc.distanceKm += session.totalDistanceKm || 0;
      acc.pings += session.totalPings || 0;
      return acc;
    }, { workMinutes: 0, distanceKm: 0, pings: 0 });

    const attendance = {
      todayDateKey: todayKey,
      totalSessions: todaysSessions.length,
      openSessions: openSessions.length,
      closedSessions: closedSessions.length,
      totalWorkHours: Number((attendanceTotals.workMinutes / 60).toFixed(2)),
      avgWorkHours: todaysSessions.length ? Number(((attendanceTotals.workMinutes / todaysSessions.length) / 60).toFixed(2)) : 0,
      totalDistanceKm: Number(attendanceTotals.distanceKm.toFixed(2)),
      totalPings: attendanceTotals.pings,
      sessions: todaysSessions.slice(0, 10).map((session) => ({
        id: session._id,
        userName: session.user?.name || 'Unknown user',
        email: session.user?.email || '',
        dateKey: session.dateKey,
        status: session.status,
        checkInAt: session.checkInAt,
        checkOutAt: session.checkOutAt,
        lastSeenAt: session.lastSeenAt,
        totalDistanceKm: Number((session.totalDistanceKm || 0).toFixed(2)),
        totalPings: session.totalPings || 0,
        autoCheckedOut: session.autoCheckedOut,
        workHours: Number((Math.max(
          0,
          ((new Date(session.checkOutAt || session.lastSeenAt || session.checkInAt).getTime()) - new Date(session.checkInAt).getTime()) / 3600000
        )).toFixed(2)),
      })),
    };

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers: users.length,
          activeUsers,
          totalGroups,
          proUsers,
          businessUsers,
          enterpriseUsers,
          trialUsers,
          estimatedMonthlyRevenue,
          totalRevenueCollected,
          monthlyRevenueCollected,
          successfulPayments: paidPayments.length,
          failedPayments: failedPayments.length,
          unreadAlerts,
          safetyAlerts,
        },
        attendance,
        users: users.map(serializeUser),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
