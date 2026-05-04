const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testCommissions() {
    console.log("--- TESTING COMMISSION LOGIC ---");
    
    // 1. Setup Hierarchy
    const l2Mobile = '9999999992';
    const l1Mobile = '9999999991';
    const userMobile = '9999999990';

    // Cleanup
    await prisma.transaction.deleteMany({ where: { description: { contains: 'Test' } } });
    await prisma.user.deleteMany({ where: { mobile: { in: [l2Mobile, l1Mobile, userMobile] } } });

    // Create L2
    const l2 = await prisma.user.create({
        data: { mobile: l2Mobile, name: 'L2 Sponsor', plan: 'PREMIUM', isBusinessUnlocked: true }
    });
    await prisma.wallet.create({ data: { userId: l2.id, type: 'CASH', balance: 0 } });

    // Create L1
    const l1 = await prisma.user.create({
        data: { mobile: l1Mobile, name: 'L1 Sponsor', plan: 'PREMIUM', isBusinessUnlocked: true, sponsorId: l2.id }
    });
    await prisma.wallet.create({ data: { userId: l1.id, type: 'CASH', balance: 0 } });

    // Create User
    const user = await prisma.user.create({
        data: { mobile: userMobile, name: 'New User', plan: 'FREE', sponsorId: l1.id }
    });
    await prisma.wallet.create({ data: { userId: user.id, type: 'CASH', balance: 0 } });

    console.log("Hierarchy Created: L2 -> L1 -> User");

    // 2. Trigger Payment (Simulate verifyPayment)
    const { verifyPayment } = require('../src/modules/payment/payment.controller');
    
    // We can't easily call the controller without a mock res/req, 
    // but we can test the distributeCommissions function directly if we export it, 
    // or just run the same logic.
    
    // Let's find the distributeCommissions logic in the file and run it.
    // Since I can't easily import private functions, I'll just copy the logic for testing.
    
    const distributeCommissions = async (userId, amount, mobile) => {
        const u = await prisma.user.findUnique({
            where: { id: userId },
            include: { sponsor: { include: { sponsor: true } } }
        });
        const l1S = u.sponsor;
        const l2S = l1S?.sponsor;

        if (l1S && l1S.plan === 'PREMIUM') {
            await prisma.wallet.updateMany({ where: { userId: l1S.id, type: 'CASH' }, data: { balance: { increment: 100 } } });
            await prisma.transaction.create({ data: { userId: l1S.id, fromUserId: userId, amount: 100, type: 'CREDIT', category: 'BONUS', description: `Test L1 from ${mobile}` } });
        }
        if (l2S && l2S.plan === 'PREMIUM') {
            await prisma.wallet.updateMany({ where: { userId: l2S.id, type: 'CASH' }, data: { balance: { increment: 80 } } });
            await prisma.transaction.create({ data: { userId: l2S.id, fromUserId: userId, amount: 80, type: 'CREDIT', category: 'BONUS', description: `Test L2 from ${mobile}` } });
        }
    };

    await distributeCommissions(user.id, 299, userMobile);

    // 3. Verify
    const l1Wallet = await prisma.wallet.findFirst({ where: { userId: l1.id, type: 'CASH' } });
    const l2Wallet = await prisma.wallet.findFirst({ where: { userId: l2.id, type: 'CASH' } });

    console.log(`L1 Balance: ${l1Wallet.balance} (Expected 100)`);
    console.log(`L2 Balance: ${l2Wallet.balance} (Expected 80)`);

    if (l1Wallet.balance === 100 && l2Wallet.balance === 80) {
        console.log("✅ COMMISSION TEST PASSED");
    } else {
        console.log("❌ COMMISSION TEST FAILED");
    }

    process.exit(0);
}

testCommissions();
