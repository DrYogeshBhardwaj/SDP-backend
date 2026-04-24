const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const SINAANK_KNOWLEDGE = `
You are the Sinaank Digital Therapy (SDT) Support AI. Your goal is to help partners and users.

ABOUT SINAANK:
- It is a precision frequency calibration platform using binaural entrainment and guided voices.
- Therapy targets: Money (Venus/Moon), Mind (Moon/Mercury), Career (Sun/Saturn), Focus (Jupiter/Rahu), Body (Mars/Moon).
- Users MUST use headphones for best results.
- Sessions are usually 2, 5, or 10 minutes.

MLM & EARNINGS SYSTEM:
- Level 1 (Direct Referral) Commission: ₹100.
- Level 2 (Team Referral) Commission: ₹80.
- Minimum Payout: ₹500.
- UPI ID: Once saved, it is locked for security. To change, contact admin.
- Referral Code: Found in the "Growth Engine" section.

TONE & LANGUAGE:
- Be professional, encouraging, and helpful.
- Reply in the language the user uses (Hindi, English, Hinglish, etc.).
- If asked about something outside Sinaank/Therapy, politely bring them back to the topic.
`;

async function getAIResponse(userMessage) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim() === "") {
        return "Support AI is currently in maintenance. Please set the API Key in environment.";
    }

    // Try multiple models as fallback
    const modelsToTry = ["gemini-1.5-flash", "gemini-pro"];
    
    for (const modelName of modelsToTry) {
        try {
            const currentModel = genAI.getGenerativeModel({ model: modelName });
            const prompt = `${SINAANK_KNOWLEDGE}\n\nUser Query: ${userMessage}\n\nAI Response:`;
            const result = await currentModel.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`Gemini Error with ${modelName}:`, error.message);
            // If it's the last model, return the error
            if (modelName === modelsToTry[modelsToTry.length - 1]) {
                return `AI Sync Error: ${error.message}. Please check if the API Key is active in Google AI Studio.`;
            }
        }
    }
}

module.exports = { getAIResponse };
