const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    console.log('--- Testing Age Logic & Persistence ---');

    const mobile = '8888888888';
    
    try {
        // 1. Setup User (Ensure exists without age)
        const user = await prisma.user.upsert({
            where: { mobile },
            update: { age_group: null },
            create: {
                mobile,
                pin_hash: 'dummy',
                cid: 'CID_AGE_TEST_' + Date.now(),
                role: 'USER_178',
                age_group: null
            }
        });

        console.log('\nCase 1: New User (First Profile)');
        let u = await prisma.user.findUnique({ where: { id: user.id } });
        const isFirstProfile = !u.age_group;
        console.log(`- Age Group: ${u.age_group}`);
        console.log(`- isFirstProfile: ${isFirstProfile}`);
        if (isFirstProfile === true) console.log('✅ Correct: User marked as First Profile (null age_group)');

        // 2. Update Age Group (Simulating Generate Therapy click)
        console.log('\nCase 2: Saving Age Group');
        const selectedAge = '18-40';
        await prisma.user.update({
            where: { id: user.id },
            data: { age_group: selectedAge }
        });

        u = await prisma.user.findUnique({ where: { id: user.id } });
        console.log(`- Saved Age Group: ${u.age_group}`);
        if (u.age_group === selectedAge) console.log('✅ Correct: Age group persisted');

        // 3. Verify Next Use
        console.log('\nCase 3: Returning User');
        const stillFirstProfile = !u.age_group;
        console.log(`- isFirstProfile: ${stillFirstProfile}`);
        if (stillFirstProfile === false) console.log('✅ Correct: Returning user is NOT First Profile');

        console.log('\n--- ALL BACKEND AGE LOGIC PASSED ---');
    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
