const http = require('http');

const data = JSON.stringify({ mobile: '9211755210', pin: '6944' });
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    let rawCookies = res.headers['set-cookie'];
    if(!rawCookies) {
      console.log('Login failed', body);
      return;
    }
    const cookie = rawCookies[0].split(';')[0];
    
    http.get('http://localhost:5000/api/referral/team', { headers: { Cookie: cookie } }, (res2) => {
      let teamBody = '';
      res2.on('data', d => teamBody += d);
      res2.on('end', () => console.log('Team Data:', teamBody));
    });
  });
});
req.write(data);
req.end();
