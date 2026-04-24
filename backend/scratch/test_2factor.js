const axios = require('axios');
require('dotenv').config();

async function test() {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const senderId = process.env.TWO_FACTOR_SENDER_ID;
    const templateName = process.env.TWO_FACTOR_TEMPLATE_ID;
    const peId = process.env.TWO_FACTOR_PE_ID;
    const mobile = '9211755211';
    const otp = '123456';

    console.log("--- TESTING 2FACTOR API WITH HARDCODED URL ---");
    const smsUrl = `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS?From=${senderId}&To=${mobile}&TemplateName=${templateName}&VAR1=${otp}&PE_ID=${peId}`;
    
    console.log("URL:", smsUrl.replace(apiKey, 'REDACTED'));

    try {
        const response = await axios.get(smsUrl);
        console.log("Response:", response.data);
    } catch (err) {
        console.error("Error:", err.response ? err.response.data : err.message);
    }
}

test();
