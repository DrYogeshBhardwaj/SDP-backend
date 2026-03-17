const { successResponse, errorResponse } = require('../../utils/response');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');
const axios = require('axios');

// In-memory store for OTPs (Mobile -> { otp, expiresAt })
const otpStore = new Map();
// LIVE MODE OTP SEND
exports.sendOtp = async (req, res, next) => {
    try {
        const { mobile } = req.body;

        if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return errorResponse(res, 400, 'Please provide a valid 10-digit mobile number.');
        }

        // BYPASS OTP FOR DEVELOPMENT/TESTING
        console.log(`[BYPASS] Mock OTP generated for ${mobile}`);
        return successResponse(res, 200, 'OTP sent successfully (Bypass Mode)', {
            sessionId: "BYPASS_SESSION"
        });

    } catch (error) {
        console.error('OTP Sending Error:', error);
        next(error);
    }
};

// LIVE MODE OTP VERIFY
exports.verifyOtp = async (req, res, next) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !otp) {
            return errorResponse(res, 400, 'Mobile and OTP required.');
        }

        // BYPASS OTP VERIFICATION FOR DEVELOPMENT/TESTING
        console.log(`[BYPASS] OTP verified for ${mobile}`);
        
        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        // USER EXISTS → LOGIN
        if (user) {
            if (user.status === 'BLOCKED') {
                return errorResponse(res, 403, 'Account is blocked');
            }

            const token = generateToken({
                userId: user.id,
                role: user.role,
                cid: user.cid
            });

            res.cookie('jwt', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            return successResponse(res, 200, 'OTP verified successfully', {
                userExists: true,
                user: { id: user.id, name: user.name, role: user.role }
            });
        }

        // NEW USER → REGISTER FLOW
        return successResponse(res, 200, 'OTP verified successfully', {
            userExists: false
        });

    } catch (error) {
        console.error('OTP Verification System Error');
        next(error);
    }
};