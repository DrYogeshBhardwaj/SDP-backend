const axios = require('axios');

/**
 * Sends OTP via 2Factor.in using the Session OTP API (API/V1).
 * 2Factor generates the OTP on their side and sends it via text.
 * @param {string} mobile - 10-digit mobile number
 * @returns {Promise<any>} - { Status: "Success", Details: "SessionId" }
 */
const sendOTP = async (mobile) => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) throw new Error("TWO_FACTOR_API_KEY is missing in environment.");

        // Ensure 91 prefix for 2Factor
        let fMobile = String(mobile);
        if (!fMobile.startsWith('91')) {
            fMobile = `91${fMobile}`;
        }

        // DLT Compliance Parameters
        const template = process.env.TWO_FACTOR_TEMPLATE || "SINAANK_OTP";
        const senderId = process.env.TWO_FACTOR_SENDER_ID || "MKUNDL";
        const templateId = process.env.TWO_FACTOR_TEMPLATE_ID;
        const peId = process.env.TWO_FACTOR_PE_ID;

        // Base URL
        let url = `https://2factor.in/API/V1/${apiKey}/SMS/${fMobile}/AUTOGEN/${template}?sender=${senderId}`;

        // Append DLT IDs if available
        if (templateId) url += `&template_id=${templateId}`;
        if (peId) url += `&pe_id=${peId}`;

        console.log(`[SMS] Sending DLT OTP to ${mobile} (Sender: ${senderId}, TemplateId: ${templateId})`);
        
        const response = await axios.get(url);
        
        if (response.data && response.data.Status === 'Success') {
            console.log(`[SMS] Success! SessionId: ${response.data.Details}`);
        } else {
            console.warn("[SMS] Failed to send:", response.data);
        }

        return response.data;
    } catch (error) {
        console.error("[SMS] 2Factor Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

/**
 * Verifies OTP via 2Factor.in Session API.
 * @param {string} sessionId - Session ID returned by sendOTP
 * @param {string} otp - User entered OTP
 * @returns {Promise<any>} - { Status: "Success", Details: "OTP Matched" }
 */
const verifyOTP = async (sessionId, otp) => {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        if (!apiKey) throw new Error("TWO_FACTOR_API_KEY is missing in environment.");

        const url = `https://2factor.in/API/V1/${apiKey}/SMS/VERIFY/${sessionId}/${otp}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("2Factor Verify API Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};

module.exports = {
    sendOTP,
    verifyOTP
};
