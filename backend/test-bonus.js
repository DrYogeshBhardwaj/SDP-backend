const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const u = await prisma.user.findUnique({ where: { mobile: '9211755210' } });
    if (!u) {
      console.log('User not found');
      return;
    }
    
    const ledgers = await prisma.bonusLedger.findMany({
      where: { userId: u.id },
      include: { sourceUser: true }
    });
    
    console.log('Ledger entries for 9211755210:');
    ledgers.forEach(l => {
      console.log(`- Amount: ${l.amount}, Type: ${l.type}, Source: ${l.sourceUser ? l.sourceUser.mobile : 'N/A'}, Date: ${l.createdAt}`);
    });
    
    const sum = ledgers.reduce((acc, l) => acc + l.amount, 0);
    console.log('Total from Ledger:', sum);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
