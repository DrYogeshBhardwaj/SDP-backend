require('dotenv').config({ path: 'c:/SinaankProjects/SDP/backend/.env' });
const { sendOTP } = require('./src/utils/vi_sms');

async function test() {
    try {
        const mobile = '9211755211'; // A test number
        console.log(`[TEST] Sending OTP to ${mobile}...`);
        
        const result = await sendOTP(mobile);
        console.log('[TEST] Result:', result);
    } catch(e) {
        console.error('[TEST] Error:', e.message);
    }
}
test();
