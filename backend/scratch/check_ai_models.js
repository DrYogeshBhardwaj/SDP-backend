const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Using API Key:", key ? (key.substring(0, 8) + "...") : "MISSING");
    
    if (!key) return;

    try {
        const genAI = new GoogleGenerativeAI(key);
        // We can't easily list models with the basic SDK, but we can try a few specific ones
        const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro", "chat-bison-001"];
        
        for (const m of models) {
            try {
                const model = genAI.getGenerativeModel({ model: m });
                await model.generateContent("test");
                console.log(`✅ Model ${m} is WORKING!`);
            } catch (e) {
                console.log(`❌ Model ${m} failed: ${e.message}`);
            }
        }
    } catch (error) {
        console.error("General Error:", error);
    }
}

checkModels();
