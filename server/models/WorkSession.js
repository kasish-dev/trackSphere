const mongoose = require('mongoose');

const workSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  dateKey: {
    type: String,
    required: true,
    index: true,
  },
  checkInAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  checkOutAt: {
    type: Date,
    default: null,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['OPEN', 'CLOSED'],
    default: 'OPEN',
  },
  autoCheckedOut: {
    type: Boolean,
    default: false,
  },
  totalDistanceKm: {
    type: Number,
    default: 0,
  },
  totalPings: {
    type: Number,
    default: 0,
  },
  firstLocation: {
    lat: Number,
    lng: Number,
  },
  lastLocation: {
    lat: Number,
    lng: Number,
  },
}, {
  timestamps: true,
});

workSessionSchema.index({ user: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('WorkSession', workSessionSchema);
