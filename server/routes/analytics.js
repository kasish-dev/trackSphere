const express = require('express');
const router = express.Router();
const { getDailyAnalytics, getAnalyticsReport, getPrintableAnalyticsReport } = require('../controllers/analytics');
const { protect } = require('../middleware/auth');

const authorizeAnalyticsAccess = (req, res, next) => {
  const isAdmin = ['admin', 'superadmin'].includes(req.user?.role);
  const hasAnalyticsTier = ['BUSINESS', 'ENTERPRISE'].includes(req.user?.subscriptionTier);

  if (!isAdmin && !hasAnalyticsTier) {
    return res.status(403).json({
      success: false,
      error: 'Analytics are only available on BUSINESS and ENTERPRISE plans',
    });
  }

  next();
};

router.get('/daily', protect, authorizeAnalyticsAccess, getDailyAnalytics);
router.get('/report', protect, authorizeAnalyticsAccess, getAnalyticsReport);
router.get('/report/print', protect, authorizeAnalyticsAccess, getPrintableAnalyticsReport);

module.exports = router;
