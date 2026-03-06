const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

const req = (method, path, body = null, cookie = null) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (cookie) {
            options.headers['Cookie'] = cookie;
        }

        const dataString = body ? JSON.stringify(body) : '';
        if (body) {
            options.headers['Content-Length'] = Buffer.byteLength(dataString);
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
                const setCookieHeader = res.headers['set-cookie'];
                let newCookie = null;
                if (setCookieHeader) {
                    newCookie = setCookieHeader[0].split(';')[0];
                }
                resolve({ status: res.statusCode, body: parsed, cookie: newCookie || cookie });
            });
        });

        request.on('error', (e) => reject(e));
        if (body) request.write(dataString);
        request.end();
    });
};

async function runTest() {
    const logs = [];
    const log = (msg, data = null) => {
        console.log(msg, data ? JSON.stringify(data) : '');
        logs.push({ msg, data });
    };

    log("Starting Payout Engine Test...");

    // 1. Cleanup old test data
    await prisma.transaction.deleteMany();
    await prisma.payout.deleteMany();
    await prisma.bonusLedger.deleteMany();
    await prisma.referral.deleteMany();
    await prisma.walletCash.deleteMany();
    await prisma.walletMinute.deleteMany();
    await prisma.systemLog.deleteMany();

    // Instead of deleteMany() which might fail or wipe too much:
    await prisma.$executeRaw`DELETE FROM "User" WHERE mobile IN ('9999999999', '8888888888')`;

    // 2. Register ADMIN
    let adminReg = await req('POST', '/api/auth/register', { mobile: '9999999999', pin: '1234', name: 'Admin User' });
    log("Admin Reg:", adminReg.body);

    let adminAuth = await req('POST', '/api/auth/login', { mobile: '9999999999', pin: '1234' });
    if (!adminAuth.body.success) {
        log("Admin Failed to Login:", adminAuth.body);
        fs.writeFileSync('test_results.json', JSON.stringify(logs, null, 2));
        process.exit(1);
    }
    const adminUser = adminAuth.body.data.user || adminAuth.body.user;

    // Manually set ADMIN role
    await prisma.user.update({
        where: { id: adminUser.id },
        data: { role: 'ADMIN' }
    });
    log('Created Admin:', adminUser.id);

    // 3. Register SEEDER
    await req('POST', '/api/auth/register', { mobile: '8888888888', pin: '1234', name: 'Test Seeder' });
    let seederAuth = await req('POST', '/api/auth/login', { mobile: '8888888888', pin: '1234' });
    if (!seederAuth.body.success) {
        log("Seeder Failed to Login:", seederAuth.body);
        fs.writeFileSync('test_results.json', JSON.stringify(logs, null, 2));
        process.exit(1);
    }
    const seederUser = seederAuth.body.data.user || seederAuth.body.user;

    // Manually set SEEDER role and give them ₹500 in WalletCash to test the Payout
    await prisma.user.update({
        where: { id: seederUser.id },
        data: { role: 'SEEDER' }
    });
    await prisma.walletCash.update({
        where: { userId: seederUser.id },
        data: { balance: 500 }
    });
    log('Created Seeder:', seederUser.id + ' with ₹500 balance');

    // --- TEST SUITE ---

    // Test 1: Request Payout
    log('\n[Test 1] Requesting Payout of ₹500 for SEEDER...');
    let payoutResp = await req('POST', '/api/finance/request-payout', {}, seederAuth.cookie);
    log('Payout Response:', payoutResp.body);

    const checkBalance1 = await prisma.walletCash.findUnique({ where: { userId: seederUser.id } });
    log(`Expected Wallet Balance (Not Deducted Yet): ₹500, Actual: ₹${checkBalance1.balance}`);

    // Test 2: Double Request Block
    log('\n[Test 2] Attempting second payout request while PENDING...');
    let badPayoutResp = await req('POST', '/api/finance/request-payout', {}, seederAuth.cookie);
    log('Double Request Response:', badPayoutResp.body); // Should be 400 error

    // Test 3: Admin View PENDING
    log('\n[Test 3] Admin fetching pending payouts...');
    let pendingList = await req('GET', '/api/admin/finance/payouts', {}, adminAuth.cookie);
    log(`Found pending payouts:`, pendingList.body.data?.length || 0);

    // Test 4: Admin Reject
    const payoutId = payoutResp.body?.data?.payout_id;
    log('\n[Test 4] Admin Rejecting Payout ID: ' + payoutId);
    let rejectResp = await req('POST', `/api/admin/finance/payouts/${payoutId}/reject`, { remarks: 'Test Rejection' }, adminAuth.cookie);
    log('Reject Response:', rejectResp.body);

    const checkBalance2 = await prisma.walletCash.findUnique({ where: { userId: seederUser.id } });
    log(`Expected Wallet Balance (Still Not Deducted): ₹500, Actual: ₹${checkBalance2.balance}`);

    // Test 5: Re-Request after Reject
    log('\n[Test 5] SEEDER requesting payout again after previous rejection...');
    let newPayoutResp = await req('POST', '/api/finance/request-payout', {}, seederAuth.cookie);
    const newPayoutId = newPayoutResp.body?.data?.payout_id;
    log('New Payout Created ID: ' + newPayoutId);

    // Test 6: Admin Approve
    log('\n[Test 6] Admin Approving Payout ID: ' + newPayoutId);
    let approveResp = await req('POST', `/api/admin/finance/payouts/${newPayoutId}/approve`, {}, adminAuth.cookie);
    log('Approve Response:', approveResp.body);

    const checkBalance3 = await prisma.walletCash.findUnique({ where: { userId: seederUser.id } });
    log(`Expected Wallet Balance (Deducted): ₹0, Actual: ₹${checkBalance3.balance}`);

    const txLogs = await prisma.transaction.findMany({ where: { userId: seederUser.id, type: 'PAYOUT' } });
    log(`Created PAYOUT transactions: ${txLogs.length}`);

    // Test 7: Double Approve/Reject protection
    log('\n[Test 7] Admin attempting to approve an already approved payout...');
    let doubleApproveResp = await req('POST', `/api/admin/finance/payouts/${newPayoutId}/approve`, {}, adminAuth.cookie);
    log('Double Approve Response:', doubleApproveResp.body);

    fs.writeFileSync('test_results.json', JSON.stringify(logs, null, 2));
    log("Test complete. Results saved to test_results.json");
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
