const express = require('express');
const crypto = require('crypto');
const { protect, authorizeBillingAccess } = require('../middleware/auth');
const User = require('../models/User');
const PaymentRecord = require('../models/PaymentRecord');
const { getPlanConfig } = require('../config/subscriptionPlans');
const { serializeUser } = require('../utils/subscription');
const { buildInvoiceHtml, createPaymentRecord, serializePaymentRecord } = require('../utils/invoices');

const router = express.Router();

const getRazorpayMode = () => (process.env.RAZORPAY_MODE || 'test').toLowerCase();

const buildReceiptId = (userId) => {
  const normalizedUserId = String(userId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-12);
  const timestamp = Date.now().toString(36).slice(-10);
  return `ts${normalizedUserId}${timestamp}`.slice(0, 40);
};

const getRazorpayCredentials = () => {
  const mode = getRazorpayMode();

  if (mode === 'mock') {
    return null;
  }

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
};

const createRazorpayOrder = async ({ amount, currency, receipt, notes, credentials }) => {
  const authToken = Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64');

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency,
      receipt,
      notes,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      payload?.error?.description
      || payload?.description
      || payload?.message
      || 'Failed to create Razorpay order'
    );
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

// @desc    Create Razorpay Order
// @route   POST /api/payment/create-order
// @access  Private
router.post('/create-order', protect, authorizeBillingAccess(), async (req, res) => {
  try {
    const { plan } = req.body;
    const planConfig = getPlanConfig(plan);
    const razorpayMode = getRazorpayMode();

    if (!planConfig || planConfig.amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid paid plan selected' });
    }

    const razorpayCredentials = getRazorpayCredentials();

    if (!razorpayCredentials) {
      return res.status(200).json({
        success: true,
        key: process.env.RAZORPAY_KEY_ID || null,
        order: {
          id: `order_mock_${Date.now()}`,
          amount: planConfig.amount * 100,
          currency: planConfig.currency,
          mock: true,
        },
        plan: planConfig,
        mode: process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? razorpayMode : 'mock',
      });
    }

    const order = await createRazorpayOrder({
      amount: planConfig.amount * 100,
      currency: planConfig.currency,
      receipt: buildReceiptId(req.user.id),
      notes: {
        userId: String(req.user.id),
        planId: planConfig.id,
        tier: planConfig.tier,
      },
      credentials: razorpayCredentials,
    });

    res.status(200).json({
      success: true,
      key: process.env.RAZORPAY_KEY_ID,
      order,
      plan: planConfig,
      mode: razorpayMode,
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    const errorMessage = err?.payload?.error?.description || err.message || 'Failed to create Razorpay order';
    res.status(err.statusCode || 500).json({ success: false, error: errorMessage });
  }
});

// @desc    Verify Razorpay Payment
// @route   POST /api/payment/verify-payment
// @access  Private
router.post('/verify-payment', protect, authorizeBillingAccess(), async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;
    const planConfig = getPlanConfig(plan);
    const razorpayMode = getRazorpayMode();

    if (!planConfig || planConfig.amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid paid plan selected' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (typeof razorpay_order_id !== 'string' || typeof razorpay_payment_id !== 'string' || typeof razorpay_signature !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing payment verification fields' });
    }

    const isMockPayment = razorpay_order_id.startsWith('order_mock_') && razorpay_signature === 'mock_signature';

    if (!isMockPayment) {
      const secret = process.env.RAZORPAY_KEY_SECRET;

      if (!secret) {
        return res.status(500).json({ success: false, error: 'Razorpay secret key is not configured on the server' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      if (razorpay_signature !== expectedSignature) {
        return res.status(400).json({ success: false, error: 'Invalid payment signature' });
      }
    }

    user.subscriptionTier = planConfig.tier;
    user.trialStatus = 'converted';
    user.subscriptionUpdatedAt = new Date();
    await user.save();

    const paymentRecord = await createPaymentRecord({
      user,
      provider: 'razorpay',
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planConfig,
      mode: isMockPayment ? 'mock' : 'live',
    });

    return res.status(200).json({
      success: true,
      message: isMockPayment
        ? `Mock payment verified. ${planConfig.name} activated.`
        : `Payment verified. ${planConfig.name} activated.`,
      data: {
        user: serializeUser(user),
        subscriptionTier: user.subscriptionTier,
        plan: planConfig,
        invoice: serializePaymentRecord(paymentRecord),
        mode: isMockPayment ? 'mock' : razorpayMode,
      },
    });
  } catch (err) {
    console.error('Razorpay Verification Error:', err);
    res.status(500).json({ success: false, error: err.message || 'Payment verification failed' });
  }
});

// @desc    Log failed or cancelled payment attempt
// @route   POST /api/payment/log-failure
// @access  Private
router.post('/log-failure', protect, authorizeBillingAccess(), async (req, res) => {
  try {
    const { plan, reason, orderId, paymentId, status } = req.body;
    const planConfig = getPlanConfig(plan);

    if (!planConfig) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    const record = await PaymentRecord.create({
      user: req.user.id,
      provider: 'razorpay',
      orderId: orderId || null,
      paymentId: paymentId || null,
      invoiceNumber: `TS-FAIL-${Date.now()}`,
      planId: planConfig.id,
      tier: planConfig.tier,
      planName: planConfig.name,
      amount: planConfig.amount,
      currency: planConfig.currency,
      status: status === 'cancelled' ? 'failed' : 'failed',
      mode: 'live',
      paidAt: new Date(),
    });

    return res.status(200).json({
      success: true,
      message: reason || 'Payment failure logged',
      data: serializePaymentRecord(record),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to log payment failure' });
  }
});

// @desc    Get payment history
// @route   GET /api/payment/history
// @access  Private
router.get('/history', protect, authorizeBillingAccess(), async (req, res) => {
  try {
    const payments = await PaymentRecord.find({ user: req.user.id }).sort({ paidAt: -1 });

    res.status(200).json({
      success: true,
      data: payments.map(serializePaymentRecord),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load payment history' });
  }
});

// @desc    Get printable invoice
// @route   GET /api/payment/invoice/:invoiceId
// @access  Private
router.get('/invoice/:invoiceId', protect, authorizeBillingAccess(), async (req, res) => {
  try {
    const invoice = await PaymentRecord.findOne({ _id: req.params.invoiceId, user: req.user.id });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const html = buildInvoiceHtml({
      user: req.user,
      record: serializePaymentRecord(invoice),
    });

    res.status(200).json({
      success: true,
      data: {
        invoice: serializePaymentRecord(invoice),
        html,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message || 'Failed to load invoice' });
  }
});

module.exports = router;
