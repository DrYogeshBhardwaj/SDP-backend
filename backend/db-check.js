const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const ranks = await prisma.rankConfig.findMany({ where: { active: true }, orderBy: { bonusAmount: 'asc' } });
    console.log('--- Ranks ---');
    ranks.forEach(r => console.log(`${r.id}: ${r.name} (Direct: ${r.directRequired}, Network: ${r.networkRequired}, Bonus: ${r.bonusAmount})`));

    const seeders = await prisma.user.findMany({
        where: { role: 'SEEDER' },
        select: { id: true, mobile: true, name: true, referral_code: true }
    });
    console.log('--- Seeders ---');
    for (const s of seeders) {
        const directCount = await prisma.referral.count({ where: { referrerId: s.id, level: 1, status: 'ACTIVE' } });
        const networkCount = await prisma.referral.count({ where: { referrerId: s.id, status: 'ACTIVE' } });
        const achievedRanks = await prisma.userRank.findMany({ where: { userId: s.id }, include: { rank: true } });
        console.log(`${s.mobile} (${s.name}): Direct: ${directCount}, Network: ${networkCount}, Ranks: ${achievedRanks.map(ar => ar.rank.name).join(', ')}`);
    }

    await prisma.$disconnect();
}

main();
