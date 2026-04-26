const express = require('express');
const router = express.Router();
const otpController = require('./otp.controller');

// Clean Slate V1 OTP Routes
router.post('/send-otp', otpController.sendOTP);
router.post('/verify-otp', otpController.verifyOTP);

module.exports = router;
