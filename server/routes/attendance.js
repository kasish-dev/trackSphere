const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendance');
const { protect } = require('../middleware/auth');
const { requireAttendanceAccess } = require('../middleware/trial');

// All attendance routes require authentication and proper subscription
router.use(protect);
router.use(requireAttendanceAccess);

// Get user attendance records
router.get('/user/:userId', attendanceController.getUserAttendance);

// Get workspace attendance summary
router.get('/workspace/:workspaceId/summary', attendanceController.getWorkspaceAttendanceSummary);

// Get attendance statistics
router.get('/workspace/:workspaceId/stats', attendanceController.getAttendanceStats);

// Manual attendance update (admin only)
router.post('/manual', attendanceController.manualAttendanceUpdate);

// Mark absentees for a date (admin only)
router.post('/mark-absentees', attendanceController.markAbsentees);

// Update attendance settings (workspace admin only)
router.put('/workspace/:workspaceId/settings', attendanceController.updateAttendanceSettings);

module.exports = router;