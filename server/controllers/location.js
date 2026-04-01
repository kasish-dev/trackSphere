const Location = require('../models/Location');
const LocationHistory = require('../models/LocationHistory');
const Group = require('../models/Group');
const User = require('../models/User');
const WorkSession = require('../models/WorkSession');

const AUTO_CHECKOUT_MINUTES = 30;

const getDateKey = (value = new Date()) => {
  const date = new Date(value);
  return date.toISOString().slice(0, 10);
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const finalizeStaleSession = async (userId, now = new Date()) => {
  const session = await WorkSession.findOne({ user: userId, status: 'OPEN' }).sort({ checkInAt: -1 });
  if (!session || !session.lastSeenAt) {
    return null;
  }

  const inactiveMs = now.getTime() - new Date(session.lastSeenAt).getTime();
  if (inactiveMs < AUTO_CHECKOUT_MINUTES * 60 * 1000) {
    return session;
  }

  session.checkOutAt = session.lastSeenAt;
  session.status = 'CLOSED';
  session.autoCheckedOut = true;
  await session.save();
  return session;
};

const touchWorkSession = async ({ userId, lat, lng, timestamp }) => {
  const now = timestamp ? new Date(timestamp) : new Date();
  await finalizeStaleSession(userId, now);

  const dateKey = getDateKey(now);
  let session = await WorkSession.findOne({ user: userId, dateKey, status: 'OPEN' });

  if (!session) {
    session = await WorkSession.create({
      user: userId,
      dateKey,
      checkInAt: now,
      lastSeenAt: now,
      totalPings: 1,
      firstLocation: { lat, lng },
      lastLocation: { lat, lng },
    });

    return session;
  }

  if (session.lastLocation?.lat != null && session.lastLocation?.lng != null) {
    session.totalDistanceKm += getDistanceKm(
      session.lastLocation.lat,
      session.lastLocation.lng,
      lat,
      lng
    );
  }

  session.totalPings += 1;
  session.lastSeenAt = now;
  session.lastLocation = { lat, lng };
  await session.save();
  return session;
};

const serializeWorkSession = (session) => {
  if (!session) return null;

  const checkInAt = session.checkInAt ? new Date(session.checkInAt) : null;
  const endTime = session.checkOutAt ? new Date(session.checkOutAt) : (session.lastSeenAt ? new Date(session.lastSeenAt) : null);
  const durationMs = checkInAt && endTime ? Math.max(0, endTime.getTime() - checkInAt.getTime()) : 0;

  return {
    id: session._id,
    dateKey: session.dateKey,
    checkInAt: session.checkInAt,
    checkOutAt: session.checkOutAt,
    lastSeenAt: session.lastSeenAt,
    status: session.status,
    autoCheckedOut: session.autoCheckedOut,
    totalDistanceKm: Number((session.totalDistanceKm || 0).toFixed(2)),
    totalPings: session.totalPings || 0,
    workMinutes: Math.round(durationMs / 60000),
  };
};

// @desc    Update user's location
// @route   PUT /api/location
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, isCharging } = req.body;
    const timestamp = Date.now();

    const location = await Location.findOneAndUpdate(
      { user: req.user.id },
      { lat, lng, accuracy, batteryLevel, isCharging, timestamp },
      { upsert: true, new: true }
    );

    // Also save to history collection for route tracking
    await LocationHistory.create({
      user: req.user.id,
      lat,
      lng,
      accuracy,
      batteryLevel,
      isCharging,
      timestamp
    });

    const workSession = await touchWorkSession({
      userId: req.user.id,
      lat,
      lng,
      timestamp,
    });

    res.status(200).json({ success: true, data: location, workSession: serializeWorkSession(workSession) });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all group members' latest locations
// @route   GET /api/location/group/:groupId
// @access  Private
exports.getGroupLocations = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    if (!group.members.includes(req.user.id)) {
      return res.status(403).json({ success: false, error: 'Not a member of this group' });
    }

    const locations = await Location.find({
      user: { $in: group.members },
    }).populate('user', 'name email');

    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get location history for a user
// @route   GET /api/location/history/:userId
// @access  Private
exports.getLocationHistory = async (req, res) => {
  try {
    const userObj = await User.findById(req.user.id);
    const limitDays = userObj.subscriptionTier === 'PRO' || userObj.subscriptionTier === 'BUSINESS' || userObj.subscriptionTier === 'ENTERPRISE' ? 30 : 1;
    const minAllowedDate = new Date();
    minAllowedDate.setDate(minAllowedDate.getDate() - limitDays);

    const locations = await LocationHistory.find({ 
      user: req.params.userId,
      timestamp: { $gte: minAllowedDate }
    })
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({ success: true, data: locations, tier: userObj.subscriptionTier });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get location history for a user within a time range
// @route   GET /api/location/history/range/:userId
// @access  Private
exports.getLocationHistoryRange = async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    // Default to last 24 hours if not provided
    let end = endTime ? new Date(endTime) : new Date();
    let start = startTime ? new Date(startTime) : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    const userObj = await User.findById(req.user.id);
    const limitDays = userObj.subscriptionTier === 'PRO' || userObj.subscriptionTier === 'BUSINESS' || userObj.subscriptionTier === 'ENTERPRISE' ? 30 : 1;
    const minAllowedDate = new Date();
    minAllowedDate.setDate(minAllowedDate.getDate() - limitDays);

    if (start < minAllowedDate) {
      start = minAllowedDate;
    }

    const locations = await LocationHistory.find({ 
      user: req.params.userId,
      timestamp: {
        $gte: start,
        $lte: end
      }
    })
    .sort({ timestamp: 1 }); // Sort oldest to newest for drawing paths

    res.status(200).json({ success: true, data: locations, tier: userObj.subscriptionTier });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Bulk update locations (for offline sync)
// @route   POST /api/location/bulk
// @access  Private
exports.bulkUpdateLocation = async (req, res) => {
  try {
    const { locations } = req.body; // Array of location objects

    if (!Array.isArray(locations) || locations.length === 0) {
      return res.status(400).json({ success: false, error: 'No locations provided' });
    }

    // 1. Update the latest location (use the last one in the array)
    const lastLoc = locations[locations.length - 1];
    await Location.findOneAndUpdate(
      { user: req.user.id },
      { 
        lat: lastLoc.lat, 
        lng: lastLoc.lng, 
        accuracy: lastLoc.accuracy, 
        batteryLevel: lastLoc.batteryLevel, 
        isCharging: lastLoc.isCharging, 
        timestamp: lastLoc.timestamp || Date.now() 
      },
      { upsert: true, new: true }
    );

    // 2. Insert all into history
    const historyData = locations.map(loc => ({
      user: req.user.id,
      lat: loc.lat,
      lng: loc.lng,
      accuracy: loc.accuracy,
      batteryLevel: loc.batteryLevel,
      isCharging: loc.isCharging,
      timestamp: loc.timestamp || Date.now()
    }));

    await LocationHistory.insertMany(historyData);

    for (const loc of locations) {
      if (loc.lat != null && loc.lng != null) {
        await touchWorkSession({
          userId: req.user.id,
          lat: loc.lat,
          lng: loc.lng,
          timestamp: loc.timestamp || Date.now(),
        });
      }
    }

    res.status(200).json({ success: true, message: `Synced ${locations.length} locations` });
  } catch (err) {
    console.error('Bulk Sync Error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get daily work summary
// @route   GET /api/location/work-summary
// @access  Private
exports.getWorkSummary = async (req, res) => {
  try {
    const dateKey = req.query.date || getDateKey(new Date());
    await finalizeStaleSession(req.user.id, new Date());

    const session = await WorkSession.findOne({ user: req.user.id, dateKey }).sort({ checkInAt: -1 });

    res.status(200).json({
      success: true,
      data: serializeWorkSession(session),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Manually check out current work session
// @route   POST /api/location/check-out
// @access  Private
exports.checkOutWorkSession = async (req, res) => {
  try {
    const session = await WorkSession.findOne({ user: req.user.id, status: 'OPEN' }).sort({ checkInAt: -1 });

    if (!session) {
      return res.status(404).json({ success: false, error: 'No active work session found' });
    }

    session.checkOutAt = new Date();
    session.lastSeenAt = session.checkOutAt;
    session.status = 'CLOSED';
    session.autoCheckedOut = false;
    await session.save();

    res.status(200).json({
      success: true,
      data: serializeWorkSession(session),
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
