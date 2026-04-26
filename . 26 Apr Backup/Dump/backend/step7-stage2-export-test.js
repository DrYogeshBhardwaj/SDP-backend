const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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
            headers: {}
        };

        if (data) Object.assign(options.headers, { 'Content-Type': 'application/json' });
        if (cookie) options.headers['Cookie'] = cookie;

        const request = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                const cookies = res.headers['set-cookie'];
                const cookieStr = cookies ? cookies[0].split(';')[0] : null;

                // Do not parse to JSON if we expect a CSV returned
                let parsedBody = body;
                if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
                    try { parsedBody = JSON.parse(body); } catch (e) { }
                }

                resolve({
                    status: res.statusCode,
                    body: parsedBody,
                    cookie: cookieStr,
                    headers: res.headers
                });
            });
        });

        request.on('error', reject);
        if (data) request.write(JSON.stringify(data));
        request.end();
    });
};

const runExportTest = async () => {
    try {
        console.log("--- Starting Step 7, Stage 2 (Export & Streaming) Tests ---");

        await prisma.transaction.deleteMany({});

        const adminMobile = `92${Math.floor(Math.random() * 100000000)}`;

        console.log("Setting up Admin...");
        await req('POST', '/auth/register', { mobile: adminMobile, pin: '1234' });
        await prisma.user.update({ where: { mobile: adminMobile }, data: { role: 'ADMIN' } });
        const adminRes = await req('POST', '/auth/login', { mobile: adminMobile, pin: '1234' });
        const adminCookie = adminRes.cookie;
        const adminId = adminRes.body.data.user.id;

        console.log("Admin generated. Injecting 10,000 dummy transaction chunks (Batching)...");

        // Insert 10k transactions in batches of 1000
        const now = new Date();
        for (let i = 0; i < 10; i++) {
            const batch = [];
            for (let j = 0; j < 1000; j++) {
                batch.push({
                    userId: adminId,
                    type: 'BONUS',
                    amount: 10 + (j % 5),
                    description: `Batch ${i} Record ${j}`,
                    status: 'COMPLETED',
                    transactionDate: now
                });
            }
            await prisma.transaction.createMany({ data: batch });
            process.stdout.write(".");
        }
        console.log("\n10k Records Injected successfully!");

        // Test 1: Validation Rules
        console.log("\n[Test 1] Date Validation Fallback (> 365 days limit)");
        const oldStart = "1999-01-01";
        const newEnd = "2005-01-01";
        let res1 = await req('GET', `/admin/export/transactions?startDate=${oldStart}&endDate=${newEnd}`, null, adminCookie);
        console.log("Expected 400 (Bad Request). Received:", res1.status);
        if (res1.status !== 400) throw new Error("Range boundary protection failed");

        // Test 2: Standard Valid CSV Export Streaming
        console.log("\n[Test 2] Streaming the 10k dataset limit");
        const initMem = process.memoryUsage().heapUsed / 1024 / 1024;

        const startIso = new Date(Date.now() - 3600000).toISOString();
        const endIso = new Date(Date.now() + 3600000).toISOString();

        let res2 = await req('GET', `/admin/export/transactions?startDate=${startIso}&endDate=${endIso}`, null, adminCookie);

        const afterMem = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Memory Footprint: Before ${initMem.toFixed(2)} MB -> After ${afterMem.toFixed(2)} MB`);

        if (afterMem - initMem > 150) {
            console.error("WARNING: Heap memory jumped too high. Streaming pipe likely decoupled into array loading.");
        } else {
            console.log("Streaming pipe memory held steady within safe bounds.");
        }

        console.log("Headers attached correctly?");
        console.log("- Content-Type:", res2.headers['content-type']);
        console.log("- Content-Disposition:", res2.headers['content-disposition']);

        const lines = res2.body.trim().split('\n');
        console.log(`CSV Row Count Received: ${lines.length} (Expected 10001)`);
        if (lines.length !== 10001) throw new Error("Dataset dropped chunks during stream");

        // Sample the header and first row to prove projection (No PIN hashes output)
        console.log("\nSample Top CSV Structure:");
        console.log(lines[0]); // Header
        console.log(lines[1]); // Record 1

        if (lines[0].toLowerCase().includes('pin') || lines[0].toLowerCase().includes('hash')) {
            throw new Error("SECURITY FAILURE: Sensitive field leaked into the CSV projection projection");
        }

        // Test 3: Empty dataset
        console.log("\n[Test 3] Empty Dataset Graceful CSV");
        const emptyStart = "1999-01-01";
        const emptyEnd = "1999-01-02";
        let res3 = await req('GET', `/admin/export/expenses?startDate=${emptyStart}&endDate=${emptyEnd}`, null, adminCookie);
        console.log("Empty Dataset Payload:", res3.body.trim());
        if (res3.body.trim().split('\n').length !== 1) throw new Error("Empty dataset produced dangling rows");

        console.log("\n--- Export Streaming Tests Completed Successfully ---");
    } catch (e) {
        console.error("Test Failed:", e.message || e);
    }
}

runExportTest();
