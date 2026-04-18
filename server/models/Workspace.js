const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  companyProfile: {
    legalName: {
      type: String,
      default: '',
      trim: true,
    },
    industry: {
      type: String,
      default: '',
      trim: true,
    },
    billingEmail: {
      type: String,
      default: '',
      trim: true,
    },
  },
  attendanceSettings: {
    autoAttendanceEnabled: {
      type: Boolean,
      default: true,
    },
    expectedCheckInTime: {
      type: String,
      default: '09:00',
    },
    expectedCheckOutTime: {
      type: String,
      default: '18:00',
    },
    fullDayHours: {
      type: Number,
      default: 8,
    },
    halfDayHours: {
      type: Number,
      default: 4,
    },
    lateAfterMinutes: {
      type: Number,
      default: 0,
    },
    geofenceCategories: {
      type: [String],
      default: ['work', 'office', 'headquarters'],
    },
  },
  reportSettings: {
    enabled: {
      type: Boolean,
      default: true,
    },
    frequency: {
      type: String,
      enum: ['manual', 'daily'],
      default: 'daily',
    },
    recipients: {
      type: [String],
      default: [],
    },
    deliveryChannels: {
      type: [String],
      default: ['email'],
    },
    includeAttendance: {
      type: Boolean,
      default: true,
    },
    includeRoutes: {
      type: Boolean,
      default: true,
    },
    includeIdleTime: {
      type: Boolean,
      default: true,
    },
    lastGeneratedAt: {
      type: Date,
      default: null,
    },
    lastSentAt: {
      type: Date,
      default: null,
    },
  },
  billing: {
    seatPriceMonthly: {
      type: Number,
      default: 50,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paywallEnabled: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

workspaceSchema.pre('validate', function setInviteCode() {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  }
});

module.exports = mongoose.model('Workspace', workspaceSchema);
