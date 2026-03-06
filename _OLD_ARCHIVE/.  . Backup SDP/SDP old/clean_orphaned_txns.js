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
const storeScript = storeContent + "\n;global.Store = Store;";
eval(storeScript);

const store = new global.Store(); // Init will load from mock, which is empty. 
// We need to load REAL data to clean it? 
// Wait, I cannot run this script on the USER's real localStorage via node. 
// Logic Error: Node script runs in a separate environment. I cannot access the browser's localStorage.

// Correction: I must implement this as a function in `store.js` or `app.js` and run it via the browser console or a hidden button.
// OR, I can create a temporary "Cleanup" button in the admin panel.

console.log("This script is for logic verification only. Real cleanup must run in browser.");
