const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteUser() {
    const mobile = '9211755211';
    console.log(`Searching for user: ${mobile}`);
    
    try {
        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) {
            console.log("User not found in DB.");
            return;
        }

        console.log(`Deleting user: ${user.name} (${user.id})`);
        
        // Delete related data first (orders, sessions, etc. if cascade not set)
        await prisma.paymentOrder.deleteMany({ where: { mobile } });
        await prisma.userSession.deleteMany({ where: { userId: user.id } });
        await prisma.user.delete({ where: { mobile } });

        console.log("User deleted successfully. You can now register fresh.");
    } catch (e) {
        console.error("Error deleting user:", e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteUser();
