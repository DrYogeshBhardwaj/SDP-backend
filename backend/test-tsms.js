require('dotenv').config();
const axios = require('axios');

async function test() {
    try {
        const apiKey = process.env.TWO_FACTOR_API_KEY;
        const mobile = '9211755211';
        const otp = '123456';
        
        console.log("Using API Key:", apiKey ? "FOUND" : "MISSING");
        
        // This is the standard 2factor.in route
        const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/${otp}/SDP_OTP_V1`;
        console.log("Calling URL explicitly:", url.replace(apiKey, 'API_KEY'));
        
        const res = await axios.get(url);
        console.log('Success:', res.data);
    } catch(e) {
        console.log('Error:', e.response ? e.response.data : e.message);
    }
}
test();
