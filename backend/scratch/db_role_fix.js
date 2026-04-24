const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("--- SYSTEMATIC ROLE MIGRATION ---");
    
    try {
        // 1. Add PARTNER to Enum
        await prisma.$executeRaw`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PARTNER'`;
        console.log("Added 'PARTNER' to Role enum.");

        // 2. Update existing data
        const updated = await prisma.$executeRaw`UPDATE "User" SET role = 'PARTNER' WHERE role = 'BASIC'`;
        console.log(`Updated ${updated} users to PARTNER.`);

    } catch (err) {
        console.error("DB Fix Error:", err.message);
    }
    
    await prisma.$disconnect();
}

fix();
