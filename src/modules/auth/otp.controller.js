const { successResponse, errorResponse } = require('../../utils/response');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('../../utils/jwt');

exports.sendOtp = async (req, res, next) => {
    try {
        const { mobile } = req.body;

        if (!mobile || !/^[0-9]{10}$/.test(mobile)) {
            return errorResponse(res, 400, 'Please provide a valid 10-digit mobile number.');
        }

        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey || apiKey === "YOUR_2FACTOR_API_KEY") {
            console.error('Missing TWO_FACTOR_API_KEY in .env');
            return errorResponse(res, 500, 'SMS service is temporarily unavailable. Contact administrator.');
        }

        const formattedMobile = `91${mobile}`;
        // Enforcing generic AUTOGEN2 to completely bypass DLT Voice Fallbacks and strictly force SMS delivery over the network
        const apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/${formattedMobile}/AUTOGEN2`;

        const response = await fetch(apiUrl, { method: 'GET' });
        const data = await response.json().catch(() => ({}));

        if (data.Status !== 'Success') {
            // STRICT RULE: Never log full payload to avoid leaking OTP
            console.error('2Factor API Error - Status:', data.Status, 'Details:', data.Details);
            return errorResponse(res, 400, data.Details || 'Failed to send OTP.');
        }

        // Return the Details value (which is usually the session_id) for OTP verification reference!
        return successResponse(res, 200, 'OTP sent successfully', {
            sessionId: data.Details
        });
    } catch (error) {
        console.error('OTP Sending Error:', error);
        next(error);
    }
};

exports.verifyOtp = async (req, res, next) => {
    try {
        const { mobile, otp, sessionId } = req.body;

        if (!mobile || !otp || !sessionId) {
            return errorResponse(res, 400, 'Mobile, OTP, and SessionId are required.');
        }

        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey || apiKey === "YOUR_2FACTOR_API_KEY") {
            return errorResponse(res, 500, 'SMS service is temporarily unavailable. Contact administrator.');
        }

        const apiUrl = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;

        const response = await fetch(apiUrl, { method: 'GET' });
        const data = await response.json().catch(() => ({}));

        if (data.Status !== 'Success') {
            // STRICT RULE: Never log OTP entered
            console.error('OTP Verification Failed - Status:', data.Status, 'Details:', data.Details);
            return errorResponse(res, 400, data.Details || 'Invalid OTP.');
        }

        // OTP is valid. Check if user exists.
        const user = await prisma.user.findUnique({
            where: { mobile }
        });

        // Issue secure JWT (HTTPOnly cookie) to maintain session
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
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return successResponse(res, 200, 'OTP verified and session established.', {
                userExists: true,
                user: { id: user.id, name: user.name, role: user.role }
            });
        }

        // If user doesn't exist, they are registering.
        // OTP verified successfully, frontend can proceed with creating account.
        return successResponse(res, 200, 'OTP verified successfully. Ready for registration.', {
            userExists: false
        });

    } catch (error) {
        console.error('OTP Verification System Error');
        next(error);
    }
};
