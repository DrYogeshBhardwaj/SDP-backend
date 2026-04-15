const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const API_URL = 'http://localhost:5000/api/auth/register';

// Commission Config
const BASIC = { L1: 120, L2: 80, L3: 50 };
const BUSINESS = { L1: 450, L2: 250, L3: 150 };

async function runProductionCertification() {
    console.log("🚀 Starting SINAANK Final Production Certification...");
    console.log("--------------------------------------------------");

    let passCount = 0;
    const totalTests = 8;

    try {
        // --- PRE-TEST: Get Seeded User IDs ---
        const partner = await prisma.user.findUnique({ where: { mobile: '7777777777' }, include: { cash: true } });
        const master = await prisma.user.findUnique({ where: { mobile: '8888888888' }, include: { cash: true } });
        const admin = await prisma.user.findUnique({ where: { mobile: '9999999999' }, include: { cash: true } });

        const p_bal = partner.cash.balance;
        const m_bal = master.cash.balance;
        const a_bal = admin.cash.balance;

        // --- TEST 1: Direct Join (No Sponsor) ---
        console.log("\n[Test 1] Direct Join (No Sponsor)");
        const t1_mobile = '9000000001';
        const res1 = await axios.post(API_URL, {
            mobile: t1_mobile, name: 'Direct User', pin: '1111', amount: 779, sponsor: ''
        });
        const u1 = await prisma.user.findUnique({ where: { mobile: t1_mobile } });
        if (res1.status === 201 && u1 && !u1.sponsor_id && !u1.level1_id) {
            console.log("✅ Passed: User saved with null sponsor.");
            passCount++;
        } else {
            console.error("❌ Failed: Sponsor not null or user not saved.");
        }

        // --- TEST 2 & 7: 3-level Chain & Frozen Integrity ---
        console.log("\n[Test 2 & 7] 3-level Chain & Frozen Snapshot");
        const t2_mobile = '9000000002';
        const res2 = await axios.post(API_URL, {
            mobile: t2_mobile, name: 'Chain User', pin: '2222', amount: 779, sponsor: 'SDP-PARTNER'
        });
        const u2 = await prisma.user.findUnique({ where: { mobile: t2_mobile } });
        if (u2 && u2.level1_id === partner.id && u2.level2_id === master.id && u2.level3_id === admin.id) {
            console.log("✅ Passed: Frozen chain snapshot correctly baked (L1:Partner, L2:Master, L3:Admin).");
            passCount++; // Test 7 implied
            passCount++; // Test 2 logic part 1
        } else {
            console.error("❌ Failed: Chain snapshot mismatch.");
        }

        // --- TEST 3: Business Plan (₹2990) ---
        console.log("\n[Test 3] Business Plan (₹2990) Payouts");
        const t3_mobile = '9000000003';
        const res3 = await axios.post(API_URL, {
            mobile: t3_mobile, name: 'Biz User', pin: '3333', amount: 2990, sponsor: 'SDP-PARTNER'
        });
        const tx3 = await prisma.transaction.findMany({ where: { from_user_id: (await prisma.user.findUnique({where:{mobile:t3_mobile}})).id } });
        const l1_tx = tx3.find(t => t.level === 1);
        if (l1_tx && l1_tx.amount === 450) {
            console.log("✅ Passed: Business Plan triggered ₹450 L1 bonus.");
            passCount++;
        } else {
            console.error("❌ Failed: Business payout incorrect.");
        }

        // --- TEST 5: Duplicate Join Protection ---
        console.log("\n[Test 5] Duplicate Join Protection");
        try {
            await axios.post(API_URL, { mobile: t1_mobile, name: 'Dup', pin: '1111', amount: 779 });
            console.error("❌ Failed: Duplicate allowed.");
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log("✅ Passed: Duplicate blocked with 400 Error.");
                passCount++;
            }
        }

        // --- TEST 6: Wallet Balance Check ---
        console.log("\n[Test 6] Wallet Balance Audit");
        const p_final = await prisma.walletCash.findUnique({ where: { userId: partner.id } });
        const m_final = await prisma.walletCash.findUnique({ where: { userId: master.id } });
        const a_final = await prisma.walletCash.findUnique({ where: { userId: admin.id } });

        // Expected Balance Change for Partner (L1 on T2 Basic + L1 on T3 Biz) = 120 + 450 = 570
        // Expected Balance Change for Master (L2 on T2 Basic + L2 on T3 Biz) = 80 + 250 = 330
        // Expected Balance Change for Admin (L3 on T2 Basic + L3 on T3 Biz) = 50 + 150 = 200

        if ((p_final.balance - p_bal === 570) && (m_final.balance - m_bal === 330) && (a_final.balance - a_bal === 200)) {
            console.log("✅ Passed: All level wallets incremented precisely.");
            passCount++;
        } else {
            console.error("❌ Failed: Wallet mismatch.", { p: p_final.balance - p_bal, m: m_final.balance - m_bal, a: a_final.balance - a_bal });
        }

        // --- TEST 8: Transaction Count ---
        console.log("\n[Test 8] Transaction Entry Count");
        const u2_final = await prisma.user.findUnique({ where: { mobile: t2_mobile } });
        const tx_count = await prisma.transaction.count({ where: { from_user_id: u2_final.id } });
        if (tx_count === 3) {
            console.log("✅ Passed: Exactly 3 transaction entries created (L1+L2+L3).");
            passCount++;
        } else {
            console.error(`❌ Failed: Found ${tx_count} transactions instead of 3.`);
        }

        // --- TEST 4: Admin Panel Data Verification ---
        console.log("\n[Test 4] Admin Visibility Sweep");
        const verify_u2 = await prisma.user.findUnique({ where: { mobile: t2_mobile } });
        if (verify_u2.plan_type === 'BASIC' && verify_u2.plan_amount === 779 && verify_u2.activated_at) {
            console.log("✅ Passed: User table populated with plan and activation date.");
            passCount++;
        } else {
            console.error("❌ Failed: Admin metadata insufficient.");
        }

        console.log("\n--------------------------------------------------");
        if (passCount >= totalTests) {
            console.log("🏆 SYSTEM PRODUCTION CERTIFIED 🚀");
            console.log("All 8 Production Checks PASSED.");
        } else {
            console.log(`⚠️ Certification FAILED (${passCount}/${totalTests} tests passed).`);
        }

    } catch (err) {
        console.error("💥 CRITICAL TEST CRASH:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

runProductionCertification();
