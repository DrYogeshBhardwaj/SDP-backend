require('dotenv').config();
const axios = require('axios');

async function testFinalRoute(mobile = '9211755211') {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const template = "MKUNDLI_OTP"; // Standardized template
    
    // Strict standardized endpoint as per User Instructions
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/91${mobile}/AUTOGEN/${template}`;

    console.log(`\nTesting FINAL STANDARDIZED URL: ${url.replace(apiKey, 'HIDDEN')}`);
    try {
        const res = await axios.get(url);
        console.log("Success Response:", JSON.stringify(res.data));
        if (res.data.Details) {
            console.log("SessionId Received:", res.data.Details);
        }
    } catch (err) {
        console.log("Final Route Failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

testFinalRoute();
