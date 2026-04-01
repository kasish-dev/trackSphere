const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updatePreferences, updateProfile, getUsers, getAdminDashboard, promoteUserToAdmin } = require('../controllers/auth');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// Validation schemas
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('accountType')
    .notEmpty()
    .withMessage('Account type is required')
    .isIn(['individual', 'business_owner', 'employee'])
    .withMessage('Please choose a valid account type'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
  body('password').exists().withMessage('Password is required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.patch('/preferences', protect, updatePreferences);
router.patch('/profile', protect, updateProfile);
router.get('/dashboard', protect, authorize('admin'), getAdminDashboard);
router.get('/users', protect, authorize('admin'), getUsers);
router.patch('/users/:id/promote-admin', protect, authorize('admin'), promoteUserToAdmin);

module.exports = router;
