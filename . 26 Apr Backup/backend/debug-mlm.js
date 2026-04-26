const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const wallets = await prisma.wallet.findMany();
    console.log('Wallets:', JSON.stringify(wallets, null, 2));
    const users = await prisma.user.findMany();
    console.log('Users:', JSON.stringify(users, null, 2));
}

check().finally(() => prisma.$disconnect());
