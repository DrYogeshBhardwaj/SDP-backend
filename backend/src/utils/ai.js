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

    const models = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    
    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
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
            const errMsg = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error(`Direct API Error with ${model}:`, errMsg);
            
            if (model === models[models.length - 1]) {
                return `AI Sync Error: Please try creating a NEW PROJECT in Google AI Studio and using a fresh key from there. Current error: ${errMsg}`;
            }
        }
    }
}

module.exports = { getAIResponse };
