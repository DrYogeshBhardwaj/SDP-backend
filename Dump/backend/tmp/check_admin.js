const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
    const user = await p.user.findUnique({ where: { mobile: '9999999999' } });
    if (user) {
        console.log('✅ Admin FOUND:', user.name, '| role:', user.role, '| pin_hash:', user.pin_hash ? 'SET' : 'NOT SET');
    } else {
        console.log('❌ Admin NOT FOUND in DB — seed.js was not run!');
    }
    await p.$disconnect();
}

check().catch(e => { console.error('DB ERROR:', e.message); p.$disconnect(); });
