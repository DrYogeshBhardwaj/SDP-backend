const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function simulate() {
    const mobile = "9988776655";
    const order_id = "order_sim_" + Date.now();
    const payment_id = "pay_sim_" + Date.now();

    try {
        const order = await prisma.paymentOrder.create({
            data: {
                mobile: mobile,
                plan_type: "BASIC",
                amount: 779,
                status: "PAID",
                order_id: order_id,
                payment_id: payment_id,
                used: false
            }
        });
        console.log("SUCCESS_ORDER_ID:" + order_id);
    } catch (err) {
        console.error("Error creating simulated order:", err);
    } finally {
        await prisma.$disconnect();
    }
}

simulate();
