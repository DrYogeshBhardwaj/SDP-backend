const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateToken } = require('./src/utils/jwt');

const baseURL = 'http://localhost:5000/api';

async function runTests() {
    console.log("Starting SDP V1 Verification Tests...");

    // 1. Test OTP Flow (Max attempts)
    console.log("\n--- Testing OTP Flow ---");
    const testMobile = "9999999999";
    try {
        console.log("Sending OTP... (This will fail or mock depending on API KEY)");
        const sendRes = await axios.post(`${baseURL}/send-otp`, { mobile: testMobile }).catch(e => e.response);
        console.log("Send OTP Status:", sendRes.status, sendRes.data?.message || sendRes.data);
        
        // If it successfully stored (even if SMS gateway failed locally, the logic might errorout before storing, let's see)
        // Actually, if SMS API fails, it doesn't store? Wait, it stores THEN sends.
        // Let's test the verify logic for attempts.
        console.log("Attempt 1 (Wrong OTP)...");
        try { await axios.post(`${baseURL}/verify-otp`, { mobile: testMobile, otp: "000000" }); } catch(e) { console.log(e.response?.data?.message); }
        
        console.log("Attempt 2 (Wrong OTP)...");
        try { await axios.post(`${baseURL}/verify-otp`, { mobile: testMobile, otp: "000001" }); } catch(e) { console.log(e.response?.data?.message); }
        
        console.log("Attempt 3 (Wrong OTP)...");
        try { await axios.post(`${baseURL}/verify-otp`, { mobile: testMobile, otp: "000002" }); } catch(e) { console.log(e.response?.data?.message); }
        
        console.log("Attempt 4 (Should be rejected for max attempts)...");
        try { await axios.post(`${baseURL}/verify-otp`, { mobile: testMobile, otp: "000003" }); } catch(e) { console.log(e.response?.data?.message); }

    } catch (e) {
        console.error("OTP Test Failed:", e.message);
    }

    // 2. Admin Details & 3. Manual Payout
    console.log("\n--- Testing Admin Details & Payout ---");
    try {
        // Setup Users
        let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) admin = await prisma.user.create({ data: { mobile: "8888888888", cid: "ADMIN1", role: "ADMIN", pin_hash: "test" }});
        
        let seeder = await prisma.user.findFirst({ where: { role: 'SEEDER' } });
        if (!seeder) seeder = await prisma.user.create({ data: { mobile: "7777777777", cid: "SEED1", role: "SEEDER", pin_hash: "test" }});
        
        // Ensure seeder has balance
        await prisma.walletCash.upsert({
            where: { userId: seeder.id },
            update: { balance: 500, activePayoutId: null },
            create: { userId: seeder.id, balance: 500 }
        });
        
        // Clean pending payouts for seeder
        await prisma.payout.deleteMany({ where: { userId: seeder.id, status: 'PENDING' } });

        const adminToken = generateToken({ userId: admin.id, role: admin.role, cid: admin.cid });
        const seederToken = generateToken({ userId: seeder.id, role: seeder.role, cid: seeder.cid });

        const adminHeaders = { Cookie: `jwt=${adminToken}` };
        const seederHeaders = { Cookie: `jwt=${seederToken}` };

        console.log("Fetching Admin Details for Seeder...");
        const detailsRes = await axios.get(`${baseURL}/admin/users/${seeder.id}/details`, { headers: adminHeaders });
        const userData = detailsRes.data.details || detailsRes.data.data;
        console.log("User Wallet Balance:", userData.wallet);
        console.log("Level 1 Referrals:", userData.network.level1);

        console.log(`\nSeeder requesting payout of ${userData.wallet}...`);
        let payoutReq;
        try {
            payoutReq = await axios.post(`${baseURL}/finance/request-payout`, {}, { headers: seederHeaders });
            console.log("Payout Request Status:", payoutReq.status);
            console.log("Payout Response:", payoutReq.data);
        } catch(e) {
            console.log("Request Error:", e.response?.data?.message || e.message);
        }

        const pendingRes = await axios.get(`${baseURL}/admin/finance/payouts`, { headers: adminHeaders });
        const pending = pendingRes.data.data || pendingRes.data.payouts;
        const testPayout = pending.find(p => p.userId === seeder.id);
        
        if (testPayout) {
            console.log(`Approving Payout ${testPayout.id}...`);
            await axios.post(`${baseURL}/admin/finance/payouts/${testPayout.id}/approve`, { remarks: "Testing" }, { headers: adminHeaders });
            console.log("Payout Approved.");
        }

        // Check Ledger
        const ledgerRes = await axios.get(`${baseURL}/admin/expense/ledger`, { headers: adminHeaders });
        const records = ledgerRes.data.data?.records || ledgerRes.data.records;
        const payoutRecord = records.find(r => r.type.includes("PAYOUT") && parseFloat(r.amount) === -500);
        console.log("Found Payout in Ledger:", !!payoutRecord);
        
        // Check Seeder Balance
        const finalDetails = await axios.get(`${baseURL}/admin/users/${seeder.id}/details`, { headers: adminHeaders });
        const finalUserData = finalDetails.data.details || finalDetails.data.data;
        console.log("Final Seeder Balance:", finalUserData.wallet);

    } catch (e) {
        console.error("Test Failed:", e.response ? e.response.data : e.message);
    }
}
runTests();
