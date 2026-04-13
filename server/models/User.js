const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
    index: true,
  },
  needsPasswordReset: {
    type: Boolean,
    default: false,
  },
  accountType: {
    type: String,
    enum: ['individual', 'business_owner', 'employee'],
    default: 'individual',
  },
  subscriptionTier: {
    type: String,
    enum: ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'],
    default: 'FREE'
  },
  trialStatus: {
    type: String,
    enum: ['inactive', 'active', 'expired', 'converted'],
    default: 'inactive',
  },
  trialStartedAt: {
    type: Date,
    default: null,
  },
  trialEndsAt: {
    type: Date,
    default: null,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  subscriptionUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  preferences: {
    notifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    locationPrivacy: { type: Boolean, default: false },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' }
  },
  emergencyContacts: [
    {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String },
      preferredChannel: {
        type: String,
        enum: ['sms', 'email', 'whatsapp', 'telegram'],
        default: 'sms',
      }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});

userSchema.path('emergencyContacts').validate(function validateEmergencyContacts(contacts) {
  return contacts.every((contact) => Boolean(contact.phone || contact.email));
}, 'Each emergency contact must include at least a phone number or an email address.');

// Encyrpt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
