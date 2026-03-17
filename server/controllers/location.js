const Location = require('../models/Location');
const Group = require('../models/Group');

// @desc    Update user's location
// @route   PUT /api/location
// @access  Private
exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;

    const location = await Location.findOneAndUpdate(
      { user: req.user.id },
      { lat, lng, accuracy, timestamp: Date.now() },
      { upsert: true, new: true }
    );

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
    const locations = await Location.find({ user: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(100);

    res.status(200).json({ success: true, data: locations });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
