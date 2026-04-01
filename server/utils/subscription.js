const TRIAL_LENGTH_DAYS = 7;

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startFreeTrial = (user, tier = 'PRO') => {
  const now = new Date();
  user.subscriptionTier = tier;
  user.trialStatus = 'active';
  user.trialStartedAt = now;
  user.trialEndsAt = addDays(now, TRIAL_LENGTH_DAYS);
  user.subscriptionUpdatedAt = now;
  return user;
};

const applyTrialState = (user) => {
  if (!user) {
    return { user, changed: false };
  }

  let changed = false;

  if (user.trialStatus === 'active' && user.trialEndsAt && user.trialEndsAt <= new Date()) {
    user.trialStatus = 'expired';
    user.subscriptionTier = 'FREE';
    user.subscriptionUpdatedAt = new Date();
    changed = true;
  }

  return { user, changed };
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountType: user.accountType || 'individual',
  subscriptionTier: user.subscriptionTier,
  trialStatus: user.trialStatus || 'inactive',
  trialStartedAt: user.trialStartedAt || null,
  trialEndsAt: user.trialEndsAt || null,
  lastActiveAt: user.lastActiveAt || null,
  preferences: user.preferences,
  emergencyContacts: user.emergencyContacts || [],
  createdAt: user.createdAt || null,
});

module.exports = {
  TRIAL_LENGTH_DAYS,
  applyTrialState,
  serializeUser,
  startFreeTrial,
};
