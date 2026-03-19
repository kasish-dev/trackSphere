const mongoose = require('mongoose');

const locationHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  groupId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Group',
  },
  lat: {
    type: Number,
    required: [true, 'Latitude is required'],
  },
  lng: {
    type: Number,
    required: [true, 'Longitude is required'],
  },
  accuracy: {
    type: Number,
    default: 0,
  },
  batteryLevel: {
    type: Number,
    default: null,
  },
  isCharging: {
    type: Boolean,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast time-series queries by user
locationHistorySchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('LocationHistory', locationHistorySchema);
