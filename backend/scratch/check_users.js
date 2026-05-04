const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    const mobiles = ['9711812177', '9319792630'];
    for (const mobile of mobiles) {
        console.log(`\n--- Checking ${mobile} ---`);
        const user = await prisma.user.findUnique({
            where: { mobile },
            include: { transactions: true }
        });
        if (user) {
            console.log('User Found:', {
                id: user.id,
                name: user.name,
                plan: user.plan,
                isPaid: user.isPaid,
                isBusinessUnlocked: user.isBusinessUnlocked,
                minutesBalance: user.minutesBalance
            });
            console.log('Transactions:', user.transactions.map(t => ({
                amount: t.amount,
                type: t.type,
                category: t.category,
                description: t.description,
                createdAt: t.createdAt
            })));
        } else {
            console.log('User not found');
        }
    }
    
    // Also check Whosole/Balance mentioned by user
    // The user said "wh-control.html ke Whosole me abhi bhi 1000 dikha raha hai"
    // I need to find where this 1000 comes from.
    // Usually "Whosole" might refer to a system-wide balance or a specific admin user balance.
    
    process.exit(0);
}

checkUsers();
