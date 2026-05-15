const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getSummary() {
    try {
        const totalUsers = await prisma.user.count();
        const premiumUsers = await prisma.user.count({
            where: { plan: 'PREMIUM' }
        });
        const totalOrders = await prisma.paymentOrder.count();
        const successfulOrders = await prisma.paymentOrder.count({
            where: { status: 'PAID' }
        });

        console.log({
            totalUsers,
            premiumUsers,
            totalOrders,
            successfulOrders
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

getSummary();
