const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testSDS() {
    try {
        const user = await prisma.user.findFirst({
            where: { mobile: "9315859557" } // Using a known test user from previous logs
        });

        if (!user) {
            console.log("Test user not found");
            return;
        }

        console.log(`Current SDS Index: ${user.sds_imagination_index || 1}`);
        
        // Simulating startSDSSession logic
        let storyIndex = user.sds_imagination_index || 1;
        let nextIndex = storyIndex + 1;
        if (nextIndex > 100) nextIndex = 1;

        await prisma.user.update({
            where: { id: user.id },
            data: { sds_imagination_index: nextIndex }
        });

        const updated = await prisma.user.findUnique({ where: { id: user.id } });
        console.log(`Updated SDS Index: ${updated.sds_imagination_index}`);
        
        if (updated.sds_imagination_index === nextIndex) {
            console.log("✅ Story rotation logic verified.");
        } else {
            console.log("❌ Story rotation logic failed.");
        }

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        await prisma.$disconnect();
    }
}

testSDS();
