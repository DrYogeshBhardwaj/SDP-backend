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

module.exports = { loginLimiter, activationLimiter, payoutLimiter };
