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

const runStage2AnnouncementsTest = async () => {
    try {
        console.log("--- Starting Step 7, Stage 2 (Announcements) Tests ---");

        await prisma.announcement.deleteMany({});

        const adminMobile = `93${Math.floor(Math.random() * 100000000)}`;
        const seederMobile = `83${Math.floor(Math.random() * 100000000)}`;
        const userMobile = `73${Math.floor(Math.random() * 100000000)}`;

        // 1. Setup Accounts
        console.log("Setting up Admin, Seeder, and Normal User...");

        await req('POST', '/auth/register', { mobile: adminMobile, pin: '1234' });
        await prisma.user.update({ where: { mobile: adminMobile }, data: { role: 'ADMIN' } });
        const adminRes = await req('POST', '/auth/login', { mobile: adminMobile, pin: '1234' });
        const adminCookie = adminRes.cookie;

        await req('POST', '/auth/register', { mobile: seederMobile, pin: '1234' });
        await prisma.user.update({ where: { mobile: seederMobile }, data: { role: 'SEEDER' } });
        const seederRes = await req('POST', '/auth/login', { mobile: seederMobile, pin: '1234' });
        const seederCookie = seederRes.cookie;

        await req('POST', '/auth/register', { mobile: userMobile, pin: '1234' });
        const userRes = await req('POST', '/auth/login', { mobile: userMobile, pin: '1234' });
        const userCookie = userRes.cookie;

        console.log("Accounts ready!");

        // 2. Seeder tries to post announcement (Should fail)
        console.log("\n[Security: Seeder Create Announcement]");
        let annRes = await req('POST', '/admin/announcements', {
            title: "Seeder Update",
            message: "I am taking over."
        }, seederCookie);
        console.log("Seeder POST Status (Expect 403):", annRes.status);
        if (annRes.status !== 403) throw new Error("Seeder bypassed admin lock");

        // 3. Admin posts announcement
        console.log("\n[Admin Create Announcement]");
        annRes = await req('POST', '/admin/announcements', {
            title: "Scheduled Maintenance <b>Alert</b>",
            message: "System offline tonight. Ignore <script>tags</script>."
        }, adminCookie);
        console.log("Admin POST Status (Expect 201):", annRes.status);
        if (annRes.status !== 201) throw new Error(JSON.stringify(annRes.body));

        // Output sanitization result
        console.log("Sanitized Title saved as:", annRes.body.data.announcement.title);

        // 4. Seeder reads announcements
        console.log("\n[Security: Seeder Read Announcements]");
        let getRes = await req('GET', '/announcements?page=1&limit=5', null, seederCookie);
        console.log("Seeder GET Status (Expect 200):", getRes.status, "| Count:", getRes.body.data.count);

        // 5. Normal User reads announcements (Should fail)
        console.log("\n[Security: User Read Announcements]");
        let failRes = await req('GET', '/announcements', null, userCookie);
        console.log("User GET Status (Expect 403):", failRes.status);
        if (failRes.status !== 403) throw new Error("Normal user bypassed role restriction on broadcast");

        // 6. Bulk Pagination Check
        console.log("\n[Pagination Check]");
        console.log("Generating 25 dummy announcements from Admin...");
        for (let i = 1; i <= 25; i++) {
            await prisma.announcement.create({
                data: { title: `Test ${i}`, message: `Content ${i}`, created_by: adminRes.body.data.user.id }
            });
        }

        let pageRes = await req('GET', '/announcements?page=2&limit=10', null, adminCookie);
        console.log("Page 2 (Limit 10) length:", pageRes.body.data.announcements.length, "| Status:", pageRes.status);
        if (pageRes.body.data.announcements.length !== 10) throw new Error("Pagination failed");

        console.log("\n--- Announcements Module Validated Successfully ---");

    } catch (error) {
        console.error("Test Failed:", error.message || error);
    }
};

runStage2AnnouncementsTest();
