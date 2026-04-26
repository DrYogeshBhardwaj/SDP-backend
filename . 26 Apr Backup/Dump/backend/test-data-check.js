const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({ where: { mobile: '9876543210' } });
    console.log('User 9876543210:', user);

    const products = await prisma.product.findMany();
    console.log('Products:', JSON.stringify(products, null, 2));

    const seeders = await prisma.user.findMany({ where: { role: 'SEEDER' } });
    console.log('Seeders:', seeders.map(s => ({ mobile: s.mobile, code: s.referral_code })));

    await prisma.$disconnect();
}

main();
