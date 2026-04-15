require('dotenv').config();
const axios = require('axios');

const { sendOTP, verifyOTP } = require('../src/utils/vi_sms');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

async function debug2Factor(mobile = '9268646792') {
    try {
        console.log(`Step 1: Sending OTP to ${mobile}...`);
        const sendResult = await sendOTP(mobile);
        
        if (sendResult.Status !== 'Success') {
            console.error("Failed to send OTP:", sendResult);
            process.exit(1);
        }

        const sessionId = sendResult.Details;
        console.log(`OTP Sent! Session ID: ${sessionId}`);

        readline.question('Enter OTP received on mobile: ', async (otp) => {
            console.log(`Step 2: Verifying OTP ${otp}...`);
            const verifyResult = await verifyOTP(sessionId, otp);
            
            if (verifyResult.Status === 'Success' && verifyResult.Details === 'OTP Matched') {
                console.log("✅ Verification Successful!");
            } else {
                console.log("❌ Verification Failed:", verifyResult);
            }
            readline.close();
        });

    } catch (error) {
        console.error("Error:", error.message);
        readline.close();
    }
}

const targetMobile = process.argv[2] || '9268646792';
debug2Factor(targetMobile);
