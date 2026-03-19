const mongoose = require('mongoose');

const safetyAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  type: {
    type: String,
    enum: ['STATIONARY_ANOMALY', 'ROUTE_DEVIATION', 'VELOCITY_ANOMALY'],
    required: true
  },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['UNRESOLVED', 'ACKNOWLEDGED', 'FALSE_ALARM'],
    default: 'UNRESOLVED'
  },
  metadata: {
    duration: Number, // duration stationary in minutes
    details: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SafetyAlert', safetyAlertSchema);
