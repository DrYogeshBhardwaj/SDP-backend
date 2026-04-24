const http = require('http');
async function test() {
    try {
        const mob = '2222222222';
        const registerRes = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: mob, pin: '1234', name: 'Test' })
        });
        const regJson = await registerRes.json();
        console.log('Reg:', regJson);

        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mobile: mob, pin: '1234' })
        });
        const loginJson = await loginRes.json();
        console.log('Login:', loginJson);
        const cookie = loginRes.headers.get('set-cookie');
        console.log('Cookie:', cookie);

        const meRes = await fetch('http://localhost:5000/api/auth/me', {
            method: 'GET',
            headers: { 'Cookie': cookie }
        });
        const meJson = await meRes.json();
        console.log('Me:', meJson);

        const histRes = await fetch('http://localhost:5000/api/minutes/history', {
            method: 'GET',
            headers: { 'Cookie': cookie }
        });
        const histJson = await histRes.json();
        console.log('History:', histJson);

    } catch (e) {
        console.error(e);
    }
}
test();
