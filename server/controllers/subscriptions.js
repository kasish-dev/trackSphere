const User = require('../models/User');
require('dotenv').config();

// Initialize Stripe if key is provided
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// @desc    Create a Stripe Checkout Session (or simulate success)
// @route   POST /api/subscriptions/create-checkout-session
// @access  Private
exports.createCheckoutSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const { planId } = req.body; // 'pro' or 'business'
    const tierName = planId === 'business' ? 'BUSINESS' : 'PRO';
    const amount = planId === 'business' ? 999 : 499;

    // === DEMO / SIMULATION MODE ===
    // If no Stripe API key is configured, instantly upgrade the user for the sake of the presentation.
    if (!stripe) {
      console.log('No STRIPE_SECRET_KEY found. Running in SIMULATION mode.');
      const userObj = require('../models/User');
      const user = await userObj.findById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Upgrade User
      user.subscriptionTier = tierName;
      user.trialStatus = 'converted';
      user.subscriptionUpdatedAt = new Date();
      await user.save();

      // Return a success URL directly to the frontend
      return res.status(200).json({ 
        success: true, 
        url: `${frontendUrl}/success?session_id=simulated_presentation_mode`,
        simulated: true
      });
    }

    // === REAL STRIPE MODE ===
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `TrackSphere ${tierName}`,
              description: planId === 'business' ? 'Up to 15 members and full analytics.' : 'Up to 5 members and advanced safety.',
            },
            unit_amount: amount * 100, 
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${frontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/dashboard`,
      client_reference_id: userId,
    });

    res.status(200).json({ success: true, url: session.url });
  } catch (err) {
    console.error('Stripe Error:', err);
    res.status(500).json({ success: false, error: 'Failed to create payment session' });
  }
};
