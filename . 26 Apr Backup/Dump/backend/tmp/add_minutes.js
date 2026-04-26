const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function fix() {
    // Add 100 minutes to all 3 seed users
    const mobiles = ['9999999999', '8888888888', '7777777777'];
    for (const mobile of mobiles) {
        const user = await p.user.findUnique({ where: { mobile } });
        if (user) {
            const wallet = await p.walletMinute.findUnique({ where: { userId: user.id } });
            if (wallet) {
                await p.walletMinute.update({
                    where: { userId: user.id },
                    data: { balance: 100 }
                });
                console.log(`✅ ${mobile} (${user.name}) → balance set to 100 minutes`);
            } else {
                await p.walletMinute.create({ data: { userId: user.id, balance: 100 } });
                console.log(`✅ ${mobile} (${user.name}) → wallet created with 100 minutes`);
            }
        } else {
            console.log(`❌ ${mobile} not found`);
        }
    }
    await p.$disconnect();
}

fix().catch(e => { console.error(e); p.$disconnect(); });
