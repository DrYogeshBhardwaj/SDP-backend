const axios = require('axios');

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

    const models = [
        "gemini-flash-latest",
        "gemini-2.0-flash",
        "gemini-2.5-flash",
        "gemini-pro-latest",
        "gemini-1.5-flash"
    ];
    
    const keyDebug = `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    
    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await axios.post(url, {
                contents: [{
                    parts: [{
                        text: `${SINAANK_KNOWLEDGE}\n\nUser Query: ${userMessage}`
                    }]
                }]
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.data && response.data.candidates && response.data.candidates[0].content) {
                return response.data.candidates[0].content.parts[0].text;
            }
        } catch (error) {
            let errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            
            // Special check for leaked key
            if (error.response && error.response.status === 403 && errMsg.includes("leaked")) {
                return "CRITICAL: The Gemini API Key has been reported as LEAKED by Google. Please generate a new key in Google AI Studio and update the server configuration.";
            }

            console.error(`Direct API Error with ${model}:`, errMsg);
            
            if (model === models[models.length - 1]) {
                return `AI Support is currently under load or configuration is pending. Error: ${errMsg}.`;
            }
        }
    }
}

module.exports = { getAIResponse };
