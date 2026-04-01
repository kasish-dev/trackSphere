const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, markAllAsRead, sendTestSOS } = require('../controllers/notifications');
const { protect } = require('../middleware/auth');

router.get('/', protect, getNotifications);
router.post('/test-sos', protect, sendTestSOS);
router.patch('/read-all', protect, markAllAsRead);
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
