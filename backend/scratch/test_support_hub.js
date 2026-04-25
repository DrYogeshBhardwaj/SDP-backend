const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getAIResponse } = require('../src/utils/ai');
const dotenv = require('dotenv');
dotenv.config();

async function testSupportHubFlow() {
    console.log("Testing Support Hub Flow...");
    
    // 1. Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error("No user found in database!");
        return;
    }
    console.log(`Using User: ${user.mobile}`);

    // 2. Create a support query
    const message = "Hi, how can I earn more commission in Sinaank?";
    const query = await prisma.supportQuery.create({
        data: {
            userId: user.id,
            subject: "Test Query",
            message: message,
            status: "PENDING"
        }
    });
    console.log(`Query Created: ${query.id}`);

    // 3. Process with AI
    try {
        console.log("Fetching AI Response...");
        const aiReply = await getAIResponse(message);
        console.log("AI Reply received!");

        // 4. Update query
        await prisma.supportQuery.update({
            where: { id: query.id },
            data: {
                response: aiReply,
                status: "RESOLVED"
            }
        });
        console.log("Query Resolved in Database.");
        console.log("\nAI RESPONSE CONTENT:");
        console.log("--------------------");
        console.log(aiReply);
        console.log("--------------------");

    } catch (e) {
        console.error("AI Flow Failed:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}

testSupportHubFlow();
