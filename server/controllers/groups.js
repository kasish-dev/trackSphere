const Group = require('../models/Group');
const Geofence = require('../models/Geofence');

// @desc    Create group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    req.body.owner = req.user.id;
    req.body.members = [req.user.id];

    const group = await Group.create(req.body);

    res.status(201).json({
      success: true,
      data: group,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get user groups
// @route   GET /api/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user.id }).populate('owner members', 'name email');

    res.status(200).json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Join group by invite code
// @route   POST /api/groups/join
// @access  Private
exports.joinGroup = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const group = await Group.findOne({ inviteCode });

    if (!group) {
      return res.status(404).json({ success: false, error: 'Invalid invite code' });
    }

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ success: false, error: 'You are already a member of this group' });
    }

    group.members.push(req.user.id);
    await group.save();

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Create geofence for a group
// @route   POST /api/groups/:groupId/geofences
// @access  Private
exports.createGeofence = async (req, res) => {
  try {
    req.body.groupId = req.params.groupId;
    req.body.createdBy = req.user.id;

    const geofence = await Geofence.create(req.body);

    res.status(201).json({
      success: true,
      data: geofence,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// @desc    Get all geofences for a group
// @route   GET /api/groups/:groupId/geofences
// @access  Private
exports.getGroupGeofences = async (req, res) => {
  try {
    const geofences = await Geofence.find({ groupId: req.params.groupId });

    res.status(200).json({
      success: true,
      count: geofences.length,
      data: geofences,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
