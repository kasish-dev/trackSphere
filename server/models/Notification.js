const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['sos', 'geofence', 'group_join', 'info'],
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  data: {
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
    userName: String,
    lat: Number,
    lng: Number,
    fenceName: String,
    eventInfo: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
