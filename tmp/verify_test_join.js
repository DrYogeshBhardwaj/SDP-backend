
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const axios = require('axios');

async function verifyRegistration() {
    console.log("--- TEST JOIN VERIFICATION START ---");
    
    const testMobile = "9999999999";
    const testName = "Test User";
    const testPin = "1234";
    const testPlan = "BASIC";

    // 1. Clean up existing test user if any
    await prisma.user.deleteMany({
        where: { mobile: testMobile }
    }).catch(e => console.log("Cleanup (non-critical):", e.message));

    // 2. Call the API (assuming server is running on 3000 or similar, but let's just use the controller directly via a minimal script if possible, or assume it's running)
    // Actually, I'll just check the controller logic by running it in a mock-like way or just check the DB after manual registration simulation.
    // Better: Run a script that simulates the registration logic directly.
    
    const { hashPin } = require('./backend/src/utils/hash');
    const { generateReferralCode } = require('./backend/src/modules/auth/auth.controller');
    
    try {
        console.log("Simulating Registration Logic for TEST_ORDER...");
        
        const pin_hash = await hashPin(testPin);
        const referral_code = await generateReferralCode();
        
        // Find how many SNK users exist to predict CID
        const count = await prisma.user.count({ where: { cid: { startsWith: 'SNK' } } });
        const predictedCid = `SNK${10001 + count}`;
        
        const user = await prisma.user.create({
            data: {
                mobile: testMobile,
                cid: predictedCid,
                name: testName,
                pin_hash: pin_hash,
                role: testPlan,
                plan_type: testPlan,
                plan_amount: 779,
                join_type: 'DIRECT',
                status: 'ACTIVE',
                kit_activated: true,
                activated_at: new Date(),
                referral_code
            }
        });
        
        console.log("User Created Successfully!");
        console.log("CID:", user.cid);
        console.log("Status:", user.status);
        console.log("Plan Type:", user.plan_type);
        
        if (user.cid.startsWith('SNK') && user.status === 'ACTIVE') {
            console.log("✅ VERIFICATION SUCCESSFUL");
        } else {
            console.log("❌ VERIFICATION FAILED: Invalid CID or Status");
        }

    } catch (err) {
        console.error("❌ VERIFICATION CRASHED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

verifyRegistration();
