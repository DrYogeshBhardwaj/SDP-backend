const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
    console.log("--- SINAANK V1 REBIRTH VERIFICATION ---");
    
    // 1. Check User
    const user = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
    if (user) {
        console.log("✅ Main User Found:", user.mobile);
        console.log("✅ Initial Balance:", user.minutesBalance, "minutes");
        console.log("✅ Referral Code:", user.referralCode);
    } else {
        console.log("❌ Main User Not Found");
    }

    // 2. Check Schema Integrity
    const usersCount = await prisma.user.count();
    console.log("✅ Total Users in New DB:", usersCount);

    const ordersCount = await prisma.paymentOrder.count();
    console.log("✅ Total Orders in New DB:", ordersCount);

    console.log("---------------------------------------");
}

verify().finally(() => prisma.$disconnect());
