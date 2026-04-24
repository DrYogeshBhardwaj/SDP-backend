const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const req = (method, path, body, cookie) => new Promise((resolve, reject) => {
    const options = {
        hostname: 'localhost',
        port: 5000,
        path,
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (cookie) options.headers['Cookie'] = cookie;

    const r = http.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                resolve({ status: res.statusCode, body: JSON.parse(data) })
            } catch (e) {
                resolve({ status: res.statusCode, body: data })
            }
        });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
});

async function runTest() {
    console.log("Setting up target user for race condition test...");

    // Create a new seeder user with balance
    const mobile = '9999999999';
    const pin = '1234';

    // Clean up if exists
    await prisma.payout.deleteMany({ where: { user: { mobile } } });
    const existing = await prisma.user.findUnique({ where: { mobile } });
    if (existing) {
        await prisma.walletCash.deleteMany({ where: { userId: existing.id } });
        await prisma.walletMinute.deleteMany({ where: { userId: existing.id } });
        await prisma.referral.deleteMany({ where: { referredUserId: existing.id } });
        await prisma.referral.deleteMany({ where: { referrerId: existing.id } });
        await prisma.transaction.deleteMany({ where: { userId: existing.id } });
        await prisma.userRank.deleteMany({ where: { userId: existing.id } });
        await prisma.systemLog.deleteMany({ where: { targetUserId: existing.id } });
        await prisma.user.delete({ where: { id: existing.id } });
    }

    // Register User
    await req('POST', '/api/auth/register', { mobile, pin, name: 'Stress Test User' });

    // Login -> get cookie
    const loginOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    const cookie = await new Promise((resolve, reject) => {
        const r = http.request(loginOptions, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(res.headers['set-cookie'][0].split(';')[0]));
        });
        r.write(JSON.stringify({ mobile, pin }));
        r.end();
    });

    const user = await prisma.user.findUnique({ where: { mobile } });

    // Manually force user to SEEDER and give them 1000 balance
    await prisma.user.update({
        where: { id: user.id },
        data: { role: 'SEEDER' }
    });

    await prisma.walletCash.upsert({
        where: { userId: user.id },
        update: { balance: 1000 },
        create: { userId: user.id, balance: 1000 }
    });

    console.log("User ready. Balance: 1000. Launching 50 concurrent payout requests...");

    const PARALLEL_REQUESTS = 50;
    const promises = [];

    for (let i = 0; i < PARALLEL_REQUESTS; i++) {
        promises.push(req('POST', '/api/finance/request-payout', {}, cookie).catch(e => ({ status: 500, body: e.message })));
    }

    // Fire them all
    const results = await Promise.all(promises);

    // Count results
    let successCount = 0;
    let idempotentCount = 0;
    let failCount = 0;
    let rateLimitCount = 0;
    let otherCount = 0;

    results.forEach(res => {
        if (res.status === 201) {
            successCount++;
        } else if (res.status === 200 && res.body.data?.note === 'Idempotent success') {
            idempotentCount++;
        } else if (res.status === 429) {
            rateLimitCount++;
        } else if (res.status === 400) {
            console.log("Failed 400:", res.body);
            failCount++;
        } else {
            console.log("Other Status: ", res.status, res.body);
            otherCount++;
        }
    });

    const finalWallet = await prisma.walletCash.findUnique({ where: { userId: user.id } });
    const pendingPayouts = await prisma.payout.count({ where: { userId: user.id, status: 'PENDING' } });
    const lockedId = finalWallet.activePayoutId;

    const resultData = {
        results: {
            created_201: successCount,
            idempotent_200: idempotentCount,
            failed_application_400: failCount,
            rate_limited_429: rateLimitCount,
            other: otherCount
        },
        databaseState: {
            finalWalletBalance: finalWallet.balance,
            pendingPayouts: pendingPayouts,
            lockedId: lockedId
        }
    };

    require('fs').writeFileSync('test-results.json', JSON.stringify(resultData, null, 2));
    if (successCount === 1 && finalWallet.balance === 0 && pendingPayouts === 1) {
        console.log("SUCCESS");
    } else {
        console.log("FAILED");
    }

    await prisma.$disconnect();
}

runTest().catch(console.error);
