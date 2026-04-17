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
 * Sends OTP via 2Factor.in using the Transactional SMS (R1 API).
 * This forces SMS delivery and avoids automated voice fallback.
 * 
 * Endpoint: POST https://2factor.in/API/R1/
 * 
 * @param {string} mobile - 10-digit mobile number
 * @returns {Promise<any>} - { Status: "Success", Details: "SessionId" }
 */
const sendOTP = async (mobile) => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const peId = process.env.TWO_FACTOR_PE_ID || "120115915501";
        const templateId = process.env.TWO_FACTOR_TEMPLATE_ID || "1207161520191";
        
        if (!apiKey) throw new Error("TWO_FACTOR_API_KEY is missing in environment.");

        const senderId = process.env.TWO_FACTOR_SENDER_ID || "MKUNDL";
        
        // 1. Generate OTP Manually
        const otp = generateOTP();

        // 2. Prepare Mobile Number
        let fMobile = String(mobile);
        if (!fMobile.startsWith('91') && fMobile.length === 10) {
            fMobile = `91${fMobile}`;
        }

        // 3. Store OTP locally (5 minute expiry)
        const expiresAt = Date.now() + 5 * 60 * 1000;
        otpStorage.set(mobile, { otp, expiresAt });

        // 4. Construct the EXACT DLT-Approved Message String
        // Actual Template: "Your MKUNDLI OTP is {#var#}. It is valid for 5 minutes. -MKUNDLI"
        const message = `Your MKUNDLI OTP is ${otp}. It is valid for 5 minutes. -MKUNDLI`;

        // 5. Use the Bare Metal TSMS API (No Var1, sends raw string)
        const url = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`;
        const payload = {
            From: senderId,
            To: fMobile,
            Msg: message,
            EntityID: peId,
            TemplateID: templateId
        };
        
        console.log(`[TSMS] Sending Raw SMS to ${fMobile}... Content: "${message}"`);

        const response = await axios.post(url, payload);
        
        if (response.data && response.data.Status === 'Success') {
            console.log(`[TSMS] Success! UUID: ${response.data.Details}`);
            return { Status: 'Success', Details: mobile };
        } else {
            console.warn("[TSMS] Failed to send:", response.data);
            return response.data;
        }
    } catch (error) {
        console.error("[TSMS] 2Factor Error:", error.response ? error.response.data : error.message);
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
