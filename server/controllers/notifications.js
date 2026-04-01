const Notification = require('../models/Notification');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Mark notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'User not authorized',
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Server Error',
    });
  }
};

// @desc    Trigger a test SOS alert to saved emergency contacts
// @route   POST /api/notifications/test-sos
// @access  Private
exports.sendTestSOS = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Add at least one emergency contact before sending a test SOS',
      });
    }

    const location = {
      lat: req.body?.lat ?? 0,
      lng: req.body?.lng ?? 0,
    };

    const result = await notificationService.sendEmergencyAlert({
      type: 'TEST_SOS',
      user,
      contacts: user.emergencyContacts,
      location,
    });

    return res.status(200).json({
      success: true,
      message: 'Test SOS processed',
      data: result,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || 'Server Error',
    });
  }
};
