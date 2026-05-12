const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit(applyFix = false) {
    console.log(`\n--- SINAANK SYSTEM AUDIT: ${new Date().toISOString()} ---`);
    console.log(`Mode: ${applyFix ? 'APPLY FIXES' : 'DRY RUN (Log Only)'}\n`);

    try {
        // 1. Get all Premium users
        const premiumUsers = await prisma.user.findMany({
            where: { plan: 'PREMIUM' },
            include: { 
                sponsor: { include: { sponsor: true } },
                transactions: { where: { category: 'PLAN_UPGRADE' } }
            }
        });

        console.log(`Found ${premiumUsers.length} PREMIUM users to audit.`);

        let fixedCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const user of premiumUsers) {
            console.log(`\nAuditing User: ${user.mobile} (${user.name || 'Anonymous'})`);

            // Verify Revenue Record
            if (user.transactions.length === 0) {
                console.log(`[!] Missing Revenue Record (PLAN_UPGRADE) for ${user.mobile}`);
                if (applyFix) {
                    await prisma.transaction.create({
                        data: {
                            userId: user.id,
                            amount: 299,
                            type: 'CREDIT',
                            category: 'PLAN_UPGRADE',
                            description: 'AUDIT RECOVERY: Missing revenue record for Premium user'
                        }
                    });
                    console.log(`[+] Created PLAN_UPGRADE record for ${user.mobile}`);
                }
            }

            if (!user.sponsorId) {
                console.log(`[-] User ${user.mobile} has NO SPONSOR. Skipping commission audit.`);
                skipCount++;
                continue;
            }

            const l1 = user.sponsor;
            const l2 = l1?.sponsor;

            // Audit L1 (₹100)
            if (l1 && l1.plan === 'PREMIUM') {
                const l1Bonus = await prisma.transaction.findFirst({
                    where: { userId: l1.id, fromUserId: user.id, category: 'BONUS', amount: 100 }
                });

                if (!l1Bonus) {
                    console.log(`[!] MISSING L1 BONUS for ${l1.mobile} from ${user.mobile}`);
                    if (applyFix) {
                        await prisma.$transaction([
                            prisma.wallet.updateMany({
                                where: { userId: l1.id, type: 'CASH' },
                                data: { balance: { increment: 100 } }
                            }),
                            prisma.transaction.create({
                                data: {
                                    userId: l1.id,
                                    fromUserId: user.id,
                                    amount: 100,
                                    type: 'CREDIT',
                                    category: 'BONUS',
                                    description: `AUDIT RECOVERY: Referral Income (L1) from ${user.mobile}`
                                }
                            })
                        ]);
                        console.log(`[+] Fixed L1 Bonus for ${l1.mobile}`);
                    }
                }
            }

            // Audit L2 (₹80)
            if (l2 && l2.plan === 'PREMIUM') {
                const l2Bonus = await prisma.transaction.findFirst({
                    where: { userId: l2.id, fromUserId: user.id, category: 'BONUS', amount: 80 }
                });

                if (!l2Bonus) {
                    console.log(`[!] MISSING L2 BONUS for ${l2.mobile} from ${user.mobile}`);
                    if (applyFix) {
                        await prisma.$transaction([
                            prisma.wallet.updateMany({
                                where: { userId: l2.id, type: 'CASH' },
                                data: { balance: { increment: 80 } }
                            }),
                            prisma.transaction.create({
                                data: {
                                    userId: l2.id,
                                    fromUserId: user.id,
                                    amount: 80,
                                    type: 'CREDIT',
                                    category: 'BONUS',
                                    description: `AUDIT RECOVERY: Team Income (L2) from ${user.mobile}`
                                }
                            })
                        ]);
                        console.log(`[+] Fixed L2 Bonus for ${l2.mobile}`);
                    }
                }
            }
            
            fixedCount++;
        }

        console.log(`\n--- AUDIT COMPLETE ---`);
        console.log(`Processed: ${premiumUsers.length}`);
        console.log(`Fixed/Verified: ${fixedCount}`);
        console.log(`Skipped (No Sponsor): ${skipCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

// Check command line args
const args = process.argv.slice(2);
const apply = args.includes('--apply');

runAudit(apply);
