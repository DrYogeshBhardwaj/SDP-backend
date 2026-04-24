const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function addManualUser() {
    const mobile = '8888888888';
    const name = 'Kanti Swroop Sharma';
    const sinaankId = '2990';
    const pin = '1234';

    console.log(`[ManualUser] Creating user: ${name} (${mobile}) with ID ${sinaankId}...`);

    try {
        // Hash PIN
        const salt = await bcrypt.genSalt(10);
        const pinHash = await bcrypt.hash(pin, salt);

        // Create user
        const user = await prisma.user.upsert({
            where: { mobile },
            update: {
                name,
                referral_code: sinaankId,
                role: 'BUSINESS',
                status: 'ACTIVE',
                kit_activated: true,
                plan_type: 'BUSINESS',
                plan_amount: 2990
            },
            create: {
                mobile,
                name,
                cid: `CID_${mobile}`,
                pin_hash: pinHash,
                referral_code: sinaankId,
                role: 'BUSINESS',
                status: 'ACTIVE',
                kit_activated: true,
                plan_type: 'BUSINESS',
                plan_amount: 2990,
                minutes: {
                    create: { balance: 100 }
                },
                cash: {
                    create: { balance: 0 }
                }
            }
        });

        console.log(`✅ Success! User created/updated with ID: ${user.id}`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - ID: ${user.referral_code}`);
        console.log(`   - PIN: ${pin}`);
    } catch (error) {
        console.error('❌ Error creating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addManualUser();
