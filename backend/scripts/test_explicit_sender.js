require('dotenv').config();
const axios = require('axios');

async function testExplicitSender(mobile = '9211755211') {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const template = "MKUNDLI_OTP";
    const sender = "MKUNDL";
    
    // Attempting to force the correct sender ID and DLT parameters
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/91${mobile}/AUTOGEN/${template}?From=${sender}`;

    console.log(`\nTesting URL with MKUNDLI_OTP & FROM=MKUNDL: ${url.replace(apiKey, 'HIDDEN')}`);
    try {
        const res = await axios.get(url);
        console.log("Response:", JSON.stringify(res.data));
    } catch (err) {
        console.log("Failed:", err.response ? JSON.stringify(err.response.data) : err.message);
    }
}

testExplicitSender();
