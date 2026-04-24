const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// We will get models using v1 specifically if needed


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

    // Try latest model names with v1 API
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
    
    for (const modelName of modelsToTry) {
        try {
            // Explicitly try to get model
            const currentModel = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1' });
            const prompt = `${SINAANK_KNOWLEDGE}\n\nUser Query: ${userMessage}\n\nAI Response:`;
            const result = await currentModel.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error(`Gemini Error with ${modelName} (v1):`, error.message);
            
            // Try v1beta as fallback if v1 fails
            try {
                const currentModelBeta = genAI.getGenerativeModel({ model: modelName }, { apiVersion: 'v1beta' });
                const resultBeta = await currentModelBeta.generateContent(prompt);
                const responseBeta = await resultBeta.response;
                return responseBeta.text();
            } catch (e2) {
                console.error(`Gemini Error with ${modelName} (v1beta):`, e2.message);
            }

            if (modelName === modelsToTry[modelsToTry.length - 1]) {
                return `AI Sync Error: All models failed. Please ensure you have accepted the Google AI Studio Terms of Service and enabled the Generative Language API for your key.`;
            }
        }
    }
}

module.exports = { getAIResponse };
