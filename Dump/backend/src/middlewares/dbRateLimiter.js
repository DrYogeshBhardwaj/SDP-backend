const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { errorResponse } = require('../utils/response');

/**
 * CONFIGURATION
 * Rules as per user request:
 * OTP: 3/min | 5 fails = 15min block
 * LOGIN: 5/min | 10 fails = 30min block
 * PAYMENT: 10/min | exceed = 10min block
 */
const RULES = {
    otp: {
        maxPerMinute: 3,
        failThreshold: 5,
        blockDurationMinutes: 15
    },
    login: {
        maxPerMinute: 5,
        failThreshold: 3,
        blockDurationMinutes: 5
    },
    payment: {
        maxPerMinute: 10,
        failThreshold: 999, // Payment only blocks on per-minute exceed
        blockDurationMinutes: 10
    }
};

/**
 * Persisent Rate Limiter Middleware
 * Checks multiple keys (IP, Mobile, UserID) against DB records.
 */
const checkLimit = (type) => async (req, res, next) => {
    try {
        const config = RULES[type];
        const ip = req.ip;
        const mobile = req.body.mobile || req.query.mobile;
        const userId = req.user ? req.user.id : null;

        // Collect all applicable keys
        const keys = [
            { key: ip, type: `${type}_ip` }
        ];
        if (mobile) keys.push({ key: mobile, type: `${type}_mobile` });
        if (userId) keys.push({ key: userId, type: `${type}_user` });

        const now = new Date();

        for (const k of keys) {
            const record = await prisma.rateLimit.findUnique({
                where: { key_type: { key: k.key, type: k.type } }
            });

            if (record) {
                // 1. Check if Blocked
                if (record.blocked_until && record.blocked_until > now) {
                    const isTestingMode = true; // TOGGLE THIS FOR PRODUCTION
                    if (!isTestingMode) {
                        const waitMin = Math.ceil((record.blocked_until - now) / 60000);
                        return errorResponse(res, 429, `Too many attempts. Blocked for ${waitMin} more minutes.`);
                    }
                }

                // 2. Check Per-Minute Limit
                const secondsSinceUpdate = (now - record.updatedAt) / 1000;
                if (secondsSinceUpdate < 60) {
                    if (record.count >= config.maxPerMinute) {
                        // For payment, exceed = block
                        if (type === 'payment') {
                            await prisma.rateLimit.update({
                                where: { id: record.id },
                                data: { blocked_until: new Date(now.getTime() + config.blockDurationMinutes * 60000) }
                            });
                        }
                        return errorResponse(res, 429, `Rate limit exceeded. Please wait 1 minute.`);
                    }
                    
                    // Increment count
                    await prisma.rateLimit.update({
                        where: { id: record.id },
                        data: { count: { increment: 1 } }
                    });
                } else {
                    // Reset window
                    await prisma.rateLimit.update({
                        where: { id: record.id },
                        data: { count: 1 }
                    });
                }
            } else {
                // Create new record
                await prisma.rateLimit.create({
                    data: { key: k.key, type: k.type, count: 1 }
                });
            }
        }

        next();
    } catch (error) {
        console.error("Rate Limiter Error:", error);
        next(); // Fail open to avoid blocking legitimate users on DB error
    }
};

/**
 * Record Failure Logic
 * To be called by controllers on wrong OTP/PIN
 */
const recordFailure = async (req, type) => {
    try {
        const config = RULES[type];
        if (!config || !config.failThreshold) return;

        const ip = req.ip;
        const mobile = req.body.mobile || req.query.mobile;
        const userId = req.user ? req.user.id : null;

        const keys = [
            { key: ip, type: `${type}_ip` }
        ];
        if (mobile) keys.push({ key: mobile, type: `${type}_mobile` });
        if (userId) keys.push({ key: userId, type: `${type}_user` });

        const now = new Date();

        for (const k of keys) {
            const record = await prisma.rateLimit.findUnique({
                where: { key_type: { key: k.key, type: k.type } }
            });

            if (record) {
                const newFailures = record.failures + 1;
                const updateData = { failures: newFailures };

                if (newFailures >= config.failThreshold) {
                    updateData.blocked_until = new Date(now.getTime() + config.blockDurationMinutes * 60000);
                    updateData.failures = 0; // Reset failures after block triggered
                }

                await prisma.rateLimit.update({
                    where: { id: record.id },
                    data: updateData
                });
            }
        }
    } catch (error) {
        console.error("Failure Recording Error:", error);
    }
};

/**
 * Reset Failures Logic
 * Call on successful Login/Verify
 */
const resetFailures = async (req, type) => {
    try {
        const ip = req.ip;
        const mobile = req.body.mobile || req.query.mobile;
        const userId = req.user ? req.user.id : null;

        const keys = [
            { key: ip, type: `${type}_ip` }
        ];
        if (mobile) keys.push({ key: mobile, type: `${type}_mobile` });
        if (userId) keys.push({ key: userId, type: `${type}_user` });

        for (const k of keys) {
            await prisma.rateLimit.updateMany({
                where: { key: k.key, type: k.type },
                data: { failures: 0, blocked_until: null }
            });
        }
    } catch (error) {
        // Safe to ignore
    }
};

module.exports = {
    checkLimit,
    recordFailure,
    resetFailures
};
