const express = require('express');
const router = express.Router();
const otpController = require('./otp.controller');
const { checkLimit } = require('../../middlewares/dbRateLimiter');

// Expected route: POST /api/send-otp
router.post('/send-otp', checkLimit('otp'), otpController.sendOtp);

// Expected route: POST /api/verify-otp
router.post('/verify-otp', checkLimit('otp'), otpController.verifyOtp);

module.exports = router;
