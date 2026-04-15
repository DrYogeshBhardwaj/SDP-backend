require('dotenv').config();
const axios = require('axios');

async function test() {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const mobile = '9211755211';
        const otp = '123456';
        
        console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");
        
        // Strictly using ONLY this endpoint:
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN/MKUNDLI_OTP`;
        console.log("Calling URL explicitly:", url.replace(apiKey, 'API_KEY'));
        
        const res = await axios.get(url);
        console.log('Success Response:', res.data);
    } catch(e) {
        console.log('Error:', e.response ? e.response.data : e.message);
    }
}
test();
