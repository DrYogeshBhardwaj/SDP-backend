const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
    console.log('--- All Users ---');
    const users = await prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log(users.map(u => ({ mobile: u.mobile, plan: u.plan, createdAt: u.createdAt })));

    console.log('\n--- Payment Orders ---');
    const orders = await prisma.paymentOrder.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' }
    });
    console.log(orders);

    const mobiles = ['9711812177', '9319792630'];
    console.log('\n--- Searching for specific mobiles in Payment Orders ---');
    const specificOrders = await prisma.paymentOrder.findMany({
        where: { mobile: { in: mobiles } }
    });
    console.log(specificOrders);

    process.exit(0);
}

checkAll();
