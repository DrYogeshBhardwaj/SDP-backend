const axios = require('axios');

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
