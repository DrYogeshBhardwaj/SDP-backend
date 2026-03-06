const fs = require('fs');

// Mock localStorage
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

// Load Store
const path = require('path');
const storePath = path.join(__dirname, 'js', 'store.js');
const storeContent = fs.readFileSync(storePath, 'utf8');
// Append export for Node
const storeScript = storeContent + "\n;global.Store = Store;";
eval(storeScript);

const store = new global.Store();

async function runTest() {
    console.log("--- Setting up Data ---");
    store.init();

    // 1. Create User
    const mobile = '9988776655';
    let user = { mobile, pin: '1234', name: 'Delete Me' };
    user = store.createUser(user);
    const userId = user.id;
    console.log(`Created User: ${userId}`);

    // 2. Add Transaction
    const txn = store.addTransaction({
        userId: userId,
        type: 'TEST_TXN',
        amount: 100,
        description: 'Test Transaction'
    });
    console.log(`Added Transaction: ${txn.id}`);

    // 3. Add Feedback (Mocking direct add since store helper might not exist)
    const feedback = [{ id: 'fb_1', userId: userId, text: 'Test Feedback' }];
    localStorage.setItem('ssb_feedback', JSON.stringify(feedback));
    console.log(`Added Feedback`);

    // 4. Manually "Corrupt" Data (Simulate Orphaned State)
    // We delete the user from ssb_users WITHOUT calling deleteTransaction or similar
    console.log("--- Corrupting Data (Removing User only) ---");
    let users = JSON.parse(localStorage.getItem('ssb_users'));
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('ssb_users', JSON.stringify(users));

    // Verify User is gone
    const checkUser = store.getUsers(true).find(u => u.id === userId);
    if (checkUser) {
        console.error("❌ Setup Failed: User was not removed.");
        return;
    } else {
        console.log("User removed from DB.");
    }

    // 5. Run Cleanup
    console.log("--- Running cleanOrphanedData() ---");
    const result = store.cleanOrphanedData();
    console.log("Cleanup Result:", result);

    // 6. Verify Cleanup
    const finalTxns = JSON.parse(localStorage.getItem('ssb_transactions'));
    const txnExists = finalTxns.find(t => t.id === txn.id);

    const finalFeedback = JSON.parse(localStorage.getItem('ssb_feedback'));
    const fbExists = finalFeedback.find(f => f.userId === userId);

    console.log(`Transaction Exists: ${!!txnExists}`);
    console.log(`Feedback Exists: ${!!fbExists}`);

    if (!txnExists && !fbExists) {
        console.log("✅ TEST SUCCESS: Orphaned data removed.");
    } else {
        console.log("❌ TEST FAILURE: Data remains.");
    }
}

runTest();
