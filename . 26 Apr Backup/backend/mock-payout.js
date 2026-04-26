const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMockPayout() {
    console.log("--- CREATING MOCK PAYOUT FOR TESTING ---");
    const user = await prisma.user.findUnique({ where: { mobile: '9211755211' } });
    if (!user) {
        console.log("Admin user not found. Please register 9211755211 first.");
        return;
    }

    await prisma.payout.create({
        data: {
            userId: user.id,
            amount: 500,
            status: 'PENDING'
        }
    });

    console.log("✅ Mock Payout of ₹500 created for 9211755211.");
}

createMockPayout().finally(() => prisma.$disconnect());
