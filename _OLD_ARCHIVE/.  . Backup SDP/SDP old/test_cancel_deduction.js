
// Mock App Class Logic
class MockApp {
    constructor() {
        this.breakTimer = null;
        this.selectedDuration = 0;
        this.completed = false;
    }

    startRealBreak(duration) {
        this.selectedDuration = duration;
        this.breakTimer = 123; // Simulate timer ID
        console.log(`Break Started: ${duration} mins`);
    }

    // The Logic I added to app.js
    cancelBreak() {
        if (this.breakTimer) {
            console.log("Cancel called while timer active -> Redirecting to completeBreak");
            this.completeBreak(this.selectedDuration);
            return;
        }
        console.log("Cancel called with NO timer -> Just cleanup");
        this.cleanup();
    }

    completeBreak(duration) {
        this.breakTimer = null;
        this.completed = true;
        console.log(`Break Completed & Deducted: ${duration} mins`);
    }

    cleanup() {
        console.log("Cleanup done (hidden UI)");
    }
}

// Test Case 1: Cancel active break
console.log("--- Test 1: Cancel Active Break ---");
const app1 = new MockApp();
app1.startRealBreak(5);
app1.cancelBreak();

if (app1.completed) {
    console.log("✅ TEST 1 SUCCESS: Deduction triggered on cancel.");
} else {
    console.log("❌ TEST 1 FAILURE: Deduction NOT triggered.");
}

// Test Case 2: Cancel before start (e.g. back button)
console.log("\n--- Test 2: Cancel Selection (No Timer) ---");
const app2 = new MockApp();
// app2.startRealBreak() NOT called
app2.cancelBreak();

if (!app2.completed) {
    console.log("✅ TEST 2 SUCCESS: No deduction on simple cleanup.");
} else {
    console.log("❌ TEST 2 FAILURE: Deduction triggered incorrectly.");
}
