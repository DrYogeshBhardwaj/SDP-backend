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

        const template = "MKUNDLI_OTP";
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${fMobile}/AUTOGEN/${template}`;

        console.log(`Sending OTP via 2Factor: ${url}`);
        const response = await axios.get(url);
        console.log("2Factor API Response:", response.data);
        
        if (response.data && response.data.Details) {
            console.log("Check if SessionId is coming:", response.data.Details);
        } else {
            console.warn("2Factor Response missing SessionId (Details):", response.data);
        }

        return response.data;
    } catch (error) {
        console.error("2Factor Send API Error:", error.response ? error.response.data : error.message);
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
