const { getAIResponse } = require('../src/utils/ai');
const dotenv = require('dotenv');
dotenv.config();

async function testAI() {
    console.log("Testing getAIResponse...");
    try {
        const reply = await getAIResponse("Hi, tell me about Sinaank.");
        console.log("AI REPLY:", reply);
    } catch (err) {
        console.error("AI ERROR:", err);
    }
}

testAI();
