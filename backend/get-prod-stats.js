const axios = require('axios');

async function checkStats() {
    try {
        const res = await axios.get('https://sdp-backend-production-c758.up.railway.app/api/analytics/stats');
        console.log('Stats:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.error('Error fetching stats:', e.message);
    }
}

checkStats();
