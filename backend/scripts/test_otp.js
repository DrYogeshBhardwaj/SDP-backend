const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');

async function testOtpFlow(mobile) {
    console.log(`--- Testing OTP Flow for ${mobile} ---`);
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    console.log(`Using API Key: ${apiKey ? 'FOUND' : 'MISSING'}`);

    try {
        // 1. Request OTP
        console.log("\n1. Requesting OTP...");
        const sendRes = await axios.post('http://localhost:5000/api/auth/send-otp', { mobile });
        console.log("Send Response:", sendRes.data);

        if (sendRes.data.success) {
            console.log("\nCheck your mobile for the OTP.");
            // In a real test, we'd wait for user input. For a script, we'll stop here or mock verify if we knew the OTP.
            // Since OTP is in-memory on the server, we can't easily "know" it here unless we log it on server.
            console.log("\nPlease check server logs for the generated OTP and verify manually via UI or another script.");
        }
    } catch (error) {
        console.error("Test Failed:", error.response ? error.response.data : error.message);
    }
}

// Pass mobile as argument or use default
const targetMobile = process.argv[2] || '9268646792';
testOtpFlow(targetMobile);
