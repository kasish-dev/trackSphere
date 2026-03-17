const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for fast queries
locationSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('Location', locationSchema);
