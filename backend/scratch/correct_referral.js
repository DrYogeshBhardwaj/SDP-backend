const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
    console.log("--- CORRECTING ABHISHEK SHARMA REFERRAL ---");
    
    // 1. Get IDs
    const abhishek = await prisma.user.findUnique({ where: { mobile: '9315859557' } });
    const manisha = await prisma.user.findUnique({ where: { mobile: '9210021221' } });

    if (abhishek && manisha) {
        // 2. Update Sponsor
        await prisma.user.update({
            where: { id: abhishek.id },
            data: { sponsorId: manisha.id }
        });
        console.log("Updated Abhishek (9315859557) sponsor to Manisha (9210021221).");
    } else {
        console.error("User not found!");
    }

    await prisma.$disconnect();
}

fix();
