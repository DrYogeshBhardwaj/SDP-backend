const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const BASE_URL = 'http://localhost:5000'; // Assuming your backend runs on port 5000

console.log("===================================");
console.log("    SDP OTP Flow Tester (v1)       ");
console.log("===================================");

readline.question('📱 Enter 10-digit mobile number to send OTP: ', async (mobile) => {
    try {
        console.log(`\n⏳ Requesting OTP for ${mobile}...`);

        const sendRes = await fetch(`${BASE_URL}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile })
        });

        const sendData = await sendRes.json();

        if (!sendRes.ok) {
            console.error("❌ Failed to send OTP:", sendData);
            console.log("\n(Did you remember to add your real TWO_FACTOR_API_KEY inside the .env file?)");
            readline.close();
            return;
        }

        console.log("✅ Success! Server Response:", sendData);
        const sessionId = sendData.data.sessionId;

        readline.question('\n💬 Enter the OTP received on your mobile: ', async (otp) => {
            console.log(`\n⏳ Verifying OTP ${otp}...`);

            const verifyRes = await fetch(`${BASE_URL}/api/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, otp, sessionId })
            });

            const verifyData = await verifyRes.json();

            if (!verifyRes.ok) {
                console.error("❌ Failed to verify OTP:", verifyData);
            } else {
                console.log("✅ OTP Verified Successfully!");
                console.log("Server Response:", verifyData);

                if (verifyData.data.userExists) {
                    console.log("\n👉 Result: Existing User. System has issued a JWT Cookie for auto-login.");
                } else {
                    console.log("\n👉 Result: New User. Ready to display frontend registration form.");
                }
            }
            readline.close();
        });

    } catch (err) {
        console.error("Network Error:", err.message);
        readline.close();
    }
});
