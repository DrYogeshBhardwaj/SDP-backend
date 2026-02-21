const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = 5000;
const API_URL = `http://localhost:${PORT}/api`;

const req = (method, path, body = null, cookie = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: PORT,
            path: `/api${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (cookie) {
            options.headers['Cookie'] = cookie;
        }

        const request = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                let parsed;
                try {
                    parsed = JSON.parse(data);
                } catch (e) {
                    parsed = data;
                }

                let newCookie = null;
                if (res.headers['set-cookie']) {
                    newCookie = res.headers['set-cookie'][0].split(';')[0];
                }

                resolve({ status: res.statusCode, body: parsed, cookie: newCookie || cookie });
            });
        });

        request.on('error', (e) => reject(e));

        if (body) {
            request.write(JSON.stringify(body));
        }
        request.end();
    });
};

const randomMobile = () => Math.floor(1000000000 + Math.random() * 9000000000).toString();

async function runTest() {
    const logs = [];
    const log = (msg, data = null) => {
        logs.push({ msg, data });
        console.log(msg, data ? '\n' + JSON.stringify(data, null, 2) : '');
    };

    log("Starting Master Admin & Rank Milestone Test...");

    try {
        // --- 1. Registration Phase ---
        const adminMobile = '9999999994'; // Ensure unique for this test

        // Cleanup potential old users for this run
        await prisma.userRank.deleteMany({});
        await prisma.systemLog.deleteMany({});
        await prisma.$executeRaw`DELETE FROM "BonusLedger"`;
        await prisma.$executeRaw`DELETE FROM "Referral"`;
        await prisma.$executeRaw`DELETE FROM "Transaction"`;
        await prisma.$executeRaw`DELETE FROM "WalletCash"`;
        await prisma.$executeRaw`DELETE FROM "WalletMinute"`;
        await prisma.$executeRaw`DELETE FROM "Payout"`;
        await prisma.$executeRaw`DELETE FROM "User" WHERE role != 'ADMIN' AND mobile != ${adminMobile}`;

        log("Database cleaned.");

        // Register Master Admin
        await req('POST', '/auth/register', { mobile: adminMobile, pin: '1234' });
        await prisma.user.update({ where: { mobile: adminMobile }, data: { role: 'ADMIN' } });
        const adminAuth = await req('POST', '/auth/login', { mobile: adminMobile, pin: '1234' });
        const adminCookie = adminAuth.cookie;
        const adminObject = adminAuth.body.data.user;

        log("Master Admin Ready:");

        // Create Seed Referrer (Top Level)
        const seedMobile = '8888888884';
        await req('POST', '/auth/register', { mobile: seedMobile, pin: '1234' });
        const seedAuth = await req('POST', '/auth/login', { mobile: seedMobile, pin: '1234' });

        // Purchase FAMILY to become SEEDER
        const familyProd = await prisma.product.findFirst({ where: { name: 'SDP Family' } });
        await req('POST', '/products/purchase', { product_id: familyProd.id }, seedAuth.cookie);
        await req('POST', '/seeder/activate', {}, seedAuth.cookie);

        // Fetch generated referral code
        const seederUser = await prisma.user.findUnique({ where: { mobile: seedMobile } });
        const seedRef = seederUser.referral_code;

        log(`Top Level Seeder Ready with Ref Code: ${seedRef}`);

        // --- 2. Master Admin Access Tests ---

        // Stats Endpoint
        const statsRes = await req('GET', '/admin/system/stats', null, adminCookie);
        log("System Stats Response:", statsRes.body);

        // Users Endpoint
        const usersRes = await req('GET', '/admin/users', null, adminCookie);
        log("Initial Users List Retrieved");

        // --- 3. Rank Milestone Simulation (Simulate 10 Directs) ---
        log("\nSimulating 10 direct referrals to hit 'Builder' Rank (Requires 10 Directs, ₹300 Bonus)...");

        for (let i = 0; i < 11; i++) {
            const childMobile = randomMobile();
            await req('POST', '/auth/register', { mobile: childMobile, pin: '1234' });
            const childAuth = await req('POST', '/auth/login', { mobile: childMobile, pin: '1234' });

            // Child purchases FAMILY using the Master Seeder's referral code
            const pres = await req('POST', '/products/purchase', { product_id: familyProd.id, referral_code: seedRef }, childAuth.cookie);
            if (!pres || !pres.body.success) {
                log(`Purchase failed for ${childMobile}:`, pres?.body || 'No Res');
            } else {
                process.stdout.write("."); // Progress dot
            }
        }
        log("\n11 Referrals Registered and Purchased.");

        // --- 4. Verification Check ---
        const seedFinal = await prisma.user.findUnique({
            where: { id: seederUser.id },
            include: {
                cash: true,
                ranks: { include: { rank: true } },
                bonus: { where: { type: 'MILESTONE' } },
                targetLogs: { where: { actionType: 'MILESTONE_BONUS' } }
            }
        });

        // 11 Directs * ₹220 = ₹2420 Direct bonus
        // + ₹300 Milestone bonus = ₹2720 Wallet Cash
        log(`\nFinal Validation for Seeder ${seederUser.id}:`);
        log(`Expected Wallet Cash: ₹2720. Actual: ₹${seedFinal.cash.balance}`);
        log(`Ranks Achieved: ${seedFinal.ranks.map(r => r.rank.name).join(', ')}`);

        if (seedFinal.ranks.some(r => r.rank.name === 'Builder')) {
            log("SUCCESS: Builder Rank was correctly awarded.");
        } else {
            log("ERROR: Builder Rank was NOT awarded.");
        }

        if (seedFinal.bonus.length === 1 && seedFinal.bonus[0].amount === 300) {
            log("SUCCESS: BonusLedger entry correctly created exactly once.");
        } else {
            log("ERROR: BonusLedger anomaly:", seedFinal.bonus);
        }

        if (seedFinal.targetLogs.length === 1) {
            log("SUCCESS: SystemLog properly documented the auto-credit.");
        } else {
            log("ERROR: SystemLog anomaly.");
        }

        // --- 5. Block / Unblock Test ---
        log("\nTesting Admin Block/Unblock Target user...");
        await req('POST', `/admin/users/${seederUser.id}/block`, null, adminCookie);

        const blockedUser = await prisma.user.findUnique({ where: { id: seederUser.id } });
        log("Status after Block:", blockedUser.status); // Expect BLOCKED

        await req('POST', `/admin/users/${seederUser.id}/unblock`, null, adminCookie);
        const unblockedUser = await prisma.user.findUnique({ where: { id: seederUser.id } });
        log("Status after Unblock:", unblockedUser.status); // Expect ACTIVE

        // Audit Logs Check
        const recentLogs = await prisma.systemLog.findMany({
            where: { targetUserId: seederUser.id, actionType: { in: ['BLOCK_USER', 'UNBLOCK_USER'] } },
            orderBy: { createdAt: 'desc' }
        });
        log("System Logs generated for Block/Unblock:", recentLogs.map(l => l.actionType));

    } catch (err) {
        log("TEST FAILED WITH EXCEPTION:");
        console.error(err);
        logs.push({ error: err.stack });
    } finally {
        fs.writeFileSync('step6-audit.json', JSON.stringify(logs, null, 2));
        log("\nTests finished. Dumping test suite logs to step6-audit.json");
        process.exit(0);
    }
}

runTest();
