
const fs = require('fs');
const path = require('path');

class MockStorage {
    constructor() { this.store = {}; }
    getItem(key) { return this.store[key] || null; }
    setItem(key, value) { this.store[key] = value.toString(); }
    removeItem(key) { delete this.store[key]; }
    clear() { this.store = {}; }
}
global.localStorage = new MockStorage();
global.window = {};
global.console = console;

const storeContent = fs.readFileSync(path.join(__dirname, 'js', 'store.js'), 'utf8');
const storeScript = storeContent + "\n;global.Store = Store;";
eval(storeScript);
const store = new global.Store();

async function runTest() {
    console.log("--- Commission Structure Test (5 Levels) ---");
    store.init();
    store.getUsers().forEach(u => store.permanentDeleteUser(u.id));

    let seeders = [];
    let lastReferrerId = null; // Start with no referrer (top of chain)

    // Make S5 -> Referred by None
    // Make S4 -> Referred by S5
    // Make S3 -> Referred by S4
    // ...
    // Make S1 -> Referred by S2

    for (let i = 5; i >= 1; i--) {
        let mobile = `900000000${i}`;
        // Create
        let user = store.createUser({ mobile, name: `Seeder ${i}`, pin: '1234' });
        let cid = user.identities[0].id; // Get CID
        let profile = { name: `Seeder ${i}`, upiId: `s${i}@upi` };

        // UPGRADE TO SEEDER FIRST to get the SID
        store.upgradeToSeeder(mobile, cid, profile);
        user = store.getUser(mobile);
        let sid = user.identities.find(id => id.type === 'SID').id;

        // NOW SET REFERRER. S4 is referred by S5 (lastReferrerId)
        if (lastReferrerId) {
            console.log(`Linking Seeder ${i} (${sid}) to Referrer ${lastReferrerId}`);
            // Use updateUser to set referredBy
            store.updateUser(user.id, { referredBy: lastReferrerId });
            user = store.getUser(mobile); // Refresh to check
            if (user.referredBy !== lastReferrerId) {
                console.error(`FAILED TO SET REFERRED BY for ${sid}`);
            }
        } else {
            console.log(`Seeder ${i} (${sid}) is top level.`);
        }

        seeders.push({ i, mobile, sid, user });
        lastReferrerId = sid; // This user becomes referrer for the NEXT one (S4 refers S3)
    }

    // Wait! The loop goes 5 -> 4 -> 3 -> 2 -> 1
    // i=5. lastRef=null. S5 is top. lastRef=S5_ID.
    // i=4. lastRef=S5_ID. S4 referred by S5_ID. lastRef=S4_ID.
    // ...
    // i=1. lastRef=S2_ID. S1 referred by S2_ID. lastRef=S1_ID.

    // So S1 refers Buyer. Buyer pays.
    // Level 1: S1.
    // S1 referred by S2? Yes.
    // Level 2: S2.
    // S2 referred by S3? Yes.
    // ...
    // Level 5: S5.

    console.log("\n--- Debugging User Data ---");
    seeders.forEach(s => {
        let u = store.getUser(s.mobile);
        console.log(`Seeder ${s.i} (${s.mobile}): ID=${u.id}, SID=${s.sid}, ReferredBy=${u.referredBy}`);
    });

    const buyerMobile = '9999999999';
    store.createUser({ mobile: buyerMobile, name: 'Buyer', pin: '1234' });

    // Buyer referred by S1 (lastReferrerId from loop end, which is S1_ID)
    console.log(`\nBuyer buying Family Pack, Referred by Seeder 1 (${lastReferrerId})`);

    store.processPurchase(buyerMobile, 'family', lastReferrerId);

    const expected = { 1: 140, 2: 100, 3: 70, 4: 50, 5: 40 };
    let allPassed = true;

    seeders.forEach(s => {
        let u = store.getUser(s.mobile);
        let identity = u.identities.find(i => i.type === 'SID');
        let bal = identity.walletBalance || 0;
        console.log(`Seeder ${s.i} (Level ${s.i}) Balance: ${bal}, Expected: ${expected[s.i]}`);
        if (bal !== expected[s.i]) allPassed = false;
    });

    if (allPassed) console.log("✅ ALL PASSED");
    else console.log("❌ FAILED");
}

runTest();
