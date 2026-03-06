const fs = require('fs');
const path = require('path');

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
const storeContent = fs.readFileSync(path.join(__dirname, 'js', 'store.js'), 'utf8');
const storeScript = storeContent + "\n;global.Store = Store;";
eval(storeScript);

const store = new global.Store();

async function runTest() {
    console.log("--- Setting up Data ---");
    store.init();

    // 1. Create User
    const mobile = '9211744521';
    let user = { mobile, pin: '1234', name: 'Test User' };
    try {
        user = store.createUser(user);
    } catch (e) {
        user = store.getUser(mobile);
    }

    // Initial Balance
    const initialBalance = user.minutesBalance || 0; // Default 3650
    console.log(`Initial Balance: ${initialBalance}`);

    // 2. Simulare App Logic: Deduct Minutes
    console.log("--- Simulating Break Completion (2 mins) ---");
    const activeId = user.identities[0].id; // Use first ID

    // App.js used to do:
    // store.deductMinutes(user.id, 2, "Pause Session", activeId);
    // THEN store.updateUser(user.id, user); <--- THIS WAS THE BUG (using stale 'user' object)

    // Verify correct flow (without the bug)
    const result = store.deductMinutes(user.id, 2, "Pause Session", activeId);
    console.log(`Deduction Success: ${result}`);

    // Verify Balance in Store
    const updatedUser = store.getById(user.id);
    const updatedIdentity = updatedUser.identities.find(i => i.id === activeId);
    console.log(`Updated Identity Balance: ${updatedIdentity.minutesBalance}`);

    if (updatedIdentity.minutesBalance === (3650 - 2)) {
        console.log("✅ TEST SUCCESS: Minutes deducted correctly.");
    } else {
        console.log("❌ TEST FAILURE: Minutes NOT deducted.");
    }
}

runTest();
