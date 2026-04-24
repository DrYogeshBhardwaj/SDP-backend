const axios = require('axios');
require('dotenv').config();

async function testKey() {
    const apiKey = process.env.TWO_FACTOR_API_KEY;
    const mobile = '9211755211';

    console.log("--- TESTING 2FACTOR API KEY VALIDITY ---");
    const url = `https://2factor.in/API/V1/${apiKey}/SMS/${mobile}/AUTOGEN`;
    
    try {
        const response = await axios.get(url);
        console.log("Response:", response.data);
    } catch (err) {
        console.log("Error:", err.response ? err.response.data : err.message);
    }
}

testKey();
