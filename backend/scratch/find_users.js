const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUsers() {
    console.log('--- Searching for Users ---');
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { mobile: { contains: '9711812177' } },
                { mobile: { contains: '9319792630' } },
                { mobile: { contains: '812177' } }, // partial
                { mobile: { contains: '792630' } }  // partial
            ]
        },
        include: { transactions: true }
    });
    
    console.log('Found Users Count:', users.length);
    console.log(JSON.stringify(users, null, 2));

    process.exit(0);
}

findUsers();
