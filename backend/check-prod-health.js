const axios = require('axios');

async function checkStats() {
    const url = 'https://sdp-backend-production-c758.up.railway.app/health';
    const statsUrl = 'https://sdp-backend-production-c758.up.railway.app/api/analytics/summary'; // Let's guess if there's a public one or check code

    try {
        const health = await axios.get(url);
        console.log('Health:', health.data);
    } catch (e) {
        console.log('Health check failed');
    }
}

checkStats();
