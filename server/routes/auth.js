const express = require('express');
const { body } = require('express-validator');
const { register, login, getMe, updatePreferences } = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

// Validation schemas
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Please include a valid email').normalizeEmail(),
  body('password').exists().withMessage('Password is required'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.patch('/preferences', protect, updatePreferences);

module.exports = router;
