const express = require('express');
const router = express.Router();
const { updateLocation, getGroupLocations, getLocationHistory, getLocationHistoryRange, bulkUpdateLocation, getWorkSummary, checkOutWorkSession } = require('../controllers/location');
const { protect } = require('../middleware/auth');

router.put('/', protect, updateLocation);
router.post('/bulk', protect, bulkUpdateLocation);
router.get('/work-summary', protect, getWorkSummary);
router.post('/check-out', protect, checkOutWorkSession);
router.get('/group/:groupId', protect, getGroupLocations);
router.get('/history/:userId', protect, getLocationHistory);
router.get('/history/range/:userId', protect, getLocationHistoryRange);

module.exports = router;
