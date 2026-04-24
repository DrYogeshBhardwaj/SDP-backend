const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateReferralCode } = require('../../utils/referral');

/**
 * V1 Registration Service (Clean Slate)
 */
const registerUser = async ({ mobile, sponsorCode, name, upiId }) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Existing Check
        const existing = await tx.user.findUnique({ where: { mobile } });
        if (existing) throw new Error('ALREADY_EXISTS');

        // 2. Resolve Sponsor
        let sponsorId = null;
        if (sponsorCode) {
            const normalizedSponsorCode = sponsorCode.toUpperCase();
            const sponsor = await tx.user.findFirst({
                where: { OR: [
                    { mobile: sponsorCode }, 
                    { referralCode: normalizedSponsorCode },
                    { referralCode: sponsorCode } // Fallback for old codes that might not be uppercase
                ]}
            });
            if (sponsor) sponsorId = sponsor.id;
        }

        // 2.5 Generate Unique Referral Code
        let referralCode;
        let isUnique = false;
        while (!isUnique) {
            referralCode = generateReferralCode();
            const existingCode = await tx.user.findUnique({ where: { referralCode } });
            if (!existingCode) isUnique = true;
        }

        // 3. Create User
        const user = await tx.user.create({
            data: {
                mobile,
                name,
                upiId,
                role: 'PARTNER',
                referralCode,
                sponsorId,
                minutesBalance: 3600,
                goalLockUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days lock default
            }
        });

        // 4. Initialize Wallets
        await tx.wallet.create({ data: { userId: user.id, type: 'CASH', balance: 0 } });
        await tx.wallet.create({ data: { userId: user.id, type: 'MINUTE', balance: 3600 } });

        // 5. MLM Commission Distribution (₹100 / ₹80)
        if (sponsorId) {
            // Level 1: ₹100
            await tx.wallet.updateMany({
                where: { userId: sponsorId, type: 'CASH' },
                data: { balance: { increment: 100 } }
            });
            await tx.transaction.create({
                data: {
                    userId: sponsorId,
                    amount: 100,
                    type: 'CREDIT',
                    category: 'BONUS',
                    description: `Direct Comm from ${mobile}`
                }
            });

            // Level 2 (Sponsor's Sponsor): ₹80
            const sponsorObj = await tx.user.findUnique({ where: { id: sponsorId } });
            if (sponsorObj && sponsorObj.sponsorId) {
                await tx.wallet.updateMany({
                    where: { userId: sponsorObj.sponsorId, type: 'CASH' },
                    data: { balance: { increment: 80 } }
                });
                await tx.transaction.create({
                    data: {
                        userId: sponsorObj.sponsorId,
                        amount: 80,
                        type: 'CREDIT',
                        category: 'BONUS',
                        description: `Team Comm from ${mobile}`
                    }
                });
            }
        }

        return user;
    });
};

module.exports = { registerUser };
