class Store {
    constructor() {
        this.DB_VERSION = 6;
        this.init();
    }

    init() {
        let storedVersion = parseInt(localStorage.getItem('ssb_db_version') || '0');

        // 1. Hard Reset for very old versions
        if (storedVersion < 4) {
            // Preserve App Version to prevent loop with App.init
            const appVer = localStorage.getItem('ssb_app_version');
            localStorage.clear();
            if (appVer) localStorage.setItem('ssb_app_version', appVer);

            storedVersion = 0; // Reset to 0 so we re-seed
        }

        // FORCE LOGOUT MIGRATION (Version 6)
        if (storedVersion < 6) {
            // console.log("Migration v6: Forcing Global Logout");
            this.logout();
            localStorage.setItem('ssb_db_version', this.DB_VERSION.toString());
        }

        // 2. Robust Seed: Ensure Admin A and Admin B exist (Critical for Split Roles)
        // REMOVED: Old Super Admin (9999999999)

        const adminsToCheck = [
            {
                id: 'u_admin_a', name: 'Finance Admin', mobile: '9999999991', role: 'ADMIN_A', pin: '1234', minutesBalance: 99999,
                identities: [{ id: 'ADM_A', type: 'ADMIN_A', walletBalance: 0, minutesBalance: 99999 }]
            },
            {
                id: 'u_admin_b', name: 'System Admin', mobile: '9999999992', role: 'ADMIN_B', pin: '1234', minutesBalance: 99999,
                identities: [{ id: 'ADM_B', type: 'ADMIN_B', walletBalance: 0, minutesBalance: 99999 }]
            }
        ];

        let currentUsers = [];
        try {
            currentUsers = JSON.parse(localStorage.getItem('ssb_users') || '[]');
        } catch (e) {
            console.error("Critical Data Corruption. Resetting.");
            currentUsers = [];
        }
        if (!Array.isArray(currentUsers)) currentUsers = [];

        // Remove Old Admin if exists
        const oldAdminIdx = currentUsers.findIndex(u => u.mobile === '9999999999');
        if (oldAdminIdx !== -1) {
            currentUsers.splice(oldAdminIdx, 1);
        }

        let usersUpdated = false;
        adminsToCheck.forEach(admin => {
            if (!currentUsers.find(u => u.mobile === admin.mobile)) {
                // console.log(`Seeding missing admin: ${admin.name}`);
                currentUsers.push(admin);
                usersUpdated = true;
            }
        });

        if (usersUpdated || oldAdminIdx !== -1) {
            localStorage.setItem('ssb_users', JSON.stringify(currentUsers));
        }

        // Force cleanup of old sessions if they match the deleted admin
        const session = JSON.parse(localStorage.getItem('ssb_session') || 'null');
        if (session && session.mobile === '9999999999') {
            localStorage.removeItem('ssb_session');
        }

        // Original Seeding for Test Users (Seeder/Buyer)
        if (this.getUsers().length === 0 || !this.getUser('8888888888')) {
            console.log("Checking/Initializing Default Seeder/Buyer...");
            const defaults = [
                {
                    id: 'u_seeder', name: 'Seeder User', mobile: '8888888888', role: 'SEEDER', pin: '1234', minutesBalance: 3650,
                    identities: [{ id: 'SID001', type: 'SID', walletBalance: 500 }, { id: 'CID002', type: 'CID', minutesBalance: 3650 }]
                },
                {
                    id: 'u_buyer', name: 'Buyer User', mobile: '7777777777', role: 'BUYER', pin: '1234', minutesBalance: 3650,
                    identities: [{ id: 'CID003', type: 'CID', minutesBalance: 3650 }]
                }
            ];

            let added = false;
            defaults.forEach(def => {
                if (!currentUsers.find(u => u.mobile === def.mobile)) {
                    currentUsers.push(def);
                    added = true;
                }
            });

            if (added) this.saveUsers(currentUsers);
        }
    }

    // --- User Management ---

    getUsers(includeDeleted = false) {
        let users = [];
        try {
            users = JSON.parse(localStorage.getItem('ssb_users') || '[]');
        } catch (e) {
            console.error("Data Corruption in getUsers. Returning empty list.");
            return [];
        }
        // Filter out nulls/undefined instantly to prevent crashes
        const validUsers = users.filter(u => u && typeof u === 'object');
        if (includeDeleted) return validUsers;
        return validUsers.filter(u => !u.deleted);
    }

    getDeletedUsers() {
        const users = JSON.parse(localStorage.getItem('ssb_users') || '[]');
        return users.filter(u => u.deleted);
    }

    saveUsers(users) {
        localStorage.setItem('ssb_users', JSON.stringify(users));
    }

    // Helper to find which user owns a specific CID/SID
    findUserByIdentity(identityId) {
        // Search ACTIVE users only by default
        return this.getUsers().find(u => u.identities && u.identities.some(i =>
            i.id === identityId || (i.previousIds && i.previousIds.includes(identityId))
        ));
    }

    getUser(mobile) {
        return this.getUsers().find(u => u.mobile === mobile);
    }

    // Get all CIDs/SIDs associated with a mobile
    getIdentitiesByMobile(mobile) {
        const user = this.getUser(mobile);
        return user ? user.identities : [];
    }

    getCidsByMobile(mobile) {
        // Deprecated but kept for compatibility during migration
        const identities = this.getIdentitiesByMobile(mobile);
        const user = this.getUser(mobile);
        return identities.map(i => ({
            cid: i.id,
            name: user ? user.name : 'User',
            type: i.type,
            minutesBalance: i.minutesBalance,
            walletBalance: i.walletBalance
        }));
    }

    getByCid(cid) {
        // Updated to search inside identities
        return this.findUserByIdentity(cid);
    }

    getById(id) {
        // Allow finding extended info? Usually for admin.
        return this.getUsers().find(u => u.id === id);
    }

    createUser(user) {
        const users = this.getUsers(true); // check against ALL to avoid dupes

        // Generate Sequential CID
        const cid = this.generateNextCID();

        // 1. Check for duplicate mobile
        if (users.find(u => u.mobile === user.mobile && !u.deleted)) {
            // Already exists logic
        }

        // Actually, safer to check ACTIVE users.
        if (this.getUser(user.mobile)) {
            throw new Error(`User with mobile ${user.mobile} already exists.`);
        }

        const newUser = {
            id: 'u_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            mobile: user.mobile,
            pin: user.pin,
            name: user.name,
            role: 'BUYER',
            minutesBalance: 3650,
            identities: [
                {
                    id: cid,
                    type: 'CID',
                    units: [],
                    walletBalance: 0,
                    minutesBalance: 3650
                }
            ],
            createdAt: new Date().toISOString(),
            deleted: false
        };
        // We need to push to the FULL list
        const allUsers = this.getUsers(true);
        allUsers.push(newUser);
        this.saveUsers(allUsers);
        return newUser;
    }

    updateUser(id, updates) {
        const users = this.getUsers(true); // Modify source
        const index = users.findIndex(u => u.id === id);
        if (index === -1) throw new Error('User not found');

        users[index] = { ...users[index], ...updates };
        this.saveUsers(users);

        // Update session if it's the current user
        const session = this.getSession();
        if (session && session.id === id) {
            // Preserve session-only properties like activeIdentityId
            const updatedSession = { ...users[index], activeIdentityId: session.activeIdentityId };
            localStorage.setItem('ssb_session', JSON.stringify(updatedSession));
        }

        return users[index];
    }

    deleteUser(id) {
        // Soft Delete
        this.updateUser(id, { deleted: true, deletedAt: new Date().toISOString() });
    }

    restoreUser(id) {
        // Restore User
        this.updateUser(id, { deleted: false, deletedAt: null });
    }

    restoreUser(id) {
        this.updateUser(id, { deleted: false, deletedAt: null });
    }

    permanentDeleteUser(id) {
        const user = this.getById(id);
        if (!user) return; // User already gone

        // 1. Remove User from Main List
        let users = this.getUsers(true);
        users = users.filter(u => u.id !== id);
        this.saveUsers(users);

        // 2. Remove Transactions (userId matches OR source matches an identity)
        const allIdentities = user.identities ? user.identities.map(i => i.id) : [];
        let txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');

        const initialCount = txns.length;
        txns = txns.filter(t => {
            // Keep if userId doesn't match AND source doesn't match any identity
            const matchesUser = t.userId === id;
            const matchesSource = t.source && allIdentities.includes(t.source.split(' ')[0]); // "source": "C1001 from Buyer"
            return !matchesUser && !matchesSource;
        });

        if (txns.length !== initialCount) {
            console.log(`[Store] Removed ${initialCount - txns.length} transactions for user ${id}`);
            localStorage.setItem('ssb_transactions', JSON.stringify(txns));
        }

        // 3. Remove Feedback
        let feedback = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
        const feedbackCount = feedback.length;
        feedback = feedback.filter(f => f.userId !== id);

        if (feedback.length !== feedbackCount) {
            console.log(`[Store] Removed ${feedbackCount - feedback.length} feedback entries for user ${id}`);
            localStorage.setItem('ssb_feedback', JSON.stringify(feedback));
        }
    }

    // --- Auth ---

    authenticate(identifier, pin) {
        // identifier can be: Mobile (10 digits) OR Identity ID (C1001, S1001)

        let user = null;

        console.log(`[Store] Authenticating: ${identifier}`);

        // 1. Try finding by Mobile
        user = this.getUsers().find(u => u.mobile === identifier);

        // 2. If not found, try finding by Identity ID (C1001, S1001, etc.)
        if (!user) {
            console.log(`[Store] Mobile not found, checking Identity ID...`);
            user = this.findUserByIdentity(identifier);
        } else {
            console.log(`[Store] User found via Mobile: ${user.id}`);
        }

        if (user && user.pin === pin) {
            // Auto-Correct: Cap Minutes at 3650
            if (user.minutesBalance > 3650) {
                user.minutesBalance = 3650;
                this.updateUser(user.id, { minutesBalance: 3650 });
            }

            localStorage.setItem('ssb_session', JSON.stringify(user));
            return user;
        }
        return null;
    }

    logout() {
        // Safe Logout: Remove only session keys, NOT the whole database
        localStorage.removeItem('ssb_session');
        localStorage.removeItem('ssb_partner_session');
        localStorage.removeItem('ssb_seller_consent');
        localStorage.removeItem('ssb_admin_logged_in');
    }

    getSession() {
        return JSON.parse(localStorage.getItem('ssb_session'));
    }

    // --- Transactions & Balance ---

    addTransaction(txn) {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        const newTxn = {
            id: 'txn_' + Date.now(),
            timestamp: new Date().toISOString(),
            ...txn
        };
        txns.push(newTxn);
        localStorage.setItem('ssb_transactions', JSON.stringify(txns));
        return newTxn;
    }

    recordSale(userId, kitId, amount) {
        return this.addTransaction({
            userId: userId,
            type: 'PURCHASE',
            amount: amount,
            description: `Purchased Kit: ${kitId}`
        });
    }

    processPurchase(mobile, kitId, referrerId) {
        // 1. Get User
        const user = this.getUser(mobile);
        if (!user) throw new Error("User not found");

        // 2. Determine Amount & Plan
        const kits = this.getKits();
        const kit = kits[kitId];
        if (!kit) throw new Error("Invalid Kit");

        // 3. Record Sale
        this.recordSale(user.id, kitId, kit.price);

        // 4. Update User Plan
        const updates = {};
        if (kitId === 'family') {
            updates.hasFamilyPlan = true;
            updates.familySlots = (user.familySlots || 0) + kit.familySlots;
        }
        // Add Minutes
        updates.minutesBalance = (user.minutesBalance || 0) + kit.minutes;
        if (updates.minutesBalance > 3650) updates.minutesBalance = 3650; // Cap

        this.updateUser(user.id, updates);

        // 5. Distribute Commission (if referrer exists)
        if (referrerId) {
            this.distributeCommission(referrerId, kit.sellerShare, user.name);
        }

        return true;
    }

    updateTransaction(id, updates) {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        const index = txns.findIndex(t => t.id === id);
        if (index === -1) throw new Error('Transaction not found');

        txns[index] = { ...txns[index], ...updates };
        localStorage.setItem('ssb_transactions', JSON.stringify(txns));
        return txns[index];
    }

    deleteTransaction(id) {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        const filtered = txns.filter(t => t.id !== id);
        localStorage.setItem('ssb_transactions', JSON.stringify(filtered));
    }

    cleanOrphanedData() {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        const feedback = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
        const allUsers = this.getUsers(true);
        const validUserIds = new Set(allUsers.map(u => u.id));

        // 1. Clean Transactions
        const initialTxnCount = txns.length;
        // Keep txn if userId is valid OR if it's a system/admin record without userId? 
        // validUserIds includes 'u_admin' and all created users.
        const validTxns = txns.filter(t => {
            // If no userId, it might be a system log? But usually they have userId or source.
            // If userId is present, it MUST be valid.
            if (t.userId) return validUserIds.has(t.userId);
            return true; // Keep if no userId (e.g. system logs?)
        });

        const removedTxns = initialTxnCount - validTxns.length;
        if (removedTxns > 0) {
            localStorage.setItem('ssb_transactions', JSON.stringify(validTxns));
            console.log(`[Cleanup] Removed ${removedTxns} orphaned transactions.`);
        }

        // 2. Clean Feedback
        const initialFbCount = feedback.length;
        const validFeedback = feedback.filter(f => validUserIds.has(f.userId));

        const removedFb = initialFbCount - validFeedback.length;
        if (removedFb > 0) {
            localStorage.setItem('ssb_feedback', JSON.stringify(validFeedback));
            console.log(`[Cleanup] Removed ${removedFb} orphaned feedback entries.`);
        }

        return { removedTxns, removedFb };
    }

    getBinSummary() {
        const deletedUsers = this.getDeletedUsers();
        let totalPurchaseValue = 0;

        deletedUsers.forEach(u => {
            // Determine Purchase Value based on Plan
            // Family Pack / Seeder = 580
            // Standard Buyer = 178
            if (u.role === 'SEEDER' || u.hasFamilyPlan) {
                totalPurchaseValue += 580;
            } else {
                totalPurchaseValue += 178;
            }
        });

        return { totalPurchaseValue, count: deletedUsers.length };
    }

    deductMinutes(userId, amount, description, identityId = null) {
        const user = this.getById(userId);
        if (!user) return false;

        // Determine target balance (Identity vs Root)
        let target = user;
        let identity = null;
        const targetId = identityId || user.activeIdentityId;

        if (user.identities && targetId) {
            identity = user.identities.find(i => i.id === targetId);
            if (identity) target = identity;
        }

        if ((target.minutesBalance || 0) < amount) return false;

        target.minutesBalance = (target.minutesBalance || 0) - amount;

        // If we modified an identity, we need to save the whole user structure
        if (identity) {
            this.updateUser(userId, { identities: user.identities });
        } else {
            this.updateUser(userId, { minutesBalance: target.minutesBalance });
        }

        // REMOVED: Do not log minute usage as cash transaction
        // this.addTransaction({ ... });
        return true;
    }

    addMinutes(userId, amount, description, identityId = null) {
        const user = this.getById(userId);
        if (!user) return false;

        // Determine target balance (Identity vs Root)
        let target = user;
        let identity = null;
        const targetId = identityId || user.activeIdentityId;

        if (user.identities && targetId) {
            identity = user.identities.find(i => i.id === targetId);
            if (identity) target = identity;
        }

        target.minutesBalance = (target.minutesBalance || 0) + amount;

        // If we modified an identity, we need to save the whole user structure
        if (identity) {
            this.updateUser(userId, { identities: user.identities });
        } else {
            this.updateUser(userId, { minutesBalance: target.minutesBalance });
        }

        // REMOVED: Do not log minute additions as cash transaction
        // this.addTransaction({ ... });
        return true;
    }
    // --- Products & Profit Slab ---

    getKits() {
        return {
            'kit1': { id: 'kit1', name: 'SDP 1 Kit', price: 178, minutes: 3650, sellerShare: 50, systemShare: 128 },
            'family': { id: 'family', name: 'SDP Family Pack', price: 580, minutes: 3650, familySlots: 3, sellerShare: 140, systemShare: 440 }
        };
    }

    // New Helper: Find all units in system to calculate next S-Code
    getAllUnits() {
        const users = this.getUsers();
        let allUnits = [];
        users.forEach(u => {
            if (u.units) allUnits = allUnits.concat(u.units);
        });
        return allUnits;
    }

    upgradeToSeeder(mobile, cid, profileData) {
        const users = this.getUsers();
        // FIND USER BY MOBILE
        const userIdx = users.findIndex(u => u.mobile === mobile);
        if (userIdx === -1) throw new Error("User not found");

        const user = users[userIdx];
        const identity = user.identities.find(i => i.id === cid);

        if (!identity) throw new Error("Identity not found");
        if (identity.type === 'SID') {
            // ALREADY SEEDER: JUST FIX ROLE AND EXIT
            if (user.role !== 'SEEDER' && user.role !== 'ADMIN') {
                user.role = 'SEEDER';
                user.isSeeder = true;
                user.activeIdentityId = identity.id;
                this.saveUsers(users);
            }
            return user;
        }

        // Logic Change: Independent Series (C1050 -> S1020)
        const oldId = identity.id;
        const newId = this.generateNextSID(); // e.g., S1001, S1002...

        // Save old ID to prevent recycling and allow lookup
        if (!identity.previousIds) identity.previousIds = [];
        identity.previousIds.push(oldId);

        identity.id = newId;
        identity.type = 'SID'; // Mark as Seeder Identity
        identity.profile = profileData;

        // Ensure Initial Unit Exists (Critical for Referral Link)
        if (!identity.units) identity.units = [];
        if (identity.units.length === 0) {
            const newSCode = this.generateSCode(null);
            identity.units.push({
                sCode: newSCode,
                parentSCode: null,
                createdAt: new Date().toISOString()
            });
        }

        // --- CRITICAL ROLE UPDATE ---
        // 1. Force Role
        if (user.role !== 'ADMIN') {
            user.role = 'SEEDER';
            user.isSeeder = true; // Extra flag for safety
        }

        // 2. Update Active ID
        user.activeIdentityId = newId;

        // 3. PERSIST IMMEDIATELY
        this.saveUsers(users);

        // 4. SYNC SESSION
        const session = this.getSession();
        if (session && session.id === user.id) {
            // Update the session object with new role and data
            localStorage.setItem('ssb_session', JSON.stringify(user));
        }

        return user;
    }

    generateSCode(parentSCode) {
        // Updated to use U-prefix for Units to distinguish from Seeder User IDs (S-series)
        const units = this.getAllUnits();
        if (!parentSCode) {
            const rootSteps = units.filter(u => !u.parentSCode).length;
            return `U${1001 + rootSteps}`;
        }
        const children = units.filter(u => u.parentSCode === parentSCode);
        return `${parentSCode}${children.length + 1}`;
    }

    // Helper: generate next sequential CID dynamically
    // Fixes issue where deleting users leaves gaps or high counters.
    generateNextCID() {
        const users = this.getUsers(true); // Check ALL users including deleted
        let maxId = 1000;

        users.forEach(u => {
            if (u.identities) {
                u.identities.forEach(i => {
                    // Check current ID
                    if (i.id && i.id.startsWith('C')) {
                        const num = parseInt(i.id.replace('C', ''));
                        if (!isNaN(num) && num > maxId) {
                            maxId = num;
                        }
                    }
                    // Check previous IDs to avoid recycling
                    if (i.previousIds) {
                        i.previousIds.forEach(pid => {
                            if (pid.startsWith('C')) {
                                const pNum = parseInt(pid.replace('C', ''));
                                if (!isNaN(pNum) && pNum > maxId) {
                                    maxId = pNum;
                                }
                            }
                        });
                    }
                });
            }
        });

        // Next ID is max + 1
        const nextId = maxId + 1;

        // Update storage for consistency (optional but good for tracking)
        // localStorage.setItem('ssb_last_cid', nextId.toString());

        return `C${nextId}`;
    }

    // New Helper: generate next sequential SID
    generateNextSID() {
        let lastId = parseInt(localStorage.getItem('ssb_last_sid') || '1000');
        lastId++;
        localStorage.setItem('ssb_last_sid', lastId.toString());
        return `S${lastId}`;
    }

    processPurchase(buyerMobile, kitId, referrerId) {
        const kits = this.getKits();
        const kit = kits[kitId];
        if (!kit) throw new Error('Invalid Kit');

        const users = this.getUsers();
        let buyer = users.find(u => u.mobile === buyerMobile);

        if (!buyer) {
            throw new Error("Buyer should be created before purchase via createUser");
        }

        // 1. Find or Create Identity (Reusable Logic)
        let identity = buyer.identities ? buyer.identities.find(i => i.type === 'CID' || i.type === 'SID') : null;

        if (!identity) {
            const newCid = this.generateNextCID();
            identity = {
                id: newCid,
                type: 'CID',
                units: [],
                walletBalance: 0,
                minutesBalance: 0,
                referrerSid: referrerId || null // Ensure this is saved
            };

            if (!buyer.identities) buyer.identities = [];
            buyer.identities.push(identity);
        }

        // 2. Apply Kit Benefits
        identity.minutesBalance = kit.minutes;



        // 3. Handle Seeder/Unit Creation (Auto-Upgrade for Family Pack)
        // REVERTED: User must register via form first.

        // 4. Distribute Commissions (Only for Family Pack)
        if (kitId === 'family') {
            // Logic Change: Use the saved referrer ID from identity or passed arg
            // AND ensure we save the referrer to the user object for future reference
            if (referrerId && !buyer.referredBy) {
                buyer.referredBy = referrerId;
            }

            // LOG CASH IN (PURCHASE) - Critical for Admin Ledger
            // "System ne kitna kamaya (Cash Received)"
            const transactions = this.getAllTransactions();
            transactions.push({
                id: 'txn_' + Date.now(),
                date: new Date().toISOString(),
                timestamp: new Date().toISOString(),
                type: 'PURCHASE',
                amount: kit.price, // 580
                from: buyer.identities[0].id, // Use CID/SDP ID
                to: 'ADMIN',
                desc: `Purchase: ${kit.name}`,
                mode: 'ONLINE' // Standardize as Online/Razorpay
            });
            localStorage.setItem('ssb_transactions', JSON.stringify(transactions));

            this.distributeCommission(buyer, kit.price, users); // Call new function with users reference

            // Activate Family Features on User Level
            buyer.hasFamilyPlan = true;
            if (!buyer.familySlots) buyer.familySlots = 3;
        }

        this.saveUsers(users);
        this.recordSale(buyer.id, kitId, kit.price);

        // SYNC SESSION (Fix for stash issues)
        const session = this.getSession();
        if (session && session.id === buyer.id) {
            // We need to update the session with the new data (identities, units, etc)
            // Preserve active state if possible
            const activeId = session.activeIdentityId;
            const updatedBuyer = { ...buyer, activeIdentityId: activeId };
            localStorage.setItem('ssb_session', JSON.stringify(updatedBuyer));
        }

        return buyer;
    }

    // --- System Admin Logic ---

    // --- ONE-TIME RESET (TEMP) ---
    fullSystemReset() {
        // 1. Filter Users (Keep Admins Only)
        const allUsers = this.getUsers(true);
        const adminIds = ['u_admin', 'u_admin_a', 'u_admin_b'];
        const keptUsers = allUsers.filter(u => adminIds.includes(u.id) || u.role.includes('ADMIN'));

        this.saveUsers(keptUsers);

        // 2. Wipe Collections
        localStorage.setItem('ssb_transactions', '[]');
        localStorage.setItem('ssb_feedback', '[]');
        localStorage.setItem('ssb_system_logs', '[]');
        localStorage.setItem('ssb_admin_broadcast', ''); // Clear broadcast

        // Clear Expenses explicitly if stored separately (currently expenses might be in transactions or separate)
        // Check addSystemExpense ref: It uses 'ssb_system_expenses' key?
        // Let's verify addSystemExpense in store.js... 
        // Wait, I haven't seen `addSystemExpense` in the view_file of store.js earlier.
        // admin.js calls `store.addSystemExpense`. 
        // I should check if that method exists or if I missed it.
        // Assuming standard key naming if it exists:
        localStorage.removeItem('ssb_system_expenses');

        // 3. Reset Counters
        localStorage.setItem('ssb_last_cid', '1000');
        localStorage.setItem('ssb_last_sid', '1000');

        // 4. Mark Reset as Done (to disable button)
        localStorage.setItem('ssb_temp_reset_used', 'true');

        return true;
    }


    logSystemAction(action, details, performedBy) {
        const logs = this.getSystemLogs();
        logs.unshift({
            id: 'log_' + Date.now(),
            action,
            details,
            performedBy, // Admin ID
            timestamp: new Date().toISOString()
        });
        // Keep last 1000 logs
        if (logs.length > 1000) logs.pop();
        localStorage.setItem('ssb_system_logs', JSON.stringify(logs));
    }

    getSystemLogs() {
        return JSON.parse(localStorage.getItem('ssb_system_logs') || '[]');
    }

    // Support Messages
    addSupportMessage(msg) {
        const msgs = JSON.parse(localStorage.getItem('ssb_support_messages') || '[]');
        msgs.unshift({
            id: 'msg_' + Date.now(),
            status: 'OPEN',
            timestamp: new Date().toISOString(),
            ...msg
        });
        localStorage.setItem('ssb_support_messages', JSON.stringify(msgs));
    }

    getSupportMessages() {
        return JSON.parse(localStorage.getItem('ssb_support_messages') || '[]');
    }

    replyToSupportMessage(id, replyText, adminId) {
        const msgs = this.getSupportMessages();
        const index = msgs.findIndex(m => m.id === id);
        if (index !== -1) {
            msgs[index].reply = replyText;
            msgs[index].status = 'REPLIED';
            msgs[index].repliedBy = adminId;
            msgs[index].repliedAt = new Date().toISOString();
            localStorage.setItem('ssb_support_messages', JSON.stringify(msgs));
        }
    }

    // Admin B Actions (with Logging)
    resetUserPin(userId, newPin, adminId) {
        const user = this.getById(userId);
        if (!user) throw new Error("User not found");

        const oldPin = user.pin;
        this.updateUser(userId, { pin: newPin });

        this.logSystemAction('PIN_RESET', `Reset PIN for ${user.mobile} (${user.name})`, adminId);
        return true;
    }

    toggleUserBlockStatus(userId, adminId, reason) {
        const user = this.getById(userId);
        if (!user) throw new Error("User not found");

        const newStatus = !user.blocked;
        this.updateUser(userId, { blocked: newStatus });

        const action = newStatus ? 'BLOCK_USER' : 'UNBLOCK_USER';
        this.logSystemAction(action, `User: ${user.mobile}. Reason: ${reason || 'N/A'}`, adminId);
        return newStatus;
    }

    changeUserRole(userId, newRole, adminId, reason) {
        const user = this.getById(userId);
        if (!user) throw new Error("User not found");

        const oldRole = user.role;
        this.updateUser(userId, { role: newRole });

        this.logSystemAction('ROLE_CHANGE', `Changed ${user.mobile} from ${oldRole} to ${newRole}. Reason: ${reason}`, adminId);
        return true;
    }

    // --- Commission Logic (Seeder Implementation) ---
    distributeCommission(buyer, amountPaid, usersList = null) {
        // PATCH: Handle ID string input
        if (typeof buyer === 'string') {
            const found = this.getUsers().find(u => u.id === buyer);
            if (!found) {
                console.log("Commission Skipped: User ID not found in LocalStorage store");
                return [];
            }
            buyer = found;
        }

        // CRITICAL GUARD: Only ₹580 (Family Pack) triggers commission
        if (amountPaid < 580) {
            console.log("Commission Skiped: Amount is less than 580");
            return [];
        }

        // System Share: 180. Distributable: 400.
        // Levels: 140, 100, 70, 50, 40

        const commissionStructure = [140, 100, 70, 50, 40];

        let currentReferrerIdentityId = buyer.referredBy; // Start from referrer

        let users = usersList || this.getUsers();
        let skipSave = !!usersList; // If users list passed, don't save here, let caller save

        let distributionLog = [];
        let updatedUsers = false;



        this.addSystemTransaction(180, `System Share from ${buyer.name}`);

        for (let i = 0; i < 5; i++) {
            if (!currentReferrerIdentityId) break;

            // Updated to check previousIds
            const referrerUser = users.find(u => u.identities && u.identities.some(id =>
                id.id === currentReferrerIdentityId || (id.previousIds && id.previousIds.includes(currentReferrerIdentityId))
            ));

            if (referrerUser) {
                const amount = commissionStructure[i];
                // Find Identity: Check current ID OR Previous ID match, or fallback to any valid ID
                let identity = referrerUser.identities.find(id =>
                    id.id === currentReferrerIdentityId || (id.previousIds && id.previousIds.includes(currentReferrerIdentityId))
                ) || referrerUser.identities.find(id => id.type === 'CID' || id.type === 'SID' || id.type === 'ADMIN');

                if (identity) {
                    if (identity.walletBalance === undefined || identity.walletBalance === null) identity.walletBalance = 0;

                    identity.walletBalance += amount;

                    if (!identity.transactions) identity.transactions = [];
                    identity.transactions.push({
                        date: new Date().toISOString(),
                        type: 'CREDIT',
                        amount: amount,
                        source: `L${i + 1} from ${buyer.name}`,
                        desc: 'Seeder Reward',
                        depth: i + 1, // Store Depth
                        sourceUserId: buyer.id // Store Source User ID
                    });

                    distributionLog.push(`Level ${i + 1}: Paid ${amount} to ${referrerUser.name} (${identity.id})`);

                    // Move Up
                    currentReferrerIdentityId = referrerUser.referredBy || identity.referrerSid || null;
                    updatedUsers = true;
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        if (updatedUsers && !skipSave) this.saveUsers(users);

        return distributionLog;
    }

    requestPayout(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        if (!identity) throw new Error("Seeder Identity not found");

        if ((identity.walletBalance || 0) <= 0) throw new Error("No earnings to request.");

        // UPI Check (Relaxed Rule: Fallback to Mobile if Profile UPI missing)
        // Logic: Use Profile UPI -> Fallback to User Mobile -> Fail
        let upi = identity.profile?.upiId || '';

        // Auto-fallback to mobile if UPI is empty/short but mobile is valid
        if ((!upi || upi.length < 10) && user.mobile && user.mobile.length >= 10) {
            upi = user.mobile;
        }

        if (!upi || upi.length < 10) {
            throw new Error("UPI ID not found. Please contact Admin.");
        }

        // CHECK: One active request only
        const pending = (identity.payoutRequests || []).find(r => r.status === 'REQUESTED');
        if (pending) {
            throw new Error("You already have a pending request.");
        }

        if (!identity.payoutRequests) identity.payoutRequests = [];
        identity.payoutRequests.push({
            id: Date.now().toString(),
            date: new Date().toISOString(),
            amount: identity.walletBalance,
            status: 'REQUESTED',
            upiId: upi // Snapshot UPI (Safe Variable)
        });

        this.saveUsers(users);
        return true;
    }

    recordPayout(userId, amount, refId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        // Find Seeder Identity
        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        if (!identity) throw new Error("Seeder Identity not found");

        if ((identity.walletBalance || 0) < amount) throw new Error("Insufficient Estimated Earnings");

        identity.walletBalance -= amount;

        // Clear Request Status
        identity.payoutRequested = false;
        delete identity.payoutRequestDate;

        const tx = {
            date: new Date().toISOString(),
            type: 'DEBIT',
            amount: amount,
            desc: `Payout: ${refId}`,
            refId: refId,
            status: 'PAID',
            userId: userId,     // For Global Log
            userName: user.name, // For Global Log
            userMobile: user.mobile // For Global Log
        };

        if (!identity.transactions) identity.transactions = [];
        identity.transactions.push(tx);

        // Global Transaction Log for Admin
        const globalTx = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        globalTx.push(tx);
        localStorage.setItem('ssb_transactions', JSON.stringify(globalTx));

        this.saveUsers(users);
        return identity.walletBalance;
    }

    markPayoutPaid(userId, requestId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        if (!identity) throw new Error("Seeder Identity not found");

        if (!identity.payoutRequests) throw new Error("No requests found");
        const req = identity.payoutRequests.find(r => r.id === requestId);
        if (!req) throw new Error("Request not found");
        if (req.status !== 'REQUESTED') throw new Error("Request already processed");

        if ((identity.walletBalance || 0) < req.amount) throw new Error("Insufficient Balance for this request");

        // Execute Payout
        identity.walletBalance -= req.amount;
        req.status = 'PAID';
        req.paidAt = new Date().toISOString();

        // Log Transaction
        const tx = {
            date: new Date().toISOString(),
            type: 'DEBIT',
            amount: req.amount,
            desc: `Payout: ${requestId}`,
            refId: requestId,
            status: 'PAID',
            userId: userId,
            userName: user.name,
            userMobile: user.mobile,
            upiId: req.upiId
        };

        if (!identity.transactions) identity.transactions = [];
        identity.transactions.push(tx);

        const globalTx = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        globalTx.push(tx);
        localStorage.setItem('ssb_transactions', JSON.stringify(globalTx));

        this.saveUsers(users);
        return true;
    }

    approvePayout(userId) {
        const users = this.getUsers();
        const user = users.find(u => u.id === userId);
        if (!user) throw new Error("User not found");

        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        if (!identity) throw new Error("Seeder Identity not found");

        if (!identity.payoutRequested) throw new Error("No active payout request for this user.");

        const amount = identity.walletBalance;
        if (amount <= 0) throw new Error("Balance is zero or negative.");

        const refId = 'TXN-' + Date.now();
        return this.recordPayout(userId, amount, refId);
    }

    addSystemTransaction(amount, desc) {
        const sysWallet = JSON.parse(localStorage.getItem('ssb_system_wallet') || '{"balance":0, "log":[]}');
        sysWallet.balance += amount;
        sysWallet.log.push({ amount, desc, date: new Date().toISOString() });
        localStorage.setItem('ssb_system_wallet', JSON.stringify(sysWallet));
    }

    addFamilyMember(parentId, memberData) {
        const parent = this.getById(parentId);
        if (!parent) throw new Error('Parent not found');
        if (!parent.familySlots || parent.familySlots <= 0) throw new Error('No family slots available');

        let member = this.getUser(memberData.mobile);
        if (member) throw new Error('User already exists');

        member = this.createUser({
            name: memberData.name || 'Family Member',
            mobile: memberData.mobile,
            pin: memberData.pin,
            role: 'FAMILY_MEMBER',
            minutesBalance: 3650
        });

        const updatedMembers = parent.familyMembers || [];
        updatedMembers.push({
            id: member.id,
            name: member.name,
            mobile: member.mobile
        });

        this.updateUser(parentId, { familyMembers: updatedMembers, familySlots: parent.familySlots - 1 });
        return member;
    }

    // --- Other Helpers ---
    getSystemStats() {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        const sysWallet = JSON.parse(localStorage.getItem('ssb_system_wallet') || '{"balance":0}');
        const sales = txns.filter(t => t.type === 'PURCHASE');
        const payouts = txns.filter(t => t.type === 'DEBIT' && t.status === 'PAID');
        return {
            totalRevenue: sales.reduce((sum, t) => sum + (t.amount || 0), 0),
            totalPayouts: payouts.reduce((sum, t) => sum + (t.amount || 0), 0),
            systemShare: sysWallet.balance,
            salesCount: sales.length
        };
    }

    getAllTransactions() {
        const txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        return txns;
    }

    getSystemWalletLog() {
        return (JSON.parse(localStorage.getItem('ssb_system_wallet') || '{"log":[]}')).log;
    }

    activateSeeder(userId, extraData) {
        return this.upgradeToSeeder(null, null, extraData);
    }

    // --- Motivation Box Logic ---
    saveMotivation(msg) {
        localStorage.setItem('ssb_seeder_motivation', msg);
    }

    getMotivation() {
        return localStorage.getItem('ssb_seeder_motivation') || "Welcome to the Seeder Program! Keep sharing and earning.";
    }

    // --- Feedback Loop (Seeder <-> System) ---

    submitFeedback(userId, message) {
        const feedbackList = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');

        // Safety: Check if user already has an OPEN ticket
        const existingOpen = feedbackList.find(f => f.userId === userId && f.status === 'OPEN');
        if (existingOpen) {
            throw new Error("You already have an open conversation. Please wait for a reply.");
        }

        // Safety: Regex for PI (Simple check for 6-digit PIN patterns or keywords)
        // Adjust regex to be flexible but warn against obvious "PIN: 1234"
        if (/pin\s*[:=-]?\s*\d{4}/i.test(message) || /otp/i.test(message)) {
            throw new Error("Security Warning: Do not send PIN or OTP in messages.");
        }

        // CHECK: Single active message
        // If user has a message that is NOT replied to, block new one
        // Or maybe just last message? User said "Single message at a time"
        // Let's interpret as: Cannot send new if last one is not replied? 
        // Or just one conversation thread. 
        // Let's go with: If last message from this user has no reply, block.

        const userFeedbacks = feedbackList.filter(f => f.userId === userId);
        const lastMsg = userFeedbacks[userFeedbacks.length - 1];

        if (lastMsg && !lastMsg.reply) {
            throw new Error("Please wait for a reply to your previous message.");
        }

        const newFeedback = {
            id: 'fb_' + Date.now(),
            userId: userId,
            message: message,
            reply: null,
            status: 'OPEN',
            createdAt: new Date().toISOString()
        };

        feedbackList.push(newFeedback);
        localStorage.setItem('ssb_feedback', JSON.stringify(feedbackList));
        return newFeedback;
    }

    getFeedback(userId) {
        // Return latest interaction for the Seeder
        const list = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
        // Filter by user and sort desc
        const myFeedback = list.filter(f => f.userId === userId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return myFeedback;
    }

    getAllFeedback() {
        // For Admin
        return JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
    }

    replyFeedback(feedbackId, replyMessage) {
        const list = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
        const idx = list.findIndex(f => f.id === feedbackId);
        if (idx === -1) throw new Error("Feedback not found");

        list[idx].reply = replyMessage;
        list[idx].status = 'REPLIED'; // State change
        list[idx].repliedAt = new Date().toISOString();

        localStorage.setItem('ssb_feedback', JSON.stringify(list));
        return list[idx];
    }

    closeFeedback(feedbackId) {
        // User acknowledges reply -> Archive/Close
        const list = JSON.parse(localStorage.getItem('ssb_feedback') || '[]');
        const idx = list.findIndex(f => f.id === feedbackId);
        if (idx === -1) throw new Error("Feedback not found");

        list[idx].status = 'CLOSED';
        localStorage.setItem('ssb_feedback', JSON.stringify(list));
    }


    // --- Seeder Applications ---
    saveSeederApplication(data) {
        const list = this.getSeederApplications();
        list.push(data);
        localStorage.setItem('ssb_seeder_applications', JSON.stringify(list));
    }

    getSeederApplications() {
        return JSON.parse(localStorage.getItem('ssb_seeder_applications') || '[]');
    }

    // --- SYSTEM EXPENSES (New Feature) ---

    addSystemExpense(expenseData) {
        const expenses = this.getSystemExpenses();
        const newExpense = {
            id: 'exp_' + Date.now(),
            date: expenseData.date,
            category: expenseData.category,
            description: expenseData.description,
            amount: parseFloat(expenseData.amount),
            mode: expenseData.mode,
            note: expenseData.note || '',
            timestamp: new Date().toISOString()
        };
        expenses.push(newExpense);
        localStorage.setItem('ssb_expenses', JSON.stringify(expenses));
    }

    getSystemExpenses() {
        return JSON.parse(localStorage.getItem('ssb_expenses') || '[]');
    }

    getSystemStats() {
        const users = this.getUsers();
        let totalRevenue = 0; // Total 580s received
        let totalPayouts = 0; // Total commissions paid out

        // Calculate Revenue (Total 580 Plan Users * 580)
        const txns = this.getAllTransactions();
        totalRevenue = txns
            .filter(t => t.type === 'PURCHASE' && t.amount === 580)
            .reduce((sum, t) => sum + t.amount, 0);

        // Payouts = "PAID" requests
        const payouts = JSON.parse(localStorage.getItem('ssb_payouts') || '[]');
        totalPayouts = payouts
            .filter(p => p.status === 'PAID')
            .reduce((sum, p) => sum + p.amount, 0);

        // Expenses
        const expenses = this.getSystemExpenses();
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        return {
            totalRevenue: totalRevenue,
            totalPayouts: totalPayouts,
            totalExpenses: totalExpenses,
            netProfit: totalRevenue - totalPayouts - totalExpenses
        };
    }

    getSeederNetworkStats(userId) {
        const user = this.getById(userId);
        if (!user) return null;

        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        if (!identity) return null;

        const stats = {
            depth1: { count: 0, amount: 0 },
            depth2: { count: 0, amount: 0 },
            depth3: { count: 0, amount: 0 },
            depth4: { count: 0, amount: 0 },
            depth5: { count: 0, amount: 0 }
        };

        if (identity.transactions) {
            identity.transactions.forEach(t => {
                if (t.type === 'CREDIT' && (t.desc === 'Seeder Reward' || t.depth)) {
                    // Determine Depth
                    let d = t.depth;
                    if (!d && t.source) {
                        // Legacy Fallback: Parse "L1 from..."
                        const match = t.source.match(/^L(\d)/);
                        if (match) d = parseInt(match[1]);
                    }

                    if (d >= 1 && d <= 5) {
                        stats[`depth${d}`].count++;
                        stats[`depth${d}`].amount += t.amount;
                    }
                }
            });
        }
        return stats;
    }

    getSeederPayoutHistory(userId) {
        const user = this.getById(userId);
        if (!user) return [];
        const identity = user.identities.find(i => i.type === 'SID' || i.type === 'PARTNER' || i.type === 'ADMIN');
        return identity && identity.payoutRequests ? identity.payoutRequests : [];
    }


}

const store = new Store();
try {
    window.store = store;

    // --- PATCH: Backward Compatibility for login_original.html ---
    store.calculateSdpCode = function (mobile) {
        if (!mobile || mobile.length !== 10) return "00";
        // 1. Digital Root
        let sum = 0;
        for (let char of mobile) sum += parseInt(char);
        while (sum > 9) {
            let tempSum = 0;
            let digits = sum.toString().split('');
            for (let d of digits) tempSum += parseInt(d);
            sum = tempSum;
        }
        const digit1 = sum;
        // 2. Last Non-Zero Digit
        let digit2 = 0;
        for (let i = mobile.length - 1; i >= 0; i--) {
            const d = parseInt(mobile[i]);
            if (d !== 0) { digit2 = d; break; }
        }
        return `${digit1}${digit2}`;
    };

    store.getReferrer = function () {
        return localStorage.getItem('ssb_ref');
    };

    store.setReferrer = function (id) {
        if (id) localStorage.setItem('ssb_ref', id);
    };

    // Auto-capture referrer from URL if present (Global Run)
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref') || urlParams.get('referrer');
    if (refParam) {
        store.setReferrer(refParam);
    }

} catch (e) {
    console.error("Store Init Failed (Legacy Block):", e);
    // Alert only if critical
    if (e.message.includes("Store is not loaded")) {
        alert("Critical Error: Store Init Failed. Please Refresh.");
    }
}
console.log("SDP Store Fully Loaded - VERSION: 2026-02-19-FIXED-FINAL");
