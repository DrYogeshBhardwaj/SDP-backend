const { successResponse, errorResponse } = require('../../utils/response');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');
const { sendOTP, verifyOTP } = require('../../utils/vi_sms');
const { recordFailure, resetFailures } = require('../../middlewares/dbRateLimiter');

// OTP SEND (Real Session API)
exports.sendOtp = async (req, res, next) => {
    try {
        const { mobile } = req.body;
        if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return errorResponse(res, 400, 'Please provide a valid 10-digit mobile number.');
        }

        const result = await sendOTP(mobile);

        if (result.Status === 'Success') {
            return successResponse(res, 200, 'OTP sent successfully', {
                sessionId: result.Details
            });
        } else {
            return errorResponse(res, 400, 'Unable to send OTP at this time. Please check your mobile number or try again later.');
        }
    } catch (error) {
        console.error('OTP Sending Error:', error);
        next(error);
    }
};

// OTP VERIFY (Real Session API)
exports.verifyOtp = async (req, res, next) => {
    try {
        const { mobile, otp, sessionId } = req.body;
        if (!mobile || !otp || !sessionId) {
            return errorResponse(res, 400, 'Mobile, OTP, and SessionId are required.');
        }

        // Verify with 2Factor
        const result = await verifyOTP(sessionId, otp);

        if (result.Status !== 'Success' || result.Details !== 'OTP Matched') {
            await recordFailure(req, 'otp');
            return errorResponse(res, 400, 'गलत कोड दर्ज हुआ है। कृपया पुनः प्रयास करें।');
        }

        // OTP Verified - Reset Failures
        await resetFailures(req, 'otp');

        // Check if user exists
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
                token, 
                user: { id: user.id, name: user.name, role: user.role, kit_activated: user.kit_activated, plan_type: user.plan_type }
            });
        }

        // NEW USER → REGISTER FLOW
        return successResponse(res, 200, 'OTP verified successfully', {
            userExists: false
        });

    } catch (error) {
        console.error('OTP Verification System Error:', error);
        next(error);
    }
};

