const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');

/**
 * OTP Controller (V1 Clean Slate)
 * Handles sending and verification of OTPs.
 */

// Simple send OTP
const sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || mobile.length !== 10) return errorResponse(res, 400, 'Invalid Mobile');

        // MOCK OTP for V1 testing
        const otp = '123456';
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        await prisma.otpSession.upsert({
            where: { mobile },
            update: { otp, expiresAt },
            create: { mobile, otp, expiresAt }
        });

        console.log(`[V1_OTP] Sent ${otp} to ${mobile}`);
        return successResponse(res, 200, 'OTP sent (V1 Mock Active)');
    } catch (err) {
        return errorResponse(res, 500, 'Failed to send OTP');
    }
};

// Simple verify OTP
const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;
        
        // MOCK Bypass for development
        if (otp === '123456') {
             // Check if user exists
             const user = await prisma.user.findUnique({ where: { mobile } });
             
             if (user) {
                const { generateToken } = require('../../utils/jwt');
                const token = generateToken({ userId: user.id });
                return successResponse(res, 200, 'OTP Verified', { token, isNew: false });
             } else {
                return successResponse(res, 200, 'OTP Verified', { isNew: true });
             }
        }

        const session = await prisma.otpSession.findUnique({ where: { mobile } });
        if (!session || session.otp !== otp || new Date() > session.expiresAt) {
            return errorResponse(res, 401, 'Invalid or Expired OTP');
        }

        const user = await prisma.user.findUnique({ where: { mobile } });
        const { generateToken } = require('../../utils/jwt');
        const token = user ? generateToken({ userId: user.id }) : null;

        return successResponse(res, 200, 'OTP Verified', { token, isNew: !user });
    } catch (err) {
        return errorResponse(res, 500, 'Verification failed');
    }
};

module.exports = {
    sendOTP,
    verifyOTP
};