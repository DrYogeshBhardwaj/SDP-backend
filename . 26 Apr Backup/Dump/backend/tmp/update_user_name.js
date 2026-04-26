const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const mobile = '7777777777';
    const newName = 'Yogesh Kumar Sharma';

    console.log(`Attempting to update user with mobile: ${mobile} to name: ${newName}`);

    try {
        const updatedUser = await prisma.user.update({
            where: { mobile: mobile },
            data: { name: newName }
        });

        console.log('Update successful:');
        console.log(updatedUser);
    } catch (error) {
        console.error('Error updating user:');
        if (error.code === 'P2025') {
            console.error('User not found with the provided mobile number.');
        } else {
            console.error(error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
