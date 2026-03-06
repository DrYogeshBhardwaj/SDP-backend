const express = require('express');
const router = express.Router();
const otpController = require('./otp.controller');
const { otpIpLimiter, otpMobileLimiter, otpCooldownLimiter } = require('../../middlewares/rateLimiter');

// Expected route: POST /api/send-otp
router.post('/send-otp', otpIpLimiter, otpMobileLimiter, otpCooldownLimiter, otpController.sendOtp);

// Expected route: POST /api/verify-otp
router.post('/verify-otp', otpController.verifyOtp);

module.exports = router;
