const express = require('express');
const router = express.Router();
const { updateLocation, getGroupLocations, getLocationHistory, getLocationHistoryRange, bulkUpdateLocation, getWorkSummary, checkOutWorkSession, getLiveUsers } = require('../controllers/location');
const { protect } = require('../middleware/auth');
const { requireLocationHistoryAccess, requireProOrHigher, requireTrackingAccess } = require('../middleware/trial');

router.put('/', protect, requireTrackingAccess, updateLocation);
router.post('/bulk', protect, requireTrackingAccess, requireProOrHigher, bulkUpdateLocation);
router.get('/work-summary', protect, getWorkSummary);
router.post('/check-out', protect, checkOutWorkSession);
router.get('/live-users', protect, getLiveUsers);
router.get('/group/:groupId', protect, getGroupLocations);
router.get('/history/:userId', protect, requireLocationHistoryAccess, getLocationHistory);
router.get('/history/range/:userId', protect, requireLocationHistoryAccess, getLocationHistoryRange);

module.exports = router;
