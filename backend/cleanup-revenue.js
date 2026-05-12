const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupRevenue() {
    console.log('\n--- SINAANK REVENUE CLEANUP & AUDIT ---');
    console.log('Target: Synchronize Revenue with the official 15-entry list.\n');

    const correctEntries = [
        { mobile: '9540068900', name: 'Ravi yadav', date: '2026-05-12', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9821763070', name: 'Pooja', date: '2026-05-12', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8851419684', name: 'Anushka bhardwaj', date: '2026-05-11', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8527841181', name: 'Tashi', date: '2026-05-11', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9818869428', name: 'Sangeeta Sharma', date: '2026-05-10', description: 'Manual Activation via Password (₹299)' },
        { mobile: '7669195673', name: 'Aviraj Kaushik', date: '2026-05-09', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9350184552', name: 'Komal Sharma', date: '2026-05-09', description: 'Verified Payment Received (Order: order_SnIn3ELYLPX6xv)' },
        { mobile: '8851168290', name: 'Poonam Sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8527401392', name: 'Khushi sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9953869409', name: 'Sahil', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9711812177', name: 'Amandeep Gulia', date: '2026-05-08', description: 'Verified Payment Received (Order: order_SnIn3ELYLPX6xv)' },
        { mobile: '9211755211', name: 'Dr Yogesh Bhardwaj', date: '2026-05-07', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9210021221', name: 'Manisha Sharma', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '9625645211', name: 'Shubham pandat', date: '2026-05-08', description: 'Manual Activation via Password (₹299)' },
        { mobile: '8368668299', name: 'Prachi Sharma', date: '2026-05-10', description: 'Manual Activation via Password (₹299)' }
    ];

    try {
        const idsToKeep = [];

        for (const entry of correctEntries) {
            const user = await prisma.user.findUnique({ where: { mobile: entry.mobile } });
            if (!user) {
                console.log(`[!] User ${entry.mobile} (${entry.name}) missing from DB. Skipping...`);
                continue;
            }

            // Find if a record already exists for this user
            const existing = await prisma.transaction.findFirst({
                where: { 
                    userId: user.id, 
                    category: { in: ['PLAN_UPGRADE', 'REGISTRATION_FEE'] } 
                }
            });

            if (existing) {
                // Update existing record to match correct details
                const updated = await prisma.transaction.update({
                    where: { id: existing.id },
                    data: {
                        description: entry.description,
                        createdAt: new Date(entry.date),
                        amount: 299,
                        type: 'CREDIT',
                        category: 'PLAN_UPGRADE'
                    }
                });
                idsToKeep.push(updated.id);
                console.log(`[OK] Verified/Updated record for ${entry.mobile}`);
            } else {
                // Create missing record
                const created = await prisma.transaction.create({
                    data: {
                        userId: user.id,
                        amount: 299,
                        type: 'CREDIT',
                        category: 'PLAN_UPGRADE',
                        description: entry.description,
                        createdAt: new Date(entry.date)
                    }
                });
                idsToKeep.push(created.id);
                console.log(`[+] Created missing record for ${entry.mobile}`);
            }
        }

        // Delete all OTHER revenue records (Duplicates or incorrect ones)
        const deleteRes = await prisma.transaction.deleteMany({
            where: {
                category: { in: ['PLAN_UPGRADE', 'REGISTRATION_FEE'] },
                id: { notIn: idsToKeep }
            }
        });

        console.log(`\nCleanup successful: Deleted ${deleteRes.count} invalid/duplicate records.`);
        
        const finalCount = await prisma.transaction.count({
            where: { category: { in: ['PLAN_UPGRADE', 'REGISTRATION_FEE'] } }
        });
        console.log(`Final Database Revenue Entries: ${finalCount}`);
        console.log(`Total Revenue Amount: ₹${finalCount * 299}`);

    } catch (err) {
        console.error('Cleanup failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

cleanupRevenue();
