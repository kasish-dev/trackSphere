const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { applyTrialState } = require('../utils/subscription');
const { ensureWorkspaceForAdminUser } = require('../utils/workspace');

// Protect routes
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).populate('workspace', 'name slug owner');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
    }

    if (user.role === 'admin' && !user.workspace) {
      await ensureWorkspaceForAdminUser(user);
      await user.populate('workspace', 'name slug owner');
    }

    const { changed } = applyTrialState(user);
    const shouldRefreshActivity = !user.lastActiveAt || (Date.now() - new Date(user.lastActiveAt).getTime()) > (5 * 60 * 1000);

    if (shouldRefreshActivity) {
      user.lastActiveAt = new Date();
    }

    if (changed || shouldRefreshActivity) {
      await user.save();
    }

    req.user = user;

    next();
  } catch (err) {
    console.error('Protect Error:', err);
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Grant access to specific subscription tiers
exports.authorizeTier = (...tiers) => {
  return (req, res, next) => {
    if (!tiers.includes(req.user.subscriptionTier)) {
      return res.status(403).json({
        success: false,
        error: `Subscription tier ${req.user.subscriptionTier} is not authorized to access this route`,
      });
    }
    next();
  };
};

// Allow self-serve billing for individual users, but require admin ownership for
// BUSINESS/ENTERPRISE workspaces so employees cannot manage shared plans.
exports.authorizeBillingAccess = () => {
  return (req, res, next) => {
    const isWorkspaceEmployee = !['admin', 'superadmin'].includes(req.user.role)
      && req.user.accountType !== 'business_owner'
      && ['BUSINESS', 'ENTERPRISE'].includes(req.user.subscriptionTier);

    if (isWorkspaceEmployee) {
      return res.status(403).json({
        success: false,
        error: 'Billing and subscription management are only available to workspace admins on business plans',
      });
    }

    next();
  };
};
