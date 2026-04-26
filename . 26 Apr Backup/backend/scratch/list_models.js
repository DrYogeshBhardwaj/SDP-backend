const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;

async function listModels() {
    console.log("Listing models for API Key...");
    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
        const response = await axios.get(url);
        console.log("Models:", JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error(`ERROR: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`ERROR: ${error.message}`);
        }
    }
}

listModels();
