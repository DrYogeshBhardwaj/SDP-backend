const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
    const updates = [
        { mobile: '9211755211', name: 'Dr Yogesh Bhardwaj' },
        { mobile: '8851168290', name: 'Poonam Sharma' },
        { mobile: '9625645211', name: 'Shubham Sharma' },
        { mobile: '9315859557', name: 'Abhishek Sharma' },
        { mobile: '9210021221', name: 'Manisha Sharma' }
    ];

    console.log("--- UPDATING USER NAMES ---");
    for (const item of updates) {
        const u = await prisma.user.updateMany({
            where: { mobile: item.mobile },
            data: { name: item.name }
        });
        console.log(`Updated ${item.mobile}: ${u.count} record(s)`);
    }
    console.log("--- UPDATE COMPLETE ---");
    await prisma.$disconnect();
}

update();
