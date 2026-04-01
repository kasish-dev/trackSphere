const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name for the geofence'],
    trim: true,
  },
  groupId: {
    type: mongoose.Schema.ObjectId,
    ref: 'Group',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  center: {
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
  },
  radius: {
    type: Number,
    required: [true, 'Please add a radius in meters'],
    default: 100,
  },
  category: {
    type: String,
    enum: ['home', 'work', 'school', 'danger', 'other'],
    default: 'other',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Geofence', geofenceSchema);
