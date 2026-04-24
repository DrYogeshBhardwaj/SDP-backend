const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
    try {
        console.log("=== FINAL E2E VALIDATION START ===");

        // Setup Admin
        let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        if (!admin) {
            admin = await prisma.user.create({
                data: { name: 'Admin', mobile: '0000000000', pin_hash: await bcrypt.hash('0000', 10), role: 'ADMIN', cid: 'ADM_00' }
            });
            console.log("Admin user created.");
        }

        const product580 = await prisma.product.findFirst({ where: { price: 580 } });

        // Step 4: Register USER_580
        console.log("\n4. Registering USER_580 (Future Seeder)");
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Seeder Master', mobile: '8888888888', pin: '1234' })
        });

        let seederLogin = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '8888888888', pin: '1234' })
        });
        let seederHeaders = seederLogin.headers.get('set-cookie');

        // Step 5: Activate Seeder
        console.log("5. Activating Seeder (Purchasing Family Plan)");
        await fetch('http://localhost:5000/api/products/purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': seederHeaders },
            body: JSON.stringify({ product_id: product580.id, transactionId: 'TXN_SEEDER' })
        });

        // Activate Seeder Profile
        await fetch('http://localhost:5000/api/seeder/activate', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': seederHeaders }
        });

        const seeder = await prisma.user.findUnique({ where: { mobile: '8888888888' } });
        console.log(`Seeder referral code: ${seeder.referral_code}`);

        // Step 6 & 7: Create L1 & L2 and trigger bonuses
        console.log("\n6 & 7. Creating Referrals & Triggering Bonuses");
        // L1
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Level 1', mobile: '7777777777', pin: '1234', referredBy: seeder.referral_code })
        });

        let l1Login = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '7777777777', pin: '1234' })
        });
        let l1Headers = l1Login.headers.get('set-cookie');

        await fetch('http://localhost:5000/api/products/purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': l1Headers },
            body: JSON.stringify({ product_id: product580.id, transactionId: 'TXN_L1', referral_code: seeder.referral_code })
        });

        // Activate L1 as Seeder so L2 can use their referral code
        await fetch('http://localhost:5000/api/seeder/activate', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': l1Headers }
        });

        const l1 = await prisma.user.findUnique({ where: { mobile: '7777777777' } });

        // L2
        await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Level 2', mobile: '6666666666', pin: '1234', referredBy: l1.referral_code })
        });

        let l2Login = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '6666666666', pin: '1234' })
        });
        let l2Headers = l2Login.headers.get('set-cookie');

        await fetch('http://localhost:5000/api/products/purchase', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': l2Headers },
            body: JSON.stringify({ product_id: product580.id, transactionId: 'TXN_L2', referral_code: l1.referral_code })
        });

        const updatedSeeder = await prisma.user.findUnique({ where: { id: seeder.id }, include: { cash: true, bonus: true } });
        console.log(`Seeder Wallet Balance: Rs ${updatedSeeder.cash.balance}`);
        console.log(`Seeder Total Bonuses Received: ${updatedSeeder.bonus.length}`);

        // Step 8: Request Payout
        console.log("\n8. Requesting Payout (Rs 200)");
        let payoutRes = await fetch('http://localhost:5000/api/finance/request-payout', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': seederHeaders },
            body: JSON.stringify({ amount: 200 })
        });
        console.log("Payout request response:", await payoutRes.json());

        let payoutReq = await prisma.payout.findFirst({ where: { userId: seeder.id, status: 'PENDING' } });

        // Step 9: Approve Payout as Admin
        console.log("\n9. Approving Payout as Admin");
        let aLogin = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '0000000000', pin: '0000' })
        });
        let aHeaders = aLogin.headers.get('set-cookie');

        await fetch(`http://localhost:5000/api/admin/payouts/${payoutReq.id}/approve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Cookie': aHeaders }
        });

        const finalSeeder = await prisma.user.findUnique({ where: { id: seeder.id }, include: { cash: true } });
        console.log(`Final Seeder Wallet Balance: Rs ${finalSeeder.cash.balance}`);

        // Step 10: Export CSV
        console.log("\n10. Exporting CSVs");
        const usersCsv = await fetch(`http://localhost:5000/api/admin/export/users`, { headers: { 'Cookie': aHeaders } });
        console.log(`Users CSV size: ${(await usersCsv.text()).length} characters`);
        const payoutsCsv = await fetch(`http://localhost:5000/api/admin/export/payouts`, { headers: { 'Cookie': aHeaders } });
        console.log(`Payouts CSV size: ${(await payoutsCsv.text()).length} characters`);

        console.log("\n=== FINAL E2E VALIDATION COMPLETE ===");

    } catch (err) {
        console.error("End-to-end flow failed!", err);
    }
})();
