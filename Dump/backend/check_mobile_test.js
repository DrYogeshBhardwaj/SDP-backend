const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log("Testing check-mobile API locally...");
    try {
        const res = await fetch('http://localhost:5000/api/auth/check-mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: '9999999991' })
        });
        const data = await res.json();
        console.log("Check-Mobile API status:", res.status);
        console.log("Check-Mobile API response:", data);
    } catch (e) {
        console.error("fetch error:", e.message);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
