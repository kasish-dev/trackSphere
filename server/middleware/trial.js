// Middleware to enforce trial and subscription restrictions
const enforceTrialAndSubscription = (feature = 'general') => {
  return (req, res, next) => {
    const user = req.user;

    // Superadmins have unlimited access
    if (user.role === 'superadmin') {
      return next();
    }

    // Check if trial has expired
    if (user.trialStatus === 'expired') {
      return res.status(403).json({
        success: false,
        error: 'Your free trial has expired. Please upgrade to continue using this feature.',
        code: 'TRIAL_EXPIRED',
        upgradeRequired: true
      });
    }

    // Check subscription-based feature restrictions
    const tier = user.subscriptionTier || 'FREE';

    // Define feature restrictions by tier
    const restrictions = {
      tracking_realtime: ['PRO', 'BUSINESS', 'ENTERPRISE'],
      // Location tracking and history
      location_history: ['PRO', 'BUSINESS', 'ENTERPRISE'],
      location_bulk_sync: ['PRO', 'BUSINESS', 'ENTERPRISE'],

      // Group features
      groups_multiple: ['PRO', 'BUSINESS', 'ENTERPRISE'],

      // Analytics and reports
      analytics: ['BUSINESS', 'ENTERPRISE'],
      reports: ['BUSINESS', 'ENTERPRISE'],

      // Geofencing
      geofencing: ['PRO', 'BUSINESS', 'ENTERPRISE'],

      // Chat history retention
      chat_history_extended: ['PRO', 'BUSINESS', 'ENTERPRISE'],

      // Attendance system
      attendance: ['BUSINESS', 'ENTERPRISE'],

      // Admin features
      admin_dashboard: ['BUSINESS', 'ENTERPRISE'],
    };

    // Check if the requested feature is restricted
    if (restrictions[feature] && !restrictions[feature].includes(tier)) {
      return res.status(403).json({
        success: false,
        error: `This feature requires a ${restrictions[feature][0]} or higher subscription.`,
        code: 'SUBSCRIPTION_REQUIRED',
        requiredTier: restrictions[feature][0],
        currentTier: tier,
        upgradeRequired: true
      });
    }

    // Additional checks for FREE tier limitations
    if (tier === 'FREE') {
      // FREE tier: max 1 group
      if (feature === 'groups_multiple') {
        // This would be checked in the groups controller
      }

      // FREE tier: 1 day history
      if (feature === 'location_history_extended') {
        // This would be checked in the location controller
      }
    }

    next();
  };
};

// Specific middleware for different features
const requireProOrHigher = enforceTrialAndSubscription('pro_features');
const requireBusinessOrHigher = enforceTrialAndSubscription('business_features');
const requireTrackingAccess = enforceTrialAndSubscription('tracking_realtime');
const requireLocationHistoryAccess = enforceTrialAndSubscription('location_history');
const requireAnalyticsAccess = enforceTrialAndSubscription('analytics');
const requireReportsAccess = enforceTrialAndSubscription('reports');
const requireGeofencingAccess = enforceTrialAndSubscription('geofencing');
const requireAttendanceAccess = enforceTrialAndSubscription('attendance');
const requireAdminAccess = enforceTrialAndSubscription('admin_dashboard');

module.exports = {
  enforceTrialAndSubscription,
  requireProOrHigher,
  requireBusinessOrHigher,
  requireTrackingAccess,
  requireLocationHistoryAccess,
  requireAnalyticsAccess,
  requireReportsAccess,
  requireGeofencingAccess,
  requireAttendanceAccess,
  requireAdminAccess,
};
