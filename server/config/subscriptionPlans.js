const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    tier: 'FREE',
    amount: 0,
    currency: 'INR',
    name: 'Starter',
    description: 'Perfect for individual safety',
  },
  pro: {
    id: 'pro',
    tier: 'PRO',
    amount: 499,
    currency: 'INR',
    name: 'TrackSphere PRO',
    description: 'Advanced safety for teams',
  },
  business: {
    id: 'business',
    tier: 'BUSINESS',
    amount: 999,
    currency: 'INR',
    name: 'TrackSphere Business',
    description: 'Fleet and enterprise tracking',
  },
};

const getPlanConfig = (planId) => {
  return SUBSCRIPTION_PLANS[(planId || '').toLowerCase()] || null;
};

module.exports = {
  SUBSCRIPTION_PLANS,
  getPlanConfig,
};
