require('dotenv').config();
const axios = require('axios');

async function testForceSMS(mobile = '9211755211') {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const template = "MKUNDLI_OTP";
    const sender = "MKUNDL";
    
    // Attempting to force SMS by adding explicit Sender ID and DLT flags if possible
    // Note: 2Factor V1 Session API usually handles this, but we can try adding parameters
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/91${mobile}/AUTOGEN/${template}`;

    console.log(`\nTesting URL with Standard AUTOGEN Route: ${url.replace(apiKey, 'HIDDEN')}`);
    try {
        const res = await axios.get(url);
        console.log("Response:", JSON.stringify(res.data));
    } catch (err) {
        console.log("Failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

testForceSMS();
