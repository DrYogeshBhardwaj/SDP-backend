const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { hashPin } = require('./utils/hash');
const { generateToken } = require('./utils/jwt');

async function testAtomicRegistrationDirectly() {
    console.log('--- START DIRECT DB TEST ---');
    const mobile = '9876543219'; // Completely unique
    const name = 'Direct Test User';
    const pin = '1234';
    const amount = 779;
    const sponsorCode = 'SDP-PARTNER';

    try {
        // 1. Identify Sponsors
        const l1Sponsor = await prisma.user.findFirst({
            where: { OR: [{ referral_code: sponsorCode }, { mobile: sponsorCode }] }
        });
        let l2Id = null, l3Id = null;
        if (l1Sponsor) {
            l2Id = l1Sponsor.level1_id;
            l3Id = l1Sponsor.level2_id;
        }

        const referral_code = 'SDP-TEST-UNIT';
        const cid = mobile;
        const pin_hash = await hashPin(pin);
        const COMMISSIONS = { BASIC: { L1: 120, L2: 80, L3: 50 }, BUSINESS: { L1: 450, L2: 250, L3: 150 } };
        const plan_type = amount >= 2900 ? 'BUSINESS' : 'BASIC';
        const role = plan_type;
        const comms = COMMISSIONS[plan_type];

        console.log('Executing Transaction...');
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    mobile, cid, name, pin_hash, role,
                    plan_type, plan_amount: amount,
                    status: 'ACTIVE', kit_activated: true,
                    activated_at: new Date(),
                    referral_code,
                    sponsor_id: l1Sponsor ? l1Sponsor.id : null,
                    level1_id: l1Sponsor ? l1Sponsor.id : null,
                    level2_id: l2Id,
                    level3_id: l3Id
                }
            });
            await tx.walletCash.create({ data: { userId: user.id } });
            await tx.walletMinute.create({ data: { userId: user.id, balance: 3650 } });

            const sponsors = [
                { id: l1Sponsor ? l1Sponsor.id : null, amount: comms.L1, level: 1 },
                { id: l2Id, amount: comms.L2, level: 2 },
                { id: l3Id, amount: comms.L3, level: 3 }
            ];

            for (const sp of sponsors) {
                if (sp.id) {
                    await tx.walletCash.update({ where: { userId: sp.id }, data: { balance: { increment: sp.amount } } });
                    await tx.transaction.create({
                        data: {
                            userId: sp.id, from_user_id: user.id, level: sp.level, amount: sp.amount, credit: sp.amount,
                            plan_type, plan_amount: amount, type: 'BONUS', description: 'Join Bonus', txStatus: 'COMPLETED'
                        }
                    });
                    await tx.bonusLedger.create({
                        data: {
                            userId: sp.id, sourceUserId: user.id, level: sp.level, amount: sp.amount,
                            plan: plan_type, type: `JOIN_BONUS_L${sp.level}`, incomeStatus: 'PAID'
                        }
                    });
                }
            }
            return user;
        });

        console.log('✅ Transaction Committed! User ID:', result.id);

        // IMMEDIATE VERIFICATION
        const verify = await prisma.user.findUnique({ where: { mobile } });
        if (verify) {
            console.log('✅ VERIFIED: User found in DB after commit!');
            console.log('Mobile:', verify.mobile);
            console.log('L1 Snapshot:', verify.level1_id);
        } else {
            console.error('❌ FAILURE: User NOT FOUND even after direct commit!');
        }

    } catch (e) {
        console.error('❌ CRASH:', e);
    } finally {
        await prisma.$disconnect();
    }
}

testAtomicRegistrationDirectly();
