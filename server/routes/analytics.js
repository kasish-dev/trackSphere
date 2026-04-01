const express = require('express');
const router = express.Router();
const { getDailyAnalytics, getAnalyticsReport, getPrintableAnalyticsReport } = require('../controllers/analytics');
const { protect, authorizeTier } = require('../middleware/auth');

router.get('/daily', protect, authorizeTier('BUSINESS', 'ENTERPRISE'), getDailyAnalytics);
router.get('/report', protect, authorizeTier('BUSINESS', 'ENTERPRISE'), getAnalyticsReport);
router.get('/report/print', protect, authorizeTier('BUSINESS', 'ENTERPRISE'), getPrintableAnalyticsReport);

module.exports = router;
