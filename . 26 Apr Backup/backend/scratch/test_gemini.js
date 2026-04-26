const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const models = [
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
    "gemini-pro-latest"
];

async function testGemini() {
    console.log("Testing Gemini API Key:", key ? "FOUND" : "NOT FOUND");
    if (!key) return;

    for (const model of models) {
        try {
            console.log(`\nTesting Model: ${model}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await axios.post(url, {
                contents: [{
                    parts: [{
                        text: "Hello, are you active?"
                    }]
                }]
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log(`SUCCESS [${model}]:`, response.data.candidates[0].content.parts[0].text);
            return;
        } catch (error) {
            if (error.response) {
                console.error(`ERROR [${model}]: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else {
                console.error(`ERROR [${model}]: ${error.message}`);
            }
        }
    }
}

testGemini();
