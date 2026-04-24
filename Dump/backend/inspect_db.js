const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("--- DB INSPECTION ---");
        
        // 1. Check WalletCash columns
        const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'WalletCash'`;
        console.log("WalletCash Columns:", columns);

        // 2. Check a user
        const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        console.log("Admin user:", admin ? { id: admin.id, mobile: admin.mobile } : "Not found");

        // 3. Check products
        const products = await prisma.product.findMany();
        console.log("Products:", products.map(p => ({ name: p.name, price: p.price })));

    } catch (err) {
        console.error("Inspection failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
