const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50,
    message: { success: false, message: 'Too many login attempts, please try again later' }
});

const activationLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many activation attempts, slow down' }
});

const payoutLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: { success: false, message: 'Too many payout requests, try again later' }
});

// OTP Safeguards
const otpIpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Max 20 per IP per hour
    message: { success: false, message: 'Too many OTP requests from this IP. Blocked to prevent spam.' }
});

const otpMobileLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Max 5 OTP per mobile per hour
    keyGenerator: (req) => req.body.mobile || 'unknown',
    message: { success: false, message: 'OTP limit reached for this mobile number (Max 5/hr).' }
});

const otpCooldownLimiter = rateLimit({
    windowMs: 30 * 1000, // 30 seconds
    max: 1, // Max 1 per 30 seconds
    keyGenerator: (req) => req.body.mobile || 'unknown',
    message: { success: false, message: 'Please wait 30 seconds before requesting another OTP.' }
});

module.exports = {
    loginLimiter,
    activationLimiter,
    payoutLimiter,
    otpIpLimiter,
    otpMobileLimiter,
    otpCooldownLimiter
};
