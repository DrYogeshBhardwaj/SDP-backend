const axios = require('axios');

// In-memory OTP storage: mobile -> { otp, expiresAt }
const otpStorage = new Map();

/**
 * Generates a random 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends OTP via 2Factor.in using the STRICT Positional DLT Template API.
 * This ensures the message matches your registered template EXACTLY.
 * 
 * Format: https://2factor.in/API/V1/{API_KEY}/SMS/{MOBILE}/{OTP}/{TEMPLATE_NAME}
 * 
 * @param {string} mobile - 10-digit mobile number
 * @returns {Promise<any>} - { Status: "Success", Details: "SessionId" }
 */
const sendOTP = async (mobile) => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) throw new Error("TWO_FACTOR_API_KEY is missing in environment.");

        // DLT Template Name (MUST be exactly as shown in 2Factor Dashboard)
        const templateName = process.env.TWO_FACTOR_TEMPLATE || "SINAANK_OTP";

        // 1. Generate OTP Manually
        const otp = generateOTP();

        // 2. Prepare Mobile Number
        let fMobile = String(mobile);
        if (!fMobile.startsWith('91')) {
            fMobile = `91${fMobile}`;
        }

        // 3. Store OTP locally (5 minute expiry)
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStorage.set(mobile, { otp, expiresAt });

        // 4. DLT Compliant URL (Using Option 1: SMS/{MOBILE}/{OTP})
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${fMobile}/${otp}`;

        // Mandatory Log (Masking API Key)
        const logUrl = url.replace(apiKey, "HIDDEN_KEY");
        console.log(`OTP URL: ${logUrl}`);

        const response = await axios.get(url);
        
        if (response.data && response.data.Status === 'Success') {
            console.log(`[SMS] Success! Delivery UUID: ${response.data.Details}`);
            return { Status: 'Success', Details: mobile };
        } else {
            console.warn("[SMS] Failed to send:", response.data);
            return response.data;
        }
    } catch (error) {
        console.error("[SMS] 2Factor Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Verifies OTP by checking the local in-memory storage.
 * @param {string} mobile - Mobile number used as SessionId
 * @param {string} otp - User entered OTP
 * @returns {Promise<any>} - { Status: "Success", Details: "OTP Matched" }
 */
const verifyOTP = async (mobile, otp) => {
    const record = otpStorage.get(mobile);

    if (!record) {
        return { Status: "Error", Details: "No OTP session found" };
    }

    if (Date.now() > record.expiresAt) {
        otpStorage.delete(mobile);
        return { Status: "Error", Details: "OTP expired" };
    }

    if (record.otp === otp) {
        otpStorage.delete(mobile); // Clear after success
        return { Status: "Success", Details: "OTP Matched" };
    }

    return { Status: "Error", Details: "OTP mismatch" };
};

module.exports = {
    sendOTP,
    verifyOTP
};
