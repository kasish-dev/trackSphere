const { validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const SafetyAlert = require('../models/SafetyAlert');
const PaymentRecord = require('../models/PaymentRecord');
const WorkSession = require('../models/WorkSession');
const { applyTrialState, serializeUser, startFreeTrial } = require('../utils/subscription');
const Workspace = require('../models/Workspace');
const { ensureWorkspaceForAdminUser, findWorkspaceByInviteCode } = require('../utils/workspace');
const Location = require('../models/Location');
const attendanceService = require('../services/attendanceService');

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

const generateWorkspaceInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();

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

    const { name, email, password, accountType, companyName, workspaceInviteCode } = req.body;
    const safeAccountType = ['individual', 'business_owner', 'employee'].includes(accountType)
      ? accountType
      : null;

    if (!safeAccountType) {
      return res.status(400).json({ success: false, error: 'Please choose an account type' });
    }

    let workspace = null;
    if (safeAccountType === 'employee') {
      workspace = await findWorkspaceByInviteCode(workspaceInviteCode);
      if (!workspace) {
        return res.status(400).json({ success: false, error: 'Please enter a valid company invite code' });
      }
    }

    const starterTier = safeAccountType === 'business_owner' ? 'BUSINESS' : 'PRO';
    const role = safeAccountType === 'business_owner' ? 'admin' : 'user';

    // Create user
    const user = startFreeTrial(new User({
      name,
      email,
      password,
      role,
      workspace: workspace?._id || null,
      accountType: safeAccountType,
    }), starterTier);

    await user.save();

    if (role === 'admin') {
      await ensureWorkspaceForAdminUser(user, companyName);
      await user.populate('workspace', 'name slug owner');
    }

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
    const user = await User.findOne({ email }).select('+password').populate('workspace', 'name slug owner');

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
    if (user.role === 'admin' && !user.workspace) {
      await ensureWorkspaceForAdminUser(user);
      await user.populate('workspace', 'name slug owner');
    }
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
    const user = await User.findById(req.user.id).populate('workspace', 'name slug owner');

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
    const users = await User.find({}).populate('workspace', 'name slug').sort('-createdAt');

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
    if (!['BUSINESS', 'ENTERPRISE'].includes(user.subscriptionTier)) {
      user.subscriptionTier = 'BUSINESS';
    }

    await user.save();
    await ensureWorkspaceForAdminUser(user);
    await user.populate('workspace', 'name slug owner');

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

// @desc    Get workspace admin dashboard stats
// @route   GET /api/auth/workspace-dashboard
// @access  Private/Admin
exports.getWorkspaceDashboard = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;

    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace not found for this admin account' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const users = await User.find({ workspace: workspaceId }).sort('-createdAt');
    const userIds = users.map((user) => user._id);
    const groups = await Group.find({ workspace: workspaceId }).sort('-createdAt');
    const groupIds = groups.map((group) => group._id);
    const [payments, workSessions, unreadAlerts, safetyAlerts] = await Promise.all([
      PaymentRecord.find({ user: { $in: userIds } }).sort({ paidAt: -1 }),
      WorkSession.find({ user: { $in: userIds } }).populate('user', 'name email').sort({ checkInAt: -1 }),
      Notification.countDocuments({ userId: { $in: userIds }, isRead: false }),
      SafetyAlert.countDocuments({ group: { $in: groupIds } }),
    ]);

    const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeUsers = users.filter((user) => user.lastActiveAt && user.lastActiveAt >= activeSince).length;
    const adminCount = users.filter((user) => user.role === 'admin').length;
    const employeeCount = users.filter((user) => user.role === 'user').length;
    const businessUsers = users.filter((user) => user.subscriptionTier === 'BUSINESS').length;
    const enterpriseUsers = users.filter((user) => user.subscriptionTier === 'ENTERPRISE').length;
    const proUsers = users.filter((user) => user.subscriptionTier === 'PRO').length;
    const trialUsers = users.filter((user) => user.trialStatus === 'active').length;

    const paidPayments = payments.filter((payment) => payment.status === 'paid');
    const failedPayments = payments.filter((payment) => payment.status === 'failed');
    const totalRevenueCollected = paidPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);

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

    res.status(200).json({
      success: true,
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
          slug: workspace.slug,
          inviteCode: workspace.inviteCode,
          billing: workspace.billing,
          attendanceSettings: workspace.attendanceSettings,
          reportSettings: workspace.reportSettings,
          companyProfile: workspace.companyProfile,
        },
        stats: {
          totalUsers: users.length,
          activeUsers,
          totalGroups: groups.length,
          admins: adminCount,
          employees: employeeCount,
          proUsers,
          businessUsers,
          enterpriseUsers,
          trialUsers,
          unreadAlerts,
          safetyAlerts,
          totalRevenueCollected,
          successfulPayments: paidPayments.length,
          failedPayments: failedPayments.length,
          estimatedSeatRevenue: employeeCount * (workspace.billing?.seatPriceMonthly || 50),
        },
        attendance: {
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
            workHours: Number((Math.max(
              0,
              ((new Date(session.checkOutAt || session.lastSeenAt || session.checkInAt).getTime() - new Date(session.checkInAt).getTime()) / (1000 * 60 * 60))
            )).toFixed(2)),
            totalDistanceKm: Number((session.totalDistanceKm || 0).toFixed(2)),
            totalPings: session.totalPings || 0,
          })),
        },
        users: users.map(serializeUser),
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get live monitoring overview for workspace admin
// @route   GET /api/auth/workspace-live-overview
// @access  Private/Admin
exports.getWorkspaceLiveOverview = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    if (!workspaceId) {
      return res.status(400).json({ success: false, error: 'Workspace not found for this admin account' });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const workspaceUsers = await User.find({ workspace: workspaceId }).select('_id name email role lastActiveAt trialStatus subscriptionTier');
    const userIds = workspaceUsers.map((entry) => entry._id);
    const activeSince = new Date(Date.now() - 10 * 60 * 1000);

    const liveLocations = await Location.find({
      user: { $in: userIds },
      timestamp: { $gte: activeSince },
    }).sort({ timestamp: -1 }).populate('user', 'name email');

    const todayAttendance = await attendanceService.getWorkspaceAttendanceSummary(workspaceId, new Date());
    const recentSosAlerts = await Notification.find({
      userId: { $in: userIds },
      type: 'sos',
    }).sort({ createdAt: -1 }).limit(6);

    res.status(200).json({
      success: true,
      data: {
        workspace: {
          id: workspace._id,
          name: workspace.name,
        },
        summary: {
          totalEmployees: workspaceUsers.length,
          activeUsers: liveLocations.length,
          inactiveUsers: Math.max(0, workspaceUsers.length - liveLocations.length),
          sosAlerts: recentSosAlerts.length,
          trialUsers: workspaceUsers.filter((entry) => entry.trialStatus === 'active').length,
        },
        attendance: todayAttendance,
        liveUsers: liveLocations.map((location) => ({
          id: location.user?._id || location.user,
          name: location.user?.name || 'Unknown user',
          email: location.user?.email || '',
          lat: location.lat,
          lng: location.lng,
          batteryLevel: location.batteryLevel,
          isCharging: location.isCharging,
          lastSeenAt: location.timestamp,
        })),
        sosAlerts: recentSosAlerts,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Regenerate workspace invite code
// @route   POST /api/auth/workspace/invite-code/regenerate
// @access  Private/Admin
exports.regenerateWorkspaceInviteCode = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    let inviteCode = generateWorkspaceInviteCode();
    while (await Workspace.exists({ inviteCode, _id: { $ne: workspace._id } })) {
      inviteCode = generateWorkspaceInviteCode();
    }

    workspace.inviteCode = inviteCode;
    await workspace.save();

    res.status(200).json({
      success: true,
      data: {
        id: workspace._id,
        inviteCode: workspace.inviteCode,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create employee inside workspace
// @route   POST /api/auth/workspace/employees
// @access  Private/Admin
exports.createWorkspaceEmployee = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const employee = startFreeTrial(new User({
      name,
      email,
      password,
      role: 'user',
      accountType: 'employee',
      workspace: workspace._id,
      needsPasswordReset: true,
    }), 'PRO');

    await employee.save();

    res.status(201).json({
      success: true,
      data: serializeUser(employee),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Send invite email to employee
// @route   POST /api/auth/workspace/invite-email
// @access  Private/Admin
exports.inviteWorkspaceEmployeeByEmail = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const sendEmail = require('../utils/sendEmail');
    // the user wants the frontend url for signup, we should look what `req.get('host')` is on backend, usually backend is 5000, frontend is 5173 or the real domain.
    // we should use a generic url or ask the user to use the env FRONTEND_URL, fallback to referer or something.
    const origin = req.headers.origin || `http://${req.get('host')}`;
    const signupUrl = `${origin}/register`;

    const message = `You have been invited to join ${workspace.name} on Ksynq as an employee.\n\nUse this company invite code during signup: ${workspace.inviteCode}\n\nSignup page: ${signupUrl}`;

    await sendEmail({
      email,
      subject: `Join ${workspace.name} on Ksynq`,
      message,
    });

    res.status(200).json({ success: true, message: 'Email sent' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ success: false, error: 'Email could not be sent' });
  }
};

// @desc    Update employee
// @route   PATCH /api/auth/workspace/employees/:id
// @access  Private/Admin
exports.updateWorkspaceEmployee = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate || String(userToUpdate.workspace) !== String(workspaceId)) {
      return res.status(404).json({ success: false, error: 'User not found in your workspace' });
    }

    if (req.body.name) userToUpdate.name = req.body.name;
    if (req.body.role && ['user', 'admin'].includes(req.body.role)) {
      if (String(userToUpdate._id) === String(req.user.id) && req.body.role !== 'admin') {
         return res.status(400).json({ success: false, error: 'Cannot demote yourself' });
      }
      userToUpdate.role = req.body.role;
    }

    await userToUpdate.save();

    res.status(200).json({ success: true, data: serializeUser(userToUpdate) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Delete employee
// @route   DELETE /api/auth/workspace/employees/:id
// @access  Private/Admin
exports.deleteWorkspaceEmployee = async (req, res) => {
  try {
    const workspaceId = req.user.workspace?._id || req.user.workspace;
    const userToDelete = await User.findById(req.params.id);

    if (!userToDelete || String(userToDelete.workspace) !== String(workspaceId)) {
      return res.status(404).json({ success: false, error: 'User not found in your workspace' });
    }

    if (String(userToDelete._id) === String(req.user.id)) {
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    }

    await userToDelete.deleteOne();

    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Force Reset Password for First Login
// @route   POST /api/auth/force-reset-password
// @access  Private
exports.forceResetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.needsPasswordReset) {
      return res.status(400).json({ success: false, error: 'Password reset not required' });
    }

    user.password = newPassword;
    user.needsPasswordReset = false;
    await user.save();

    res.status(200).json({ success: true, data: serializeUser(user) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
