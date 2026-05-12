const axios = require('axios');

async function activateUser() {
    const mobile = '9711812177';
    const password = '725653P'; // From .env
    const url = 'https://sdp-backend-production-c758.up.railway.app/api/payment/verify-password';

    console.log(`Attempting to activate user ${mobile} on production...`);
    
    try {
        const response = await axios.post(url, {
            mobile: mobile,
            password: password,
            name: 'Amandeep Gulia', // From screenshot
            upiId: 'amandeep.gulia10-1@okaxis' // From screenshot
        });

        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.error('Error Response:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }
    }
}

activateUser();
