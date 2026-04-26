const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse, errorResponse } = require('../../utils/response');
const axios = require('axios');

/**
 * 2Factor.in OTP Integration (V1 Stable)
 * This is a fallback to avoid DLT/Template mismatch issues.
 */

// SEND OTP (2Factor.in)
const sendOTP = async (req, res) => {
    console.log(">>> OTP API HIT (2FACTOR) <<<");
    try {
        const { mobile } = req.body;
        if (!mobile || mobile.length !== 10) return errorResponse(res, 400, 'Invalid Mobile');

        const apiKey = process.env.TWO_FACTOR_API_KEY;
        // Using AUTOGEN for speed + Template Name (MKUNDLI_OTP)
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN/MKUNDLI_OTP`;

        const response = await axios.get(url);
        console.log("2FACTOR RESPONSE:", response.data);

        if (response.data.Status === "Success") {
            // Details contains the SessionId required for verification
            return successResponse(res, 200, 'OTP sent successfully', { sessionId: response.data.Details });
        } else {
            return errorResponse(res, 400, response.data.Details || 'OTP Send Failed');
        }

    } catch (err) {
        console.error('[2FACTOR_SEND_ERR]', err.response?.data || err.message);
        return errorResponse(res, 500, 'Failed to send OTP (Gateway Error)');
    }
};

// VERIFY OTP (2Factor.in)
const verifyOTP = async (req, res) => {
    try {
        const { sessionId, otp, mobile } = req.body;
        if (!sessionId || !otp) return errorResponse(res, 400, 'SessionId and OTP required');

        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;

        const response = await axios.get(url);
        console.log(`[2FACTOR_VERIFY] Session: ${sessionId}, Response:`, response.data);

        if (response.data.Status === "Success") {
            // Check if user exists for registration/login redirect logic
            // Note: We use the mobile number passed from frontend state
            const user = await prisma.user.findUnique({ where: { mobile } });
            return successResponse(res, 200, 'OTP Verified', { exists: !!user });
        } else {
            return errorResponse(res, 400, response.data.Details || 'Invalid OTP');
        }

    } catch (err) {
        console.error('[2FACTOR_VERIFY_ERR]', err.response?.data || err.message);
        return errorResponse(res, 400, 'Verification failed (OTP Expired or Invalid)');
    }
};

module.exports = { sendOTP, verifyOTP };
