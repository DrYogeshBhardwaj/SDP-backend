class Store {
    constructor() {
        this.DB_VERSION = 4;
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

        // 2. Robust Seed: Always ensure Admin exists & has Identity for Login Dropdown
        let currentUsers = [];
        try {
            currentUsers = JSON.parse(localStorage.getItem('ssb_users') || '[]');
        } catch (e) {
            console.error("Critical Data Corruption detected in ssb_users. Resetting users list.");
            currentUsers = [];
        }

        // Safety: Ensure it is an array
        if (!Array.isArray(currentUsers)) currentUsers = [];
        let adminUser = currentUsers.find(u => u.id === 'u_admin');
        let needsSave = false;

        // Create Admin if missing
        if (!adminUser) {
            console.warn("Seeding Missing Admin User");
            adminUser = {
                id: 'u_admin',
                mobile: '9999999999',
                pin: '1234',
                name: 'Super Admin',
                role: 'ADMIN',
                minutesBalance: 99999,
                identities: [],
                createdAt: new Date().toISOString()
            };
            currentUsers.push(adminUser);
            needsSave = true;
        }

        // Fix Admin Identity (Required for Login Dropdown to show account)
        if (!adminUser.identities || adminUser.identities.length === 0) {
            console.warn("Fixing Admin Identity");
            adminUser.identities = [{
                id: 'ADMIN',
                type: 'ADMIN',
                units: [],
                walletBalance: 0,
                minutesBalance: 99999
            }];
            needsSave = true;
        }



        if (needsSave) {
            localStorage.setItem('ssb_users', JSON.stringify(currentUsers));
            localStorage.setItem('ssb_last_cid', '1001');
            localStorage.setItem('ssb_last_sid', '1000');
            storedVersion = 4;
            localStorage.setItem('ssb_db_version', '4');
        }

        // 3. Migration to V5: Fix 0 Balance Users
        if (storedVersion < 5) {
            const users = JSON.parse(localStorage.getItem('ssb_users') || '[]');
            let changed = false;
            users.forEach(u => {
                if ((u.minutesBalance || 0) === 0) {
                    u.minutesBalance = 3650;
                    changed = true;
                }
                if (u.identities) {
                    u.identities.forEach(i => {
                        if ((i.minutesBalance || 0) === 0) {
                            i.minutesBalance = 3650;
                            changed = true;
                        }
                    });
                }
            });
            if (changed) {
                localStorage.setItem('ssb_users', JSON.stringify(users));
            }
        }

        // Finalize Version logic
        if (storedVersion < this.DB_VERSION) {
            localStorage.setItem('ssb_db_version', this.DB_VERSION);
        }

        if (!localStorage.getItem('ssb_transactions')) {
            localStorage.setItem('ssb_transactions', JSON.stringify([]));
        }

        if (!localStorage.getItem('ssb_session')) {
            localStorage.setItem('ssb_session', JSON.stringify(null));
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

        // 1. Try finding by Mobile
        user = this.getUsers().find(u => u.mobile === identifier);

        // 2. If not found, try finding by Identity ID (C1001, S1001, etc.)
        if (!user) {
            user = this.findUserByIdentity(identifier);
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
        const userIdx = users.findIndex(u => u.mobile === mobile);
        if (userIdx === -1) throw new Error("User not found");

        const user = users[userIdx];
        const identity = user.identities.find(i => i.id === cid);

        if (!identity) throw new Error("Identity not found");
        if (identity.type === 'SID') throw new Error("Already a Seeder");

        // Logic Change: Independent Series (C1050 -> S1020)
        // OLD: const newId = oldId.replace('C', 'S');
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

        // Upgrade Role
        if (user.role !== 'ADMIN') user.role = 'SEEDER';

        // Critical Fix: Update activeIdentityId to the new SID
        // If we don't do this, session still points to old CID which no longer exists.
        user.activeIdentityId = newId;

        this.saveUsers(users);

        // SYNC SESSION: Update session if it's the registered user
        const session = this.getSession();
        if (session && session.id === user.id) {
            // Update the session object with new role and data
            // Also need to ensure activeIdentityId is pointed to new SID if it was pointing to old CID
            // We don't have access to activeIdentityId here easily unless we pass it or check session.
            // But we can just save the user object. App logic usually handles active ID.
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

    // --- Commission Logic (Seeder Implementation) ---
    distributeCommission(buyer, amountPaid, usersList = null) {
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
                        desc: 'Seeder Reward'
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

        // UPI Check
        if (!identity.profile || !identity.profile.upiId) throw new Error("Please add your UPI ID in Profile settings before requesting payout.");

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
            upiId: identity.profile.upiId // Snapshot UPI for this request
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
            name: memberData.name,
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
        return {
            totalRevenue: sales.reduce((sum, t) => sum + (t.amount || 0), 0),
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


}

const store = new Store();
try {
    window.store = store;
} catch (e) {
    console.error("Store Init Failed:", e);
    alert("Store Init Failed: " + e.message);
}
