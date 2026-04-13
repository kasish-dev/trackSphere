const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a group name'],
    trim: true,
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  workspace: {
    type: mongoose.Schema.ObjectId,
    ref: 'Workspace',
    default: null,
    index: true,
  },
  members: [
    {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
  ],
  inviteCode: {
    type: String,
    unique: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique invite code before saving
groupSchema.pre('save', async function () {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
});

module.exports = mongoose.model('Group', groupSchema);
