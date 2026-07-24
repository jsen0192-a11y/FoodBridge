const { body, validationResult } = require('express-validator');

// Error Handler middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('role').isIn(['donor', 'ngo', 'volunteer', 'admin']).withMessage('Invalid registration role'),
  validateRequest
];

const loginValidation = [
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

const otpValidation = [
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits'),
  validateRequest
];

const forgotValidation = [
  body('email').trim().isEmail().withMessage('A valid email address is required').normalizeEmail(),
  validateRequest
];

const resetValidation = [
  body('token').notEmpty().withMessage('Verification token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  validateRequest
];

module.exports = {
  registerValidation,
  loginValidation,
  otpValidation,
  forgotValidation,
  resetValidation
};
