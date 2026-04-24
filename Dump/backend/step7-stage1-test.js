const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const req = (method, path, data = null, cookie = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(BASE_URL + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (cookie) options.headers['Cookie'] = cookie;

        const request = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const cookies = res.headers['set-cookie'];
                const cookieStr = cookies ? cookies[0].split(';')[0] : null;
                try {
                    resolve({ status: res.statusCode, body: body ? JSON.parse(body) : null, cookie: cookieStr });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        request.on('error', reject);
        if (data) request.write(JSON.stringify(data));
        request.end();
    });
};

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const runStage1Test = async () => {
    try {
        console.log("--- Starting Step 7, Stage 1 Tests ---");

        // Clean only the new tables
        await prisma.message.deleteMany({});
        await prisma.systemExpense.deleteMany({});

        const adminMobile = `9${Math.floor(Math.random() * 1000000000)}`;
        const userMobile = `8${Math.floor(Math.random() * 1000000000)}`;

        // 1. Register & Authenticate Admin
        console.log(`Registering Admin (${adminMobile})...`);
        await req('POST', '/auth/register', { mobile: adminMobile, pin: '1234' });
        await prisma.user.update({ where: { mobile: adminMobile }, data: { role: 'ADMIN' } });

        const adminRes = await req('POST', '/auth/login', { mobile: adminMobile, pin: '1234' });
        const adminCookie = adminRes.cookie;
        if (adminRes.status !== 200) throw new Error("Admin login failed");
        console.log("Admin logged in!");

        // 2. Register & Authenticate Normal User
        console.log(`Registering Normal User (${userMobile})...`);
        await req('POST', '/auth/register', { mobile: userMobile, pin: '1234' });
        const userRes = await req('POST', '/auth/login', { mobile: userMobile, pin: '1234' });
        const userCookie = userRes.cookie;
        if (userRes.status !== 200) throw new Error("User login failed");
        console.log("Normal User logged in!");

        // 3. Admin posts an expense
        console.log("\n[Expense Module]");
        let expRes = await req('POST', '/admin/expenses', {
            category: 'SERVER_COST',
            amount: 150.50,
            description: 'DigitalOcean Monthly',
            date: new Date().toISOString()
        }, adminCookie);
        console.log("Create Expense Status:", expRes.status);
        if (expRes.status !== 201) throw new Error(JSON.stringify(expRes.body));

        // 4. Admin reads expenses
        expRes = await req('GET', '/admin/expenses', null, adminCookie);
        console.log("Read Expenses Status:", expRes.status, "| Total Dynamic Expenses:", expRes.body.data.totalExpenses);

        // 5. User tries to send message to user (Should fail)
        console.log("\n[Conversation Module]");
        let msgRes = await req('POST', '/messages', {
            receiverId: userRes.body.data.user.id, // trying to message themselves/another user
            content: "Hello bro"
        }, userCookie);
        console.log("User -> User Message Status:", msgRes.status, "|", msgRes.body.message);

        // 6. User sends message to Admin
        const adminId = adminRes.body.data.user.id;
        msgRes = await req('POST', '/messages', {
            receiverId: adminId,
            content: "Hello Admin, need help."
        }, userCookie);
        console.log("User -> Admin Message Status:", msgRes.status);
        const msgId = msgRes.body.data.message.id;

        // 7. Admin reads thread
        let threadRes = await req('GET', `/messages/${userRes.body.data.user.id}`, null, adminCookie);
        console.log("Admin Read Thread Status:", threadRes.status, "| Messages Count:", threadRes.body.data.count);

        // 8. Admin marks the message as READ
        let readRes = await req('PUT', `/messages/${msgId}/read`, null, adminCookie);
        console.log("Admin Mark Read Status:", readRes.status);

        // 9. Admin Replies
        msgRes = await req('POST', '/messages', {
            receiverId: userRes.body.data.user.id,
            content: "Hello User, how can I help you?"
        }, adminCookie);
        console.log("Admin Reply Status:", msgRes.status);

        // 10. User reads paginated thread
        threadRes = await req('GET', `/messages/${adminId}?page=1&limit=5`, null, userCookie);
        console.log("User Read Thread Status:", threadRes.status, "| Messages Count:", threadRes.body.data.count);

        console.log("\n--- Stage 1 Tests Completed Successfully ---");

    } catch (error) {
        console.error("Test Failed:", error.message || error);
    }
};

runStage1Test();
