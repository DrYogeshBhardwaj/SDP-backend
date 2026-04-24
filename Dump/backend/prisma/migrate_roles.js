const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Role Migration ---');
  
  try {
    // 1. Update USER_178 to BASIC
    const basicUpdate = await prisma.$executeRaw`UPDATE "User" SET role = 'BASIC' WHERE role::text = 'USER_178'`;
    console.log(`Updated ${basicUpdate} users from USER_178 to BASIC`);

    // 2. Update USER_580 to BUSINESS
    const businessUpdate = await prisma.$executeRaw`UPDATE "User" SET role = 'BUSINESS' WHERE role::text = 'USER_580'`;
    console.log(`Updated ${businessUpdate} users from USER_580 to BUSINESS`);

    console.log('--- Role Migration Completed ---');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
