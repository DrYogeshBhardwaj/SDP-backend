const { generateReferralCode } = require('../src/utils/referral');

console.log("Starting Referral Code Stress Test...");
const codes = new Set();
const total = 10000;
let collisions = 0;

for (let i = 0; i < total; i++) {
    const code = generateReferralCode();
    if (codes.has(code)) {
        collisions++;
    }
    codes.add(code);
    
    // Check format (SIN-XXXXXX)
    if (!/^SIN-[0-9A-F]{6}$/.test(code)) {
        console.error(`Invalid Code Format Detected: ${code}`);
        process.exit(1);
    }
}

console.log(`Test Complete!`);
console.log(`Total Codes Generated: ${total}`);
console.log(`Collisions: ${collisions}`);
console.log(`Format Verification: PASSED`);

if (collisions === 0) {
    console.log("Entropy check: Excellent.");
} else {
    console.warn("Collision detected. Ensure the retry loop is active in the service.");
}
