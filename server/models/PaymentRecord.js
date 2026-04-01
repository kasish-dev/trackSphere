const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  provider: {
    type: String,
    enum: ['razorpay', 'stripe', 'manual'],
    default: 'razorpay',
  },
  orderId: {
    type: String,
    default: null,
  },
  paymentId: {
    type: String,
    default: null,
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
  },
  planId: {
    type: String,
    required: true,
  },
  tier: {
    type: String,
    enum: ['FREE', 'PRO', 'BUSINESS', 'ENTERPRISE'],
    required: true,
  },
  planName: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['paid', 'failed', 'pending'],
    default: 'paid',
  },
  mode: {
    type: String,
    enum: ['live', 'mock'],
    default: 'live',
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('PaymentRecord', paymentRecordSchema);
