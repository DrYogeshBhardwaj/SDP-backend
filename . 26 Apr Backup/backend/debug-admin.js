const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAdmin() {
    console.log("--- ADMIN DATA DEBUG ---");
    const user = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
    console.log("Admin User:", user ? `${user.mobile} (Role: ${user.role})` : "NOT FOUND");

    const totalUsers = await prisma.user.count();
    const wallets = await prisma.wallet.findMany({ where: { type: 'CASH' } });
    const totalCash = wallets.reduce((acc, w) => acc + w.balance, 0);

    console.log("Stats Check:");
    console.log(`- Total Users: ${totalUsers}`);
    console.log(`- Liquidity: ₹${totalCash}`);

    const allUsers = await prisma.user.findMany({ 
        include: { wallets: true },
        take: 5 
    });
    console.log("Users (First 5):", JSON.stringify(allUsers, null, 2));
}

debugAdmin().finally(() => prisma.$disconnect());
