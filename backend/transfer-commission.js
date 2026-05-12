const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function transferCommission() {
    const fromSponsorMobile = '8851168290';
    const toSponsorMobile = '9210021221';
    const amount = 100; // Level 1 Commission

    console.log(`Transferring ₹${amount} commission from ${fromSponsorMobile} to ${toSponsorMobile}...`);

    try {
        const fromSponsor = await prisma.user.findUnique({ where: { mobile: fromSponsorMobile } });
        const toSponsor = await prisma.user.findUnique({ where: { mobile: toSponsorMobile } });

        if (!fromSponsor || !toSponsor) {
            console.error('One or both sponsors not found!');
            return;
        }

        // 1. Deduct from old sponsor
        await prisma.wallet.updateMany({
            where: { userId: fromSponsor.id, type: 'CASH' },
            data: { balance: { decrement: amount } }
        });

        await prisma.transaction.create({
            data: {
                userId: fromSponsor.id,
                amount: amount,
                type: 'DEBIT',
                category: 'BONUS',
                description: `Commission Reversal (Transferred to ${toSponsorMobile})`
            }
        });

        // 2. Add to new sponsor
        await prisma.wallet.updateMany({
            where: { userId: toSponsor.id, type: 'CASH' },
            data: { balance: { increment: amount } }
        });

        await prisma.transaction.create({
            data: {
                userId: toSponsor.id,
                amount: amount,
                type: 'CREDIT',
                category: 'BONUS',
                description: `Commission Transfer (From ${fromSponsorMobile}) for user 9953869409`
            }
        });

        console.log('Transfer Complete!');

    } catch (e) {
        console.error('Transfer failed:', e);
    } finally {
        await prisma.$disconnect();
    }
}

transferCommission();
