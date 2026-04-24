const express = require('express');
const router = express.Router();
const authController = require('../modules/auth/auth.controller');
const otpController = require('../modules/auth/otp.controller');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTP);
router.post('/login', authController.login);
router.post('/power-register', authController.powerRegister);
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
