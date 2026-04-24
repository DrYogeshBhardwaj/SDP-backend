const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const mobile = '9999999991';
    const pin = '1234';
    console.log("Testing register API locally...");
    try {
        const res = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile, pin, name: 'Reg Test', amount: 580 })
        });
        const data = await res.json();
        console.log("Register API status:", res.status);
        console.log("Register API response:", data);
    } catch (e) {
        console.error("Register fetch error:", e.message);
    }
}

run().catch(console.error).finally(() => prisma.$disconnect());
