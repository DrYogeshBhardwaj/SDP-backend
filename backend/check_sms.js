require('dotenv').config();
const apiKey = process.env.TWO_FACTOR_API_KEY;

async function check() {
    try {
        console.log("Checking 2Factor API Key:", apiKey);
        const res = await fetch(`https://2factor.in/API/V1/${apiKey}/BAL/SMS`);
        const data = await res.json();
        console.log("2Factor API Response:", data);
    } catch (e) {
        console.error("Error:", e);
    }
}
check();
