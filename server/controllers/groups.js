const Group = require('../models/Group');
const Geofence = require('../models/Geofence');
const User = require('../models/User');
const { applyTrialState } = require('../utils/subscription');

// @desc    Create group
// @route   POST /api/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user.subscriptionTier === 'FREE') {
      const userGroupsCount = await Group.countDocuments({ members: req.user.id });
      if (userGroupsCount >= 1) {
        return res.status(403).json({ success: false, error: 'FREE tier users can only create or join 1 group. Upgrade to PRO to unlock more groups.' });
      }
    }

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

    const user = await User.findById(req.user.id);
    if (user.subscriptionTier === 'FREE') {
      const userGroupsCount = await Group.countDocuments({ members: req.user.id });
      if (userGroupsCount >= 1) {
        return res.status(403).json({ success: false, error: 'FREE tier users can only create or join 1 group. Upgrade to PRO for more.' });
      }
    }

    // CHECK GROUP MEMBER LIMITS (Based on Owner's Tier)
    const owner = await User.findById(group.owner);
    const { changed: ownerTrialChanged } = applyTrialState(owner);
    if (owner && ownerTrialChanged) {
      await owner.save();
    }
    const memberCount = group.members.length;
    const tierLimits = { 'FREE': 2, 'PRO': 5, 'BUSINESS': 15, 'ENTERPRISE': 1000 };
    const limit = tierLimits[owner?.subscriptionTier] || 2;

    if (memberCount >= limit) {
      return res.status(403).json({
        success: false,
        error: `This group has reached its maximum capacity of ${limit} members. The group owner needs to upgrade their plan to add more members.`
      });
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

    // Broadcast to the group via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.groupId).emit('geofence-created', geofence);
    }

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
// @desc    Delete a group
// @route   DELETE /api/groups/:groupId
// @access  Private
exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }

    // Check if user is owner
    if (group.owner.toString() !== req.user.id) {
      return res.status(401).json({ success: false, error: 'User not authorized to delete this group' });
    }

    await group.deleteOne();

    // Also delete any geofences associated with this group
    await Geofence.deleteMany({ groupId: req.params.groupId });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
