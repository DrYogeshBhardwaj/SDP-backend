const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { registerUser } = require('../src/modules/auth/registration.service');

async function manualJoin() {
    try {
        const mobile = '9625645211';
        const sponsorCode = '9211755211'; // Linking to you

        console.log(`Manually joining ${mobile} under ${sponsorCode}...`);

        const user = await registerUser({ mobile, sponsorCode });
        
        // Log the Manual Registration Fee (Bypass)
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: 250,
                type: 'CREDIT',
                category: 'REGISTRATION_FEE',
                description: 'Manual Activation (Admin Bypass)'
            }
        });

        console.log(`Success! Partner ${mobile} is now active under your network.`);
    } catch (err) {
        console.error("Manual Join failed:", err.message);
    } finally {
        await prisma.$disconnect();
    }
}

manualJoin();
