const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  googleSignIn, 
  forgotPassword, 
  resetPassword,
  verifyOtp,
  refreshToken,
  getMe 
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  otpValidation,
  forgotValidation,
  resetValidation
} = require('../middleware/validator');

router.post('/register', registerValidation, register);
router.post('/verify-otp', otpValidation, verifyOtp);
router.post('/login', loginValidation, login);
router.post('/refresh', refreshToken);
router.post('/google', googleSignIn);
router.post('/forgot-password', forgotValidation, forgotPassword);
router.post('/reset-password', resetValidation, resetPassword);
router.get('/me', protect, getMe);

module.exports = router;
