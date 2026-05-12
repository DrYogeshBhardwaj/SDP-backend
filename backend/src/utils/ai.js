const { GoogleGenerativeAI } = require("@google/generative-ai");

const SINAANK_KNOWLEDGE = `
You are the Official Sinaank Admin (AI Support). Your goal is to provide expert guidance to our partners and users.

IDENTITY:
- You are representing the Sinaank Therapy Admin Team.
- Always start or end with a welcoming vibe (but avoid religious specific greetings as per new policy). Use "Welcome to Sinaank", "Greetings", or "Best regards, Sinaank Team".

ABOUT SINAANK:
- A digital frequency calibration platform using binaural entrainment.
- Targets: Money (Venus/Moon), Mind (Moon/Mercury), Career (Sun/Saturn), Focus (Jupiter/Rahu), Body (Mars/Moon).
- Headphone usage is MANDATORY for effect.
- Sessions: 2, 5, or 10 minutes.

MLM & EARNINGS:
- Direct Referral (L1): ₹100.
- Team Referral (L2): ₹80.
- Min Payout: ₹500.
- UPI ID is locked once saved. Contact support to change.

TONE: Professional, authoritative yet caring, and strictly helpful.

RESPONSE STYLE:
- Be extremely DIRECT and CONCISE.
- Avoid long explanations unless specifically asked.
- Answer in as few words as possible while remaining helpful.

LANGUAGE RULE:
- Always respond in the SAME LANGUAGE as the user's query.
- If the user asks in Hindi, reply in Hindi.
- If the user asks in English, reply in English.
- Maintain the same helpful information regardless of language.
`;

async function getAIResponse(userMessage) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "") {
        return "Support AI is currently in maintenance. Please set the API Key in environment.";
    }

    try {
        const genAI = new GoogleGenerativeAI(key);
        // Using the most stable model name for SDK
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `${SINAANK_KNOWLEDGE}\n\nUser Query: ${userMessage}`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("Gemini SDK Error:", error.message);
        
        // Fallback to older model if flash is not available
        try {
            const genAI = new GoogleGenerativeAI(key);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent(`${SINAANK_KNOWLEDGE}\n\nUser Query: ${userMessage}`);
            const response = await result.response;
            return response.text();
        } catch (e2) {
            return `AI Support is currently under load. Please try again later. Error: ${e2.message}`;
        }
    }
}

module.exports = { getAIResponse };
