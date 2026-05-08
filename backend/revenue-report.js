const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getRevenueDetails() {
    console.log('--- REVENUE DISBURSEMENT REPORT ---');
    try {
        const transactions = await prisma.transaction.findMany({
            where: {
                category: { in: ['REGISTRATION_FEE', 'PLAN_UPGRADE'] },
                type: 'CREDIT'
            },
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { mobile: true, name: true } } }
        });

        console.log('| Date | Mobile | Name | Amount | Category | Description |');
        console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
        
        let total = 0;
        transactions.forEach(t => {
            const date = t.createdAt.toISOString().split('T')[0];
            const name = t.user ? (t.user.name || '-') : '-';
            const mobile = t.user ? t.user.mobile : '-';
            console.log(`| ${date} | ${mobile} | ${name} | ₹${t.amount} | ${t.category} | ${t.description} |`);
            total += t.amount;
        });

        console.log(`\n**TOTAL REVENUE: ₹${total}**`);

        // Check for missing users in Transactions
        const userIds = transactions.map(t => t.userId);
        const premiumUsers = await prisma.user.findMany({
            where: { plan: 'PREMIUM' }
        });
        
        const missing = premiumUsers.filter(u => !userIds.includes(u.id));
        if (missing.length > 0) {
            console.log('\n--- WARNING: Premium users missing revenue records ---');
            missing.forEach(u => console.log(`- ${u.mobile} (${u.name || '-'})`));
        }

    } catch (error) {
        console.error('Error fetching revenue details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

getRevenueDetails();
