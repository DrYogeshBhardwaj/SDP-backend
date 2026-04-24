const axios = require('axios');
require('dotenv').config();

async function testAll() {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const senderId = process.env.TWO_FACTOR_SENDER_ID;
    const templateName = process.env.TWO_FACTOR_TEMPLATE_ID;
    const peId = process.env.TWO_FACTOR_PE_ID;
    const mobile = '9211755211';
    const otp = '999888';

    const attempts = [
        {
            name: "TSMS GET (Manual String)",
            url: `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS?From=${senderId}&To=${mobile}&TemplateName=${templateName}&VAR1=${otp}&PE_ID=${peId}`
        },
        {
            name: "TSMS POST (Form Data)",
            url: `https://2factor.in/API/V1/${apiKey}/ADDON_SERVICES/SEND/TSMS`,
            method: 'POST',
            data: { From: senderId, To: mobile, TemplateName: templateName, VAR1: otp, PE_ID: peId }
        }
    ];

    for (const attempt of attempts) {
        console.log(`\n--- Attempting: ${attempt.name} ---`);
        try {
            let res;
            if (attempt.method === 'POST') {
                const params = new URLSearchParams();
                for (const k in attempt.data) params.append(k, attempt.data[k]);
                res = await axios.post(attempt.url, params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
            } else {
                res = await axios.get(attempt.url);
            }
            console.log("Response:", res.data);
        } catch (err) {
            console.log("Error:", err.response ? err.response.data : err.message);
        }
    }
}

testAll();
