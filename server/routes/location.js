const express = require('express');
const router = express.Router();
const { updateLocation, getGroupLocations, getLocationHistory, getLocationHistoryRange } = require('../controllers/location');
const { protect } = require('../middleware/auth');

router.put('/', protect, updateLocation);
router.get('/group/:groupId', protect, getGroupLocations);
router.get('/history/:userId', protect, getLocationHistory);
router.get('/history/range/:userId', protect, getLocationHistoryRange);

module.exports = router;
