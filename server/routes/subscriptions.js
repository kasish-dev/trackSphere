const express = require('express');
const { createCheckoutSession } = require('../controllers/subscriptions');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/create-checkout-session', protect, createCheckoutSession);

module.exports = router;
