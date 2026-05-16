const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;
const models = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-pro",
    "gemini-flash-latest"
];

async function testModels() {
    console.log("Testing Gemini Models...");
    if (!key) {
        console.error("No API key found!");
        return;
    }

    for (const model of models) {
        try {
            console.log(`\nTesting Model: ${model}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await axios.post(url, {
                contents: [{
                    parts: [{
                        text: "Hello"
                    }]
                }]
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log(`SUCCESS [${model}]`);
        } catch (error) {
            if (error.response) {
                console.error(`ERROR [${model}]: ${error.response.status} - ${error.response.data.error ? error.response.data.error.message : JSON.stringify(error.response.data)}`);
            } else {
                console.error(`ERROR [${model}]: ${error.message}`);
            }
        }
    }
}

testModels();
