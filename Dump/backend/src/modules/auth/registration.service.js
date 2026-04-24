const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Registration Service (V1 Clean Slate)
 * Handles atomic user creation, wallet initialization, and MLM commission distribution.
 */

const registerUser = async ({ mobile, sponsorCode }) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Check existing
        const existing = await tx.user.findUnique({ where: { mobile } });
        if (existing) throw new Error('ALREADY_EXISTS');

        // 2. Resolve Sponsor
        let sponsorId = null;
        if (sponsorCode) {
            const sponsor = await tx.user.findFirst({
                where: { OR: [{ mobile: sponsorCode }, { referral_code: sponsorCode }] }
            });
            if (sponsor) sponsorId = sponsor.id;
        }

        // 3. Create User
        const user = await tx.user.create({
            data: {
                mobile,
                pin_hash: 'MOCKED', // V1 uses OTP only for now
                cid: 'CID_' + Date.now(),
                role: 'BASIC',
                status: 'ACTIVE',
                referral_code: 'REF-' + mobile,
                sponsor_id: sponsorId,
                v1_minutes_balance: 3600,
                plan_type: 'V1-250',
                plan_amount: 250,
                activated_at: new Date()
            }
        });

        // 4. Initialize Wallets
        await tx.walletCash.create({ data: { userId: user.id, balance: 0 } });
        await tx.walletMinute.create({ data: { userId: user.id, balance: 3600 } });

        // 5. MLM Commission Distribution (₹100 / ₹80)
        if (sponsorId) {
            // Level 1: ₹100
            await tx.walletCash.update({
                where: { userId: sponsorId },
                data: { balance: { increment: 100 } }
            });
            await tx.transaction.create({
                data: {
                    userId: sponsorId,
                    amount: 100,
                    credit: 100,
                    type: 'BONUS',
                    txStatus: 'APPROVED',
                    description: `Direct Commission from ${mobile}`
                }
            });

            // Level 2 (Sponsor's Sponsor): ₹80
            const sponsorObj = await tx.user.findUnique({ where: { id: sponsorId } });
            if (sponsorObj && sponsorObj.sponsor_id) {
                await tx.walletCash.update({
                    where: { userId: sponsorObj.sponsor_id },
                    data: { balance: { increment: 80 } }
                });
                await tx.transaction.create({
                    data: {
                        userId: sponsorObj.sponsor_id,
                        amount: 80,
                        credit: 80,
                        type: 'BONUS',
                        txStatus: 'APPROVED',
                        description: `Team Commission from ${mobile}`
                    }
                });
            }
        }

        return user;
    });
};

module.exports = {
    registerUser
};
