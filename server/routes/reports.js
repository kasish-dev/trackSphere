const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports');
const { protect } = require('../middleware/auth');
const { requireReportsAccess } = require('../middleware/trial');

router.use(protect);
router.use(requireReportsAccess);

router.post('/daily', reportsController.generateDailyReport);
router.post('/send-email', reportsController.sendReportEmail);
router.get('/preview', reportsController.getReportPreview);
router.put('/workspace/:workspaceId/settings', reportsController.updateReportSettings);

module.exports = router;
