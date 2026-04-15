const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const allRanks = await prisma.rankConfig.findMany();
    console.log('--- ALL RANK CONFIG ENTRIES ---');
    console.log(JSON.stringify(allRanks, null, 2));

    await prisma.$disconnect();
}

main();
