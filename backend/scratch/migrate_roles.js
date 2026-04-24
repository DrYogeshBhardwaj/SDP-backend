const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrate() {
    console.log("--- MIGRATING ROLES: BASIC -> PARTNER ---");
    
    try {
        // Since we changed the enum in schema.prisma, we might need a raw query to update existing data
        // before Prisma Client can safely interact with the new enum if it's strictly enforced.
        
        // Update all users with role 'BASIC' to 'PARTNER'
        // Using raw query to bypass enum validation if Prisma Client is already updated to 'PARTNER'
        const result = await prisma.$executeRaw`UPDATE "User" SET role = 'PARTNER' WHERE role = 'BASIC'`;
        
        console.log(`Successfully migrated ${result} users to 'PARTNER' role.`);
    } catch (err) {
        console.error("Migration failed (maybe already updated or enum mismatch):", err.message);
    }
    
    await prisma.$disconnect();
}

migrate();
