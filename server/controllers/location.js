const Location = require('../models/Location');
const LocationHistory = require('../models/LocationHistory');
const Group = require('../models/Group');
const User = require('../models/User');

// @desc    Update user's location
// @route   PUT /api/location
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy, batteryLevel, isCharging } = req.body;

    const location = await Location.findOneAndUpdate(
      { user: req.user.id },
      { lat, lng, accuracy, batteryLevel, isCharging, timestamp: Date.now() },
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
      timestamp: Date.now()
    });

    res.status(200).json({ success: true, data: location });
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
    const limitDays = userObj.subscriptionTier === 'PREMIUM' ? 30 : 1;
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
    const limitDays = userObj.subscriptionTier === 'PREMIUM' ? 30 : 1;
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
