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
}, {
  timestamps: true,
});

workspaceSchema.pre('validate', function setInviteCode() {
  if (!this.inviteCode) {
    this.inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  }
});

module.exports = mongoose.model('Workspace', workspaceSchema);
