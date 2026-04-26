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
                minutesBalance: 20,
                isBusinessUnlocked: false,
                goalLockUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days lock default
            }
        });

        // 4. Initialize Wallets
        await tx.wallet.create({ data: { userId: user.id, type: 'CASH', balance: 0 } });
        await tx.wallet.create({ data: { userId: user.id, type: 'MINUTE', balance: 20 } });

        // NOTE: MLM Commission is now handled in the Payment Upgrade flow (₹299)
        // Experience First -> Earn After Upgrade
        
        return user;

        return user;
    });
};

module.exports = { registerUser };
