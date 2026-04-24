require('dotenv').config();
const axios = require('axios');

async function testMKUNDLI(mobile = '9211755211') {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const template = "MKUNDLI_OTP";
    
    // Testing with standard URL
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN/${template}`;

    console.log(`\nTesting URL: ${url.replace(apiKey, 'HIDDEN')}`);
    try {
        const res = await axios.get(url);
        console.log("Success:", JSON.stringify(res.data));
    } catch (err) {
        console.log("Failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

testMKUNDLI();
