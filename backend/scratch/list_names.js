const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const key = process.env.GEMINI_API_KEY;

async function listModels() {
    let allModels = [];
    let pageToken = '';
    try {
        do {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const response = await axios.get(url);
            allModels = allModels.concat(response.data.models.map(m => m.name));
            pageToken = response.data.nextPageToken || '';
        } while (pageToken);
        console.log("All Available Models:", allModels);
    } catch (error) {
        console.error("Error:", error.message);
    }
}

listModels();
