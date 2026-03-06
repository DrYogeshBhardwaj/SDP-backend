/**
 * SSB Admin Dashboard Logic
 * Handles authentication, data visualization, and seller management.
 */

// Configuration
// Configuration
let ADMIN_PIN = localStorage.getItem('ssb_admin_pin') || "725653";
const STORAGE_KEYS = {
    PAID_HISTORY: 'ssb_paid_history',
    SELLERS: 'ssb_authorized_sellers',
    PARTNER_STATS: 'ssb_partner_stats'
};

// State
let currentPin = "";

// --- Authentication ---

window.enterPin = function (key) {
    if (key === 'C') {
        currentPin = "";
    } else if (key === '>') {
        verifyPin();
    } else {
        if (currentPin.length < 6) {
            currentPin += key;
        }
    }
    updatePinDisplay();

    // Auto-submit on 6 digits
    if (currentPin.length === 6) {
        setTimeout(verifyPin, 300);
    }
};

function updatePinDisplay() {
    const display = document.getElementById('pin-display');
    display.textContent = "*".repeat(currentPin.length);
}

function verifyPin() {
    if (currentPin === ADMIN_PIN) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        sessionStorage.setItem('ssb_admin_logged_in', 'true'); // PERSISTENCE
        loadDashboardData();
        switchSection('data'); // Default to Data View
    } else {
        alert("Invalid PIN");
        currentPin = "";
        updatePinDisplay();
    }
}

window.changeAdminPin = function () {
    const oldPin = prompt("Enter Current PIN:");
    if (oldPin !== ADMIN_PIN) return alert("Incorrect Current PIN");

    const newPin = prompt("Enter New 6-Digit PIN:");
    if (!newPin || newPin.length !== 6 || isNaN(newPin)) return alert("Invalid PIN. Must be 6 digits.");

    const confirmPin = prompt("Confirm New PIN:");
    if (newPin !== confirmPin) return alert("PINs do not match.");

    ADMIN_PIN = newPin;
    localStorage.setItem('ssb_admin_pin', newPin);
    alert("PIN Updated Successfully! Please login with new PIN next time.");
};

window.logout = function () {
    if (confirm("Logout from Admin Panel?")) {
        // Aggressively clear ALL session data to prevent "Old Screen" persistence
        sessionStorage.clear();
        localStorage.removeItem('ssb_admin_logged_in'); // Just in case
        window.location.href = 'index.html';
    }
};

// --- Navigation Logic ---
// --- Navigation Logic ---
window.switchSection = function (sectionId) {
    // PERSIST SELECTION
    sessionStorage.setItem('ssb_admin_section', sectionId);

    // Hide all sections - FORCE DISPLAY NONE
    document.querySelectorAll('.admin-section').forEach(el => {
        el.classList.add('hidden');
        el.style.display = 'none';
    });

    // Show target section - FORCE DISPLAY BLOCK
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    // Update active button state
    document.querySelectorAll('.tab-nav-btn').forEach(btn => btn.classList.remove('active'));
    // Tab Index Mapping is hard because text content varies.
    // Better to query buttons by onclick attribute or text content
    const btns = document.querySelectorAll('.tab-nav-btn');
    if (sectionId === 'data') btns[0].classList.add('active');
    if (sectionId === 'seeder') btns[1].classList.add('active');
    if (sectionId === 'cash') btns[2].classList.add('active');

    // Section Specific Renders
    if (sectionId === 'data') {
        renderSalesTable();
    }
    else if (sectionId === 'seeder') {
        renderSellersTable();
    }
    else if (sectionId === 'cash') {
        renderStats();
    }
};

// --- Data Handling ---

function formatDate(timestamp) {
    if (!timestamp) return '-';
    // Strict DD/MM/YYYY format
    const d = new Date(timestamp);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

function getLocalStorageData(key, defaultVal = []) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
        return defaultVal;
    }
}

function setLocalStorageData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// --- Dashboard Logic ---

function loadDashboardData() {
    // Ensure Founder Exists (Self-Healing)
    if (window.SSBLogic && typeof window.SSBLogic.ensureFounderStatus === 'function') {
        window.SSBLogic.ensureFounderStatus();
    }

    // SYNC FIX: Always maintain Source of Truth
    // Rebuild stats from history on every load to prevent desync
    let currentHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);

    // AUTO-DEDUPLICATE: Fix "Double Entry" issue automatically
    const uniqueHistory = [];
    const seenMobiles = new Set();
    let duplicatesFound = false;

    currentHistory.forEach(item => {
        const m = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        if (!m) return;

        if (!seenMobiles.has(m)) {
            seenMobiles.add(m);
            uniqueHistory.push(item);
        } else {
            duplicatesFound = true;
        }
    });

    if (duplicatesFound) {
        currentHistory = uniqueHistory;
        setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, currentHistory);
        console.log("Auto-Deduplicated History");
    }

    // CRITICAL: Ensure IDs exist BEFORE syncing lists
    // This ensures new users get 'S' IDs if applicable immediately
    currentHistory = ensureCustomerIds(currentHistory);
    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, currentHistory);

    recalculateStatsFromHistory(currentHistory);

    // NEW: Sync Lists from Data (Heal Empty Lists)
    syncAdminListsFromData();

    // DOUBLE-PASS: Re-calculate financials now that lists are synced
    // This ensures any newly discovered Seeders contribute to upline/bonus logic correctly
    recalculateStatsFromHistory(currentHistory);

    renderStats();
    renderSellersTable();
    renderSalesTable();

    // Visual Confirmation
    showAdminToast("System Data Synced & Up to Date");
}

function showAdminToast(msg) {
    let toast = document.getElementById('admin-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'admin-toast';
        toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:rgba(0,230,118,0.9); color:#000; padding:10px 20px; border-radius:8px; font-weight:bold; z-index:9999; transition:opacity 0.5s;";
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
}

// Demo Data Generation Removed - Admin should see real data only.

function syncAdminListsFromData() {
    console.log("Syncing Lists from Data...");
    let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    const stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
    const history = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    let modified = false;

    // 1. RECOVER SELLERS FROM STATS (If they made sales, they are sellers)
    Object.keys(stats).forEach(mobile => {
        if (stats[mobile].sales > 0 && !sellers[mobile]) {
            // Found a ghost seller! Recover them.
            let name = "Unknown Seller";
            // Try to find name in history
            const userRec = history.find(h => (h.phone === mobile || h.mobile === mobile));
            if (userRec && userRec.name) name = userRec.name;

            sellers[mobile] = {
                name: name,
                joined: Date.now(), // Approximate
                status: 'ACTIVE',
                pin: '1234' // Default recovery pin
            };
            modified = true;
        }
    });

    // 2. RECOVER SELLERS FROM SMP (If they are SMP, they are sellers)
    const smpList = getLocalStorageData('ssb_smp_list', {});
    Object.keys(smpList).forEach(mobile => {
        if (smpList[mobile].status === 'ACTIVE' && !sellers[mobile]) {
            sellers[mobile] = {
                name: smpList[mobile].name || "SMP Partner",
                joined: Date.now(),
                status: 'ACTIVE',
                pin: '1234'
            };
            modified = true;
            modified = true;
        }
    });

    // 3. RECOVER SELLERS FROM HISTORY (If they have an 'S' ID or SEEDER role)
    // Force fresh read of history ensures we aren't using stale data
    const freshHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    let syncCount = 0;

    freshHistory.forEach(u => {
        const id = u.customerId || '';
        const m = u.phone || u.mobile;
        const role = u.role || 'BUYER';

        // Check if ID starts with 'S' OR role is SEEDER
        // Debugging: explicitly logging candidates
        if (m && (id.startsWith('S') || role === 'SEEDER')) {
            if (!sellers[m]) {
                console.log("Auto-Syncing Seeder from History [NEW]:", m, id, role);
                sellers[m] = {
                    name: u.name || "Authorized Seeder",
                    joined: u.date || Date.now(),
                    status: 'ACTIVE',
                    pin: '1234',
                    sellerId: id // Persist ID if exists
                };
                modified = true;
                syncCount++;
            } else {
                // Update existing if role mismatch? Optional but safer to trust existing seller entry
            }
        }
    });

    if (syncCount > 0) console.log(`Synced ${syncCount} new seeders.`);

    if (modified) {
        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        // Ensure IDs are generated for these new entries
        if (window.SSBLogic && window.SSBLogic.ensureSellerIds) {
            window.SSBLogic.ensureSellerIds();
        }
    }
}

// --- Render Cash / Financials ---
function renderStats() {
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    const smpList = getLocalStorageData('ssb_smp_list', {});

    // NEW: Fetch Transaction Log (if exists)
    const txns = getLocalStorageData('ssb_transactions', []);

    // STRICT FILTER: Only count valid records (must have phone)
    const validHistory = paidHistory.filter(item => {
        if (!item) return false;
        const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        return !!p; // Must have phone
    });

    // Calculate Revenue (Purely from SALES / Paid History)
    let totalRevenue = 0;
    const KITS = window.SSB_KITS || {
        'KIT1': { name: 'SSB Base', price: 178, payout: 56 },
        'KIT2': { name: 'SSB Mix', price: 320, payout: 130 },
        'KIT3': { name: 'SSB Family', price: 688, payout: 390 }
    };
    const SMP_BONUS = (window.SSB_CONFIG && window.SSB_CONFIG.SMP_BONUS) ? window.SSB_CONFIG.SMP_BONUS : 10;
    let totalPayout = 0; // Seller Share

    validHistory.forEach(item => {
        // item: { phone, date, kitId, ... }
        const kId = item.kitId || 'KIT1';
        const kit = KITS[kId] || KITS['KIT1'];

        // Only count if it's a valid paid entry (Strict Object Check)
        if (typeof item === 'object' && kit) {
            totalRevenue += kit.price;
            if (item.referrer) {
                totalPayout += kit.payout;
                if (sellers[item.referrer] && sellers[item.referrer].upline) {
                    const upline = sellers[item.referrer].upline;
                    if (smpList[upline] && smpList[upline].status === 'ACTIVE') {
                        totalPayout += SMP_BONUS;
                    }
                }
            }
        }
    });

    const systemShare = totalRevenue - totalPayout;

    // Update DOM Stats
    if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    if (document.getElementById('stat-system-share')) document.getElementById('stat-system-share').textContent = `₹${systemShare.toLocaleString()}`;
    if (document.getElementById('stat-seller-share')) document.getElementById('stat-seller-share').textContent = `₹${totalPayout.toLocaleString()}`;
    if (document.getElementById('stat-users')) document.getElementById('stat-users').textContent = validHistory.length;

    // RENDER TRANSACTION TABLE (If container exists)
    renderTransactionTable(txns, validHistory);
}

function renderTransactionTable(txns, sales) {
    const container = document.getElementById('section-cash');
    if (!container) return;

    // Check if table already exists, if not create it
    let tableContainer = document.getElementById('cash-txn-table-container');
    if (!tableContainer) {
        tableContainer = document.createElement('div');
        tableContainer.id = 'cash-txn-table-container';
        tableContainer.className = 'data-table-container';
        tableContainer.style.marginTop = '20px';
        tableContainer.innerHTML = `
            <h3 class="section-title">Transaction Log</h3>
            <table id="cash-txn-table">
                <thead>
                    <tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Action</th></tr>
                </thead>
                <tbody id="cash-txn-body"></tbody>
            </table>
        `;
        container.appendChild(tableContainer);
    }

    const tbody = document.getElementById('cash-txn-body');
    tbody.innerHTML = '';

    // Merge Sales into Txn Log for display
    let displayList = [];

    // Add Sales
    sales.forEach(s => {
        const date = s.date || Date.now();
        displayList.push({
            date: date,
            type: 'PURCHASE',
            description: `Sale: ${s.name || 'User'} (${s.phone})`,
            amount: (window.SSB_KITS && window.SSB_KITS[s.kitId || 'KIT1']) ? window.SSB_KITS[s.kitId || 'KIT1'].price : 178
        });
    });

    // Add Manual Txns (Filter out Breaks Here)
    const breakRegex = /break/i;
    txns.forEach((t, i) => {
        // STRICT FILTER: Hide Break sessions and small debits
        if (t.description && breakRegex.test(t.description)) return;
        if (t.type === 'DEBIT' && (t.amount <= 2 || !t.description)) return;

        displayList.push({ ...t, index: i });
    });

    // Sort by Date Desc
    displayList.sort((a, b) => b.date - a.date);

    if (displayList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No transactions found.</td></tr>';
        return;
    }

    displayList.forEach(t => {
        const dateStr = formatDate(t.date);
        let amountStyle = t.type === 'DEBIT' ? 'color: #ff4444;' : 'color: #00e676;';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><span class="status-badge" style="${t.type === 'DEBIT' ? 'background:rgba(255,68,68,0.1); color:#ff4444;' : 'background:rgba(0,230,118,0.1); color:#00e676;'}">${t.type || 'INFO'}</span></td>
            <td>${t.description || '-'}</td>
            <td style="${amountStyle} font-weight:bold;">
                ${(t.type === 'DEBIT') ? t.amount + ' mins' : '₹' + t.amount}
            </td>
            <td>
                ${t.type !== 'PURCHASE' ? `<button class="action-btn" onclick="editTransaction(${t.index})" style="background:#00e676; color:#000; padding:2px 8px;">Edit</button>
                <button class="action-btn delete" onclick="deleteTransaction(${t.index})" style="padding:2px 8px;">Del</button>` : '<span style="color:#666; font-size:0.8rem;">(Manage in Data)</span>'}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Sellers Management ---

function renderSellersTable() {
    try {
        console.log("Rendering Sellers Table...");

        // 1. SYNC LEGACY SELLERS (Fix for missing 8178591586)
        let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        const legacySellers = getLocalStorageData('ssb_sellers', {}); // Old Key
        let modified = false;

        Object.keys(legacySellers).forEach(mobile => {
            if (!sellers[mobile]) {
                // Import missing seller
                console.log("Importing Legacy Seller:", mobile);
                sellers[mobile] = {
                    ...legacySellers[mobile],
                    sellerId: null, // Will be generated below
                    status: 'ACTIVE',
                    joined: legacySellers[mobile].joined || Date.now()
                };
                modified = true;
            }
        });

        if (modified) {
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        }

        const stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
        const smpList = getLocalStorageData('ssb_smp_list', {});

        // 2. AUTO-GENERATE IDs if missing
        // Re-read sellers in case of updates
        sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});

        // FAILSAFE: If only Admin exists, Force Restore Critical Accounts and Re-read
        if (Object.keys(sellers).length <= 1 && window.SSBLogic && window.SSBLogic.ensureCriticalAccounts) {
            console.log("Failsafe: Restoring Critical Accounts...");
            window.SSBLogic.ensureCriticalAccounts();
            sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        }

        // Manual ID Generation Logic (Duplicate of SSBLogic to ensure it runs in Admin)
        const usedIds = new Set();
        Object.values(sellers).forEach(s => { if (s.sellerId) usedIds.add(s.sellerId); });

        let nextId = 1001;
        let idModified = false;

        Object.keys(sellers).forEach(mobile => {
            if (!sellers[mobile].sellerId) {
                while (usedIds.has('S' + nextId)) nextId++;
                const newId = 'S' + nextId;
                sellers[mobile].sellerId = newId;
                usedIds.add(newId);
                idModified = true;
            }
        });

        if (idModified) {
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
            sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {}); // Refresh again
        }


        const tbody = document.querySelector('#sellers-table tbody');
        if (!tbody) {
            console.error("CRITICAL: #sellers-table tbody not found in DOM!");
            return;
        }

        tbody.innerHTML = '';

        const sellerKeys = Object.keys(sellers);
        if (sellerKeys.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No authorized sellers found.</td></tr>';
            return;
        }

        sellerKeys.forEach(mobile => {
            const seller = sellers[mobile];
            if (!seller) return;

            // Sales Logic
            const s = stats[mobile] || { sales: 0 };
            const salesCount = s.sales || 0;

            // Eligibility Logic
            let statusBadge = `<span class="status-badge ${seller.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}">${seller.status || 'UNKNOWN'}</span>`;

            // FOUNDER CHECK
            if (mobile === '8851168290') {
                statusBadge += `<br><span style="font-size:0.7rem; color:#00e676; background:rgba(0,255,150,0.1); padding:2px 5px; border-radius:4px; border:1px solid #00e676; margin-top:5px; display:inline-block;">👑 FOUNDER</span>`;
            }
            else if (salesCount >= 5 && (!smpList[mobile] || smpList[mobile].status !== 'ACTIVE')) {
                // Eligible for SMP but not yet active
                statusBadge += `<br><span style="font-size:0.7rem; color:#ffd700; background:rgba(255,215,0,0.1); padding:2px 5px; border-radius:4px; border:1px solid #ffd700; margin-top:5px; display:inline-block;">🌟 SMP Eligible</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
            <td style="color:#00ff99; font-weight:bold;">${seller.sellerId || '-'}</td>
            <td>${seller.name || 'Unknown'}</td>
            <td>${mobile}</td>
            <td style="font-family:monospace; color:#ffd700;">${seller.pin || 'N/A'}</td>
            <td style="font-weight:bold; color:#fff;">${salesCount}</td>
            <td>${statusBadge}</td>
            <td>${formatDate(seller.joined)}</td>
            <td>
                <button class="action-btn" onclick="editSeller('${mobile}')" style="background:rgba(255,255,255,0.1); border:1px solid #444; margin-right: 5px;">Edit</button>
                <button class="action-btn delete" onclick="deleteSeller('${mobile}')">Del</button>
            </td>
        `;
            tbody.appendChild(tr);
        });

        // Update Stat Count
        const countEl = document.getElementById('stat-sellers');
        if (countEl) countEl.textContent = sellerKeys.length;

    } catch (e) {
        console.error("Render Sellers Error:", e);
        const tbody = document.querySelector('#sellers-table tbody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="color:red; text-align:center;">Error Loading Data: ${e.message}</td></tr>`;
    }
}

window.addSeller = function () {
    const mobileInput = document.getElementById('new-seller-mobile');
    const nameInput = document.getElementById('new-seller-name');
    const pinInput = document.getElementById('new-seller-pin');

    const mobile = mobileInput.value.trim();
    const name = nameInput.value.trim();
    const pin = pinInput.value.trim();

    // VALIDATION
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobile.match(mobileRegex)) {
        alert("Please enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.");
        return;
    }

    if (!name) {
        alert("Please enter a seller name.");
        return;
    }

    // VALIDATION: Name
    const nameRegex = /^[a-zA-Z\s\.]+$/;
    if (!name.match(nameRegex)) {
        alert("Invalid Name. Only alphabets and spaces are allowed.");
        return;
    }
    // Auto-Capitalize
    const formattedName = name.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    if (!pin || pin.length !== 4 || isNaN(pin)) {
        alert("Please enter a valid 4-digit PIN.");
        return;
    }

    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});

    // Update if exists (Edit Mode), or Add New
    let existingId = sellers[mobile] ? sellers[mobile].sellerId : null;

    // Generate ID if New
    if (!existingId) {
        const usedIds = new Set();
        Object.values(sellers).forEach(s => { if (s.sellerId) usedIds.add(s.sellerId); });
        let nextId = 1001;
        while (usedIds.has('S' + nextId)) nextId++;
        existingId = 'S' + nextId;
    }

    sellers[mobile] = {
        name: formattedName,
        joined: sellers[mobile] ? sellers[mobile].joined : Date.now(),
        status: 'ACTIVE',
        pin: pin,
        sellerId: existingId
    };

    setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);

    // Sync to Auth PINs (Ensure they can login immediately)
    let authPins = getLocalStorageData('ssb_auth_pins', {});
    authPins[mobile] = pin;
    setLocalStorageData('ssb_auth_pins', authPins);

    // Reset inputs
    mobileInput.value = '';
    nameInput.value = '';
    pinInput.value = '';
    // Reset Button State if needed (could switch back to "Add")

    renderSellersTable();
    loadDashboardData(); // Refresh stats
};

window.forceSyncSellers = function () {
    if (confirm("Force synchronize Seeder list from User History?")) {
        syncAdminListsFromData();
        recalculateStatsFromHistory(getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []));
        renderSellersTable();
        alert("Sync Completed.");
    }
};

window.editSeller = function (mobile) {
    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    const s = sellers[mobile];
    if (!s) return;

    document.getElementById('new-seller-mobile').value = mobile;
    document.getElementById('new-seller-name').value = s.name;
    document.getElementById('new-seller-pin').value = s.pin || '';

    // Optional: Scroll to input area
    document.getElementById('new-seller-mobile').focus();
    alert("Edit Mode: Modify details and click 'Add New Seller' to update.");
}

window.deleteSeller = function (mobile) {
    if (confirm(`Are you sure you want to remove seller ${mobile}? It will be moved to Recycle Bin.`)) {
        const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        const itemToDelete = sellers[mobile];

        if (itemToDelete) {
            // Add to Recycle Bin
            let bin = getLocalStorageData('ssb_recycle_bin', []);
            bin.push({
                data: { ...itemToDelete, mobile: mobile }, // Ensure key is preserved
                deletedAt: Date.now(),
                type: 'SELLER'
            });
            setLocalStorageData('ssb_recycle_bin', bin);
        }

        delete sellers[mobile];
        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        renderSellersTable();
        loadDashboardData();
    }
};

// --- Sales Data ---


function renderSalesTable(filter = "") {
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {}); // Lookup source 1
    const stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {}); // Lookup source 2

    // Sort by date desc
    paidHistory.sort((a, b) => {
        const dateA = (typeof a === 'object') ? (a.date || 0) : 0;
        const dateB = (typeof b === 'object') ? (b.date || 0) : 0;
        return dateB - dateA;
    });

    const tbody = document.querySelector('#sales-table tbody');
    tbody.innerHTML = '';

    const KITS = window.SSB_KITS || {
        'KIT1': { name: 'SSB Base', price: 178 },
        'KIT2': { name: 'SSB Mix', price: 320 },
        'KIT3': { name: 'SSB Family', price: 688 }
    };

    // Ensure IDs exist & Persist
    paidHistory = ensureCustomerIds(paidHistory);
    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);

    let count = 0;
    paidHistory.forEach((item, index) => {
        let phone, date, kitId, name, customerId;

        if (typeof item === 'string') {
            phone = item;
            date = Date.now();
            kitId = 'KIT1';
            name = '';
            customerId = 'TEMP' + index; // Should be fixed by ensure now
        } else {
            phone = item.phone || item.mobile;
            date = item.date;
            kitId = item.kitId || 'KIT1';
            name = item.name || '';
            customerId = item.customerId || ('S' + (1000 + index));
        }

        // If phone is missing, it's a corrupt record.
        if (!phone) {
            // Skip/Log
        }

        // CHECK IF SELLER -> Use S-ID
        if (sellers[phone] && sellers[phone].sellerId) {
            customerId = sellers[phone].sellerId;
        }

        const displayName = name || 'Unknown';

        // Filter
        if (filter) {
            const query = filter.toLowerCase();
            const p = String(phone).toLowerCase();
            const n = String(displayName).toLowerCase();
            const cid = String(customerId).toLowerCase();
            if (!p.includes(query) && !n.includes(query) && !cid.includes(query)) return;
        }

        const kitInfo = KITS[kitId] || KITS['KIT1'];

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong style="color:#00e676;">${customerId}</strong></td>
            <td>${formatDate(date)}</td>
            <td>${displayName}</td>
            <td>${phone}</td>
            <td>${kitInfo.name}</td>
            <td>₹${kitInfo.price}</td>
            <td><span class="status-badge status-active">Paid</span></td>
            <td>
                <!-- Pass INDEX to handle duplicates -->
                <button class="action-btn" onclick="editUser('${phone}', ${index})" style="background:#00e676; color:#000; border:none; border-radius:4px; padding:4px 10px; margin-right:5px; font-weight:bold; cursor:pointer;">Edit</button>
                <button class="action-btn delete" onclick="deleteSale('${phone}')" style="background:#ff4444; color:#fff; border:none; border-radius:4px; padding:4px 10px; cursor:pointer;">Del</button>
            </td>
        `;
        tbody.appendChild(tr);
        count++;
    });

    if (count === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:rgba(255,255,255,0.3);">No sales found</td></tr>';
    }
}

// Ensure every user has a persistent ID
function ensureCustomerIds(history) {
    let changed = false;
    const smpList = getLocalStorageData('ssb_smp_list', {});

    // Series Start Points
    let maxS = 1000;   // S1001...
    let maxM = 1000;   // M1001... (CHANGED from 100000)
    let maxC = 1000;   // C1001...

    // 1. Identify Existing Max IDs
    const validSPattern = /^S\d{4,}$/; // S1001+
    const validMPattern = /^M\d{4,}$/; // M1001+ (CHANGED regex)
    const validCPattern = /^C\d{4,}$/; // C1001+

    history.forEach(item => {
        if (typeof item === 'object' && item.customerId) {
            if (validSPattern.test(item.customerId)) {
                maxS = Math.max(maxS, parseInt(item.customerId.substring(1)));
            }
            if (validMPattern.test(item.customerId)) {
                // Fix for legacy M100001 -> don't let it skew the max if we want to reset
                const val = parseInt(item.customerId.substring(1));
                if (val < 100000) maxM = Math.max(maxM, val);
            }
            if (validCPattern.test(item.customerId)) {
                maxC = Math.max(maxC, parseInt(item.customerId.substring(1)));
            }
        }
    });

    const usedIds = new Set();
    history.forEach(i => i.customerId ? usedIds.add(i.customerId) : null);

    return history.map(item => {
        let user = (typeof item === 'string') ? {
            phone: item, mobile: item, name: '', date: Date.now(),
            kitId: 'KIT1', allowedDevices: 1, wallet: 1780, consumed: 0, isPaid: true
        } : item;

        const mobile = user.phone || user.mobile;

        // 1. FOUNDER Override (S1001) - FORCE FIX against 'SMP1'
        if (mobile === '8851168290') {
            if (user.customerId !== 'S1001') {
                user.customerId = 'S1001';
                changed = true;
            }
            if (maxS < 1001) maxS = 1001;
            usedIds.add('S1001'); // Ensure it's marked as used
            return user;
        }

        // 2. Specific Override: Yogesh (9211755211) -> M1001
        if (mobile === '9211755211') {
            if (user.customerId !== 'M1001') {
                user.customerId = 'M1001';
                changed = true;
            }
            if (maxM < 1001) maxM = 1001;
            usedIds.add('M1001');
            return user;
        }

        // 3. General Validation & Migration
        let isValid = false;
        if (user.customerId) {
            if (validSPattern.test(user.customerId)) isValid = true;
            if (validMPattern.test(user.customerId)) {
                // Migrate old M100001 series to new series if encountered?
                // For now, treat M100... as valid UNLESS it's the specific override above
                // But user wants M100001 -> M1001. 
                // Let's assume M100001 is "Legacy/Invalid" for this new era if we want to force compaction.
                // But better to just let new ones be small.
                // However, Yogesh is forced above.
                isValid = true;
            }
            if (validCPattern.test(user.customerId)) isValid = true;

            // Invalid IDs (e.g. 'SMP1') will fall through to regeneration
            if (user.customerId === 'SMP1') isValid = false;
        }

        if (isValid) return user;

        // 4. Generate New ID
        changed = true;
        let newId;

        // PRIORITY: Check Role or SMP Status for 'S' Series
        if ((smpList[mobile] && smpList[mobile].status === 'ACTIVE') || (user.role === 'SEEDER')) {
            maxS++;
            newId = 'S' + maxS;
        }
        else if (user.referrer) {
            const referrerMobile = user.referrer;
            if ((smpList[referrerMobile] && smpList[referrerMobile].status === 'ACTIVE') || referrerMobile === '8851168290') {
                maxM++;
                newId = 'M' + maxM;
            } else {
                maxC++;
                newId = 'C' + maxC;
            }
        }
        else {
            maxC++;
            newId = 'C' + maxC;
        }

        // Collision Check (Simple increment)
        while (usedIds.has(newId)) {
            // If collision, bump the counter that generated it
            if (newId.startsWith('S')) { maxS++; newId = 'S' + maxS; }
            else if (newId.startsWith('M')) { maxM++; newId = 'M' + maxM; }
            else { maxC++; newId = 'C' + maxC; }
        }

        user.customerId = newId;
        usedIds.add(newId);
        return user;
    });
}

// --- User Management ---

window.showAddUserModal = function () {
    // Reset Fields
    document.getElementById('edit-original-mobile').value = '';
    document.getElementById('edit-user-index').value = '-1'; // New User
    document.getElementById('edit-new-mobile').value = '';
    document.getElementById('edit-new-name').value = '';
    document.getElementById('edit-new-kit').value = 'KIT1';
    document.getElementById('edit-new-pin').value = '';

    // Reset Role to Default
    const roleElem = document.getElementById('edit-new-role');
    if (roleElem) roleElem.value = 'BUYER';

    // Show Modal
    const modal = document.getElementById('edit-user-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.editUser = function (mobile, index) {
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);

    // Find User
    // Use index if provided and valid, otherwise search by mobile
    let user = null;
    let realIndex = -1;

    // Try finding by mobile first to be robust (Primary Key effectively)
    realIndex = paidHistory.findIndex(u => {
        const p = (typeof u === 'object') ? (u.phone || u.mobile) : u;
        return p === mobile;
    });

    if (realIndex === -1) {
        alert("User not found.");
        return;
    }

    user = paidHistory[realIndex];
    if (typeof user !== 'object') {
        // Legacy string format
        user = { phone: user, name: '', kitId: 'KIT1' };
    }

    // Simple Prompt-based Edit (for now, can Upgrade to Modal later)
    const newName = prompt("Edit Name:", user.name || '');
    if (newName === null) return; // Cancelled

    const newRole = prompt("Edit Role (BUYER, ADMIN, SEEDER):", user.role || 'BUYER');
    if (newName === null) return;

    // Apply Changes
    user.name = newName;
    user.role = newRole ? newRole.toUpperCase() : 'BUYER';

    paidHistory[realIndex] = user;
    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);

    alert("User Updated Successfully");
    loadDashboardData();
}

window.deleteSale = function (mobile) {
    if (!confirm(`Are you sure you want to delete this record? It will be moved to Recycle Bin.`)) return;

    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    let itemToDelete = paidHistory.find(item => {
        const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        return p === mobile;
    });

    if (!itemToDelete) return alert("Record not found.");

    // FILTER OUT
    paidHistory = paidHistory.filter(item => {
        const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        return p !== mobile;
    });

    // ADD TO RECYCLE BIN
    let bin = getLocalStorageData('ssb_recycle_bin', []);
    bin.push({
        data: itemToDelete,
        deletedAt: Date.now(),
        type: 'SALE'
    });

    // SAVE UPDATES
    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);
    setLocalStorageData('ssb_recycle_bin', bin);

    // SYNC STATS (Removes from Cash View automatically)
    if (window.SSBLogic && window.SSBLogic.recalculateStats) {
        window.SSBLogic.recalculateStats();
    } else {
        recalculateStatsFromHistory(paidHistory);
    }

    alert("Moved to Recycle Bin.");
    loadDashboardData();
}

window.toggleRecycleBin = function () {
    const binSection = document.getElementById('section-recycle-bin');

    // Toggle Logic
    if (binSection.classList.contains('hidden')) {
        // Hide others
        document.querySelectorAll('.admin-section').forEach(el => el.classList.add('hidden'));
        // Show Bin
        binSection.classList.remove('hidden');
        binSection.style.display = 'block';
        renderRecycleBin();
    } else {
        // Hide Bin
        binSection.classList.add('hidden');
        binSection.style.display = 'none';
        // Restore last section
        const last = sessionStorage.getItem('ssb_admin_section') || 'data';
        switchSection(last);
    }
}

window.renderRecycleBin = function () {
    const tbody = document.getElementById('recycle-body');
    const bin = getLocalStorageData('ssb_recycle_bin', []);
    tbody.innerHTML = '';

    if (bin.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Recycle Bin Empty</td></tr>';
        return;
    }

    bin.forEach((item, index) => {
        // Handle if data is just phone string (Legacy)
        const d = (typeof item.data === 'object') ? item.data : { phone: item.data, name: 'Legacy' };

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${formatDate(item.deletedAt)}</td>
            <td>${d.name || d.description || '-'}</td>
            <td>${d.phone || d.mobile || d.type}</td>
            <td>
                <button onclick="restoreItem(${index})" style="background:#00e676; border:none; color:#000; border-radius:4px; padding:4px 8px; cursor:pointer;">Restore</button>
                <button onclick="permanentDelete(${index})" style="background:#ff4444; border:none; color:#fff; border-radius:4px; padding:4px 8px; cursor:pointer; margin-left:5px;">Del</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.restoreItem = function (index) {
    let bin = getLocalStorageData('ssb_recycle_bin', []);
    const record = bin[index];
    if (!record) return;

    const type = record.type || 'SALE';

    if (type === 'SALE') {
        let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
        paidHistory.push(record.data);
        setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);
        if (window.SSBLogic && window.SSBLogic.recalculateStats) window.SSBLogic.recalculateStats();
        else recalculateStatsFromHistory(paidHistory);
    }
    else if (type === 'SELLER') {
        let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        const mobile = record.data.mobile || record.data.phone;
        if (mobile) {
            sellers[mobile] = record.data;
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        }
    }
    else if (type === 'TRANSACTION') {
        let txns = getLocalStorageData('ssb_transactions', []);
        txns.push(record.data);
        setLocalStorageData('ssb_transactions', txns);
    }

    alert("Record Restored.");
    renderRecycleBin();
    loadDashboardData();
}

window.permanentDelete = function (index) {
    if (!confirm("Permanently Delete? This cannot be undone.")) return;

    let bin = getLocalStorageData('ssb_recycle_bin', []);
    const record = bin[index];

    // Also remove any linked manual data (like Sellers/SMP) if needed
    // The previous logic did this. Let's replicate strict cleanup if permanently deleting.
    if (record && record.data) {
        const mobile = record.data.phone || record.data.mobile;

        // CLEANUP SELLER / SMP DATA
        let smpList = getLocalStorageData('ssb_smp_list', {});
        if (smpList[mobile]) { delete smpList[mobile]; setLocalStorageData('ssb_smp_list', smpList); }

        let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        if (sellers[mobile]) { delete sellers[mobile]; setLocalStorageData(STORAGE_KEYS.SELLERS, sellers); }

        let stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
        if (stats[mobile]) { delete stats[mobile]; setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, stats); }
    }

    bin.splice(index, 1);
    setLocalStorageData('ssb_recycle_bin', bin);
    renderRecycleBin();
}
// TRANSACTION MANAGEMENT

window.deleteTransaction = function (index) {
    if (!confirm("Delete this transaction? It will be moved to Recycle Bin.")) return;

    let txns = getLocalStorageData('ssb_transactions', []);
    if (!txns[index]) return;

    let bin = getLocalStorageData('ssb_recycle_bin', []);
    bin.push({
        data: txns[index],
        deletedAt: Date.now(),
        type: 'TRANSACTION'
    });
    setLocalStorageData('ssb_recycle_bin', bin);

    txns.splice(index, 1);
    setLocalStorageData('ssb_transactions', txns);

    renderStats(); // Re-render table
};

window.editTransaction = function (index) {
    let txns = getLocalStorageData('ssb_transactions', []);
    const txn = txns[index];
    if (!txn) return;

    const newDesc = prompt("Edit Description:", txn.description);
    if (newDesc === null) return;

    const newAmount = prompt("Edit Amount (Numbers only):", txn.amount);
    if (newAmount === null) return;
    if (isNaN(newAmount)) return alert("Invalid Amount");

    txn.description = newDesc;
    txn.amount = parseFloat(newAmount);

    txns[index] = txn;
    setLocalStorageData('ssb_transactions', txns);
    renderStats();
};

// NEW: Replays history to rebuild stats (Self-Healing)
function recalculateStatsFromHistory(history) {
    const newStats = {};
    const sellers = getLocalStorageData('ssb_authorized_sellers', {});
    const KITS = window.SSB_KITS || {
        'KIT1': { price: 178, payout: 56 },
        'KIT2': { price: 320, payout: 130 },
        'KIT3': { price: 688, payout: 390 }
    };
    const SMP_BONUS = 10;
    const smpList = getLocalStorageData('ssb_smp_list', {});

    history.forEach(item => {
        if (!item || typeof item !== 'object' || !item.referrer) return;

        const ref = item.referrer;
        const kitId = item.kitId || 'KIT1';
        const kit = KITS[kitId] || KITS['KIT1'];

        // Init Referrer Stats
        if (!newStats[ref]) newStats[ref] = { sales: 0, earnings: 0, buyers: [] };

        // 1. Direct Sale
        newStats[ref].sales++;
        newStats[ref].earnings += kit.payout;

        // Track Buyer
        const buyerPhone = item.phone || item.mobile;
        if (buyerPhone && !newStats[ref].buyers.some(b => b.mobile === buyerPhone)) {
            newStats[ref].buyers.push({
                mobile: buyerPhone,
                name: item.name || 'Unknown',
                date: item.date,
                kit: kitId
            });
        }

        // 2. SMP Bonus (Passive)
        // If the referrer (ref) has an upline, that upline gets bonus
        if (sellers[ref] && sellers[ref].upline) {
            const upline = sellers[ref].upline;
            // Only if upline is Active SMP
            if (smpList[upline] && smpList[upline].status === 'ACTIVE') {
                if (!newStats[upline]) newStats[upline] = { sales: 0, earnings: 0, buyers: [] };
                newStats[upline].earnings += SMP_BONUS;
            }
        }
    });

    setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, newStats);
}

window.filterSales = function () {
    const query = document.getElementById('search-sales').value.trim();
    renderSalesTable(query);
};

// --- SMP Management Logic ---

// --- SMP Logic ---
window.openSMPView = function (viewType) {
    if (window.SSBLogic && typeof window.SSBLogic.ensureFounderStatus === 'function') {
        window.SSBLogic.ensureFounderStatus();
    }

    document.getElementById('smp-landing').classList.add('hidden');
    document.getElementById('smp-data-container').classList.remove('hidden');

    // Hide all internal views
    document.getElementById('smp-pending-view').classList.add('hidden');
    document.getElementById('smp-active-view').classList.add('hidden');

    if (viewType === 'pending') {
        document.getElementById('smp-view-title').textContent = "Pending Requests";
        document.getElementById('smp-pending-view').classList.remove('hidden');
        renderSMPRequests();
    } else {
        document.getElementById('smp-view-title').textContent = "Active SMP Network";
        document.getElementById('smp-active-view').classList.remove('hidden');
        renderActiveSMPs();
    }
};

window.backToSMPMenu = function () {
    document.getElementById('smp-data-container').classList.add('hidden');
    document.getElementById('smp-landing').classList.remove('hidden');
};

function renderSMPRequests() {
    const list = getLocalStorageData('ssb_smp_list', {});
    const tbody = document.getElementById('smp-requests-body');
    tbody.innerHTML = '';
    let count = 0;

    Object.values(list).forEach(req => {
        if (req.status === 'PENDING') {
            count++;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${req.name}</td>
                <td>${req.mobile}</td>
                <td>
                    <div style="font-size:0.8rem;">
                        <strong>Addr:</strong> ${req.address}<br>
                        <strong>PIN:</strong> ${req.pincode}<br>
                        <strong>Aadhar:</strong> ${req.aadhar}
                    </div>
                </td>
                <td>
                    <div style="width:50px; height:50px; background:#333; border-radius:4px; overflow:hidden; border:1px solid #555;">
                        <a href="${req.photo || '#'}" target="_blank">
                            <img src="${req.photo || 'favicon.png'}" style="width:100%; height:100%; object-fit:cover;">
                        </a>
                    </div>
                </td>
                <td>
                    <button class="action-btn" onclick="approveSMP('${req.mobile}')" style="background:var(--color-success); color:#000;">Approve</button>
                    <button class="action-btn delete" onclick="rejectSMP('${req.mobile}')" style="margin-left:5px;">Reject</button>
                </td>
            `;
            tbody.appendChild(tr);
        }
    });

    document.getElementById('no-smp-req').style.display = (count === 0) ? 'block' : 'none';
}

function renderActiveSMPs() {
    let list = getLocalStorageData('ssb_smp_list', {});
    const sellers = getLocalStorageData('ssb_authorized_sellers', {}); // Fetch PINs
    const history = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []); // Fetch for IDs
    const tbody = document.getElementById('smp-active-body');

    // FAILSAFE: Force Founder Injection directly in Render
    if (!list['8851168290'] || list['8851168290'].status !== 'ACTIVE') {
        list['8851168290'] = {
            mobile: '8851168290',
            name: 'Poonam Sharma',
            address: 'Founder Office',
            pincode: '110001',
            aadhar: 'XXXX',
            photo: 'images/poonam_sharma.jpg',
            date: Date.now(),
            status: 'ACTIVE',
            approvedDate: Date.now()
        };
        // Persist the fix
        setLocalStorageData('ssb_smp_list', list);
    }

    // AUTO-GENERATE IDs if missing (Sync with SSBLogic)
    if (window.SSBLogic && window.SSBLogic.ensureSMPIds) {
        window.SSBLogic.ensureSMPIds();
        list = getLocalStorageData('ssb_smp_list', {}); // Refetch
    }

    if (tbody) tbody.innerHTML = '';

    const sortedSMPs = Object.values(list).sort((a, b) => b.date - a.date);

    if (sortedSMPs.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No Active SMPs Found</td></tr>';
        return;
    }

    sortedSMPs.forEach(smp => {
        // Relaxed Filtering: Show if at least Name or Mobile exists
        if (!smp.mobile && !smp.name) return;

        if (smp.status === 'ACTIVE') {
            const pin = (sellers[smp.mobile] && sellers[smp.mobile].pin) ? sellers[smp.mobile].pin : 'N/A';

            // Lookup ID
            let smpId = smp.smpId || 'Pending...';
            if (smpId === 'Pending...' && smp.mobile === '8851168290') smpId = 'S1001'; // Fallback for Founder (though Founder uses S)

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color:var(--color-accent);">${smpId}</strong></td>
                <td>${smp.name || 'Unknown'}</td>
                <td>${smp.mobile || 'Unknown'}</td>
                <td style="font-family:monospace; color:#ffd700;">${pin}</td>
                <td>${formatDate(smp.approvedDate || smp.date)}</td>
                <td><span class="status-badge status-active">Active</span></td>
            `;
            if (tbody) tbody.appendChild(tr);
        }
    });
}

window.approveSMP = function (mobile) {
    let list = getLocalStorageData('ssb_smp_list', {});
    if (list[mobile]) {
        list[mobile].status = 'ACTIVE';
        list[mobile].approvedDate = Date.now();
        setLocalStorageData('ssb_smp_list', list);
        alert(`SMP Approved: ${list[mobile].name}`);
        renderSMPRequests();
    }
}

window.rejectSMP = function (mobile) {
    if (!confirm("Reject this application?")) return;
    let list = getLocalStorageData('ssb_smp_list', {});
    if (list[mobile]) {
        list[mobile].status = 'REJECTED';
        setLocalStorageData('ssb_smp_list', list);
        renderSMPRequests();
    }
}

// Initial Call
document.addEventListener('DOMContentLoaded', () => {
    // Auto Login Check
    if (sessionStorage.getItem('ssb_admin_logged_in') === 'true') {
        const loginScreen = document.getElementById('login-screen');
        const dashContent = document.getElementById('dashboard-content');
        if (loginScreen && dashContent) {
            loginScreen.style.display = 'none';
            dashContent.style.display = 'block';
            loadDashboardData();
            // RESTORE LAST SECTION OR DEFAULT TO MENU
            const lastSection = sessionStorage.getItem('ssb_admin_section') || 'menu';
            switchSection(lastSection);
        }
    }

    // Existing Init
    // ... we assume loadDashboardData() is called by existing code
    // We append our init
    setTimeout(() => {
        repairAdminData(); // Ensure valid data structure
        if (document.getElementById('smp-requests-body')) renderSMPRequests();
    }, 500);
});

function repairAdminData() {
    // FIX: Handle Data Corruption (Array vs Object)
    let sellers = getLocalStorageData('ssb_authorized_sellers', {});
    if (Array.isArray(sellers)) {
        // Convert Array to Object Map if accidentally saved as Array
        const newMap = {};
        sellers.forEach(s => {
            if (s && s.mobile) newMap[s.mobile] = s;
        });
        sellers = newMap;
    }

    // Ensure Founder
    if (!sellers['8851168290']) {
        sellers['8851168290'] = {
            name: 'Poonam Sharma',
            joined: Date.now(),
            status: 'ACTIVE',
            pin: '1234'
        };
    }
    setLocalStorageData('ssb_authorized_sellers', sellers);

    // FIX SMP LIST
    let smp = getLocalStorageData('ssb_smp_list', {});
    if (Array.isArray(smp)) {
        const newMap = {};
        smp.forEach(s => {
            if (s && s.mobile) newMap[s.mobile] = s;
        });
        smp = newMap;
    }
    setLocalStorageData('ssb_smp_list', smp);
}

// --- Edit User Feature ---

window.editUser = function (mobile, index = null) {
    const paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});

    // Try to find name from history or sellers
    let name = "";
    let currentKit = 'KIT1';

    // GUARD: If mobile is literally 'undefined' string, handle it
    if (mobile === 'undefined') {
        mobile = '';
    }

    // 1. Check History (PRECISE INDEX LOOKUP)
    if (index !== null && paidHistory[index]) {
        const entry = paidHistory[index];
        if (typeof entry === 'object') {
            name = entry.name || "";
            currentKit = entry.kitId || "KIT1";
            mobile = entry.phone || entry.mobile || mobile;
        } else {
            // Legacy string data
            mobile = entry;
        }
    } else if (mobile) {
        // Fallback: Find first match
        const historyEntry = paidHistory.find(h => h.phone === mobile || (typeof h === 'object' && h.phone === mobile));
        if (historyEntry) {
            if (historyEntry.name) name = historyEntry.name;
            if (historyEntry.kitId) currentKit = historyEntry.kitId;
        }
    }

    // 2. Check Sellers
    if (!name && mobile && sellers[mobile]) {
        name = sellers[mobile].name;
    }

    // Populate Modal
    document.getElementById('edit-original-mobile').value = mobile;
    document.getElementById('edit-user-index').value = (index !== null) ? index : "-1"; // Store Index
    document.getElementById('edit-new-mobile').value = mobile;
    document.getElementById('edit-new-name').value = name;
    document.getElementById('edit-new-kit').value = currentKit;
    document.getElementById('edit-new-pin').value = '';

    // Set Role Dropdown
    const roleElem = document.getElementById('edit-new-role');
    if (roleElem) {
        // Determine current role based on Authorization
        if (sellers[mobile] || ['9211755210', '8851168290', '9999999991', '8178591586'].includes(mobile)) {
            roleElem.value = 'SEEDER';
        } else {
            roleElem.value = 'BUYER';
        }
    }

    const modal = document.getElementById('edit-user-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';
};

window.closeEditModal = function () {
    const modal = document.getElementById('edit-user-modal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
};

window.saveEditUser = function () {
    const originalMobile = document.getElementById('edit-original-mobile').value; // Empty if New
    const indexStr = document.getElementById('edit-user-index').value;
    const index = parseInt(indexStr);

    const newMobile = document.getElementById('edit-new-mobile').value.trim();
    let newName = document.getElementById('edit-new-name').value.trim();
    const newKit = document.getElementById('edit-new-kit').value;
    const newPin = document.getElementById('edit-new-pin').value.trim();
    const newRole = document.getElementById('edit-new-role') ? document.getElementById('edit-new-role').value : 'BUYER';

    // VALIDATION: Mobile
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!newMobile.match(mobileRegex)) {
        return alert("Invalid Mobile Number. Must be 10 digits and start with 6, 7, 8, or 9.");
    }

    // DUPLICATE CHECK (Buyer Side)
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);

    // Check if mobile exists (skip check if we are editing the SAME mobile)
    if (originalMobile !== newMobile) {
        const exists = paidHistory.some(h => {
            const p = (typeof h === 'object') ? (h.phone || h.mobile) : h;
            return p === newMobile;
        });
        if (exists) {
            return alert("User with this mobile number already exists in Paid History.");
        }
    }

    // VALIDATION: Name
    if (newName) {
        const nameRegex = /^[a-zA-Z\s\.]+$/;
        if (!newName.match(nameRegex)) {
            return alert("Invalid Name. Only alphabets and spaces are allowed.");
        }
        newName = newName.replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
    }

    // Config for Kits
    const KITS = window.SSB_KITS || { 'KIT1': { devices: 1 }, 'KIT2': { devices: 1 }, 'KIT3': { devices: 5 } };
    const devices = KITS[newKit] ? KITS[newKit].devices : 1;

    // Update PIN if provided
    if (newPin && newPin.length >= 4) {
        let authPins = getLocalStorageData('ssb_auth_pins', {});
        authPins[newMobile] = newPin;
        if (originalMobile && originalMobile !== newMobile) delete authPins[originalMobile];
        setLocalStorageData('ssb_auth_pins', authPins);
    }

    // 1. Update Paid History
    // NEW USER -> ADD
    if (index === -1) {
        const newUser = {
            phone: newMobile,
            mobile: newMobile,
            name: newName || 'New User',
            date: Date.now(),
            kitId: newKit,
            allowedDevices: devices,
            wallet: 1780,
            consumed: 0,
            isPaid: true,
            role: newRole
        };
        paidHistory.push(newUser);
    }
    // EXISTING USER -> UPDATE
    else if (index >= 0 && index < paidHistory.length) {
        let item = paidHistory[index];
        if (typeof item !== 'object') {
            item = { phone: newMobile, mobile: newMobile, name: newName, date: Date.now(), kitId: newKit, allowedDevices: devices, wallet: 1780, consumed: 0, isPaid: true };
        } else {
            item.phone = newMobile;
            item.mobile = newMobile;
            if (newName) item.name = newName;
            item.kitId = newKit;
            item.allowedDevices = devices;
            item.role = newRole;
        }
        paidHistory[index] = item;
    }

    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);

    // 2. Update Sellers (Sync Role Changes)
    let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});

    if (newRole === 'SEEDER') {
        // PROMOTE / UPDATE SEEDER
        // Check if previously existed
        let existingData = (originalMobile && sellers[originalMobile]) ? sellers[originalMobile] : null;

        // Remove old key if mobile changed
        if (existingData && originalMobile !== newMobile) {
            delete sellers[originalMobile];
        }

        sellers[newMobile] = {
            name: newName || (existingData ? existingData.name : 'Authorized Seeder'),
            mobile: newMobile,
            joined: (existingData ? existingData.joined : Date.now()),
            status: 'ACTIVE',
            pin: (newPin && newPin.length >= 4) ? newPin : (existingData ? existingData.pin : '1234'),
            sellerId: (existingData ? existingData.sellerId : null) // Keep ID if exists, else null (auto-gen later)
        };

        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
    }
    else if (newRole === 'BUYER') {
        // DEMOTE (Remove from Sellers if exists)
        if (originalMobile && sellers[originalMobile]) {
            delete sellers[originalMobile];
        }
        if (sellers[newMobile]) {
            delete sellers[newMobile];
        }
        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
    }

    // 3. Update Partner Stats (if exists and mobile changed)
    if (originalMobile && originalMobile !== newMobile) {
        let stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
        if (stats[originalMobile]) {
            const data = stats[originalMobile];
            delete stats[originalMobile];
            stats[newMobile] = data;
            setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, stats);
        }

        // Update Buyers List references in all stats
        Object.keys(stats).forEach(partnerKey => {
            const partner = stats[partnerKey];
            if (partner.buyers && Array.isArray(partner.buyers)) {
                let buyersModified = false;
                partner.buyers = partner.buyers.map(b => {
                    if (b.mobile === originalMobile) {
                        buyersModified = true;
                        return { ...b, mobile: newMobile, name: newName || b.name };
                    }
                    return b;
                });
                if (buyersModified) stats[partnerKey] = partner;
            }
        });
        setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, stats);
    }

    alert("User Details Updated Successfully!");
    closeEditModal();
    loadDashboardData(); // This triggers renderSellersTable which auto-generates IDs
};


// --- Add Paid User Feature ---


window.generateDemoData = function () {
    if (!confirm("Generate Demo Data? This will add test records.")) return;

    // 1. Add Test Sales
    let history = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const demoUsers = [
        { name: "Rahul Singh", mobile: "9876543210", kit: "KIT1", date: Date.now() - 86400000 },
        { name: "Anita Raj", mobile: "8765432109", kit: "KIT2", date: Date.now() - 172800000 },
        { name: "Vikram Malhotra", mobile: "7654321098", kit: "KIT3", date: Date.now() - 259200000 }
    ];

    demoUsers.forEach(u => {
        if (!history.find(h => h.mobile === u.mobile)) {
            history.push({
                phone: u.mobile,
                mobile: u.mobile,
                name: u.name,
                date: u.date,
                kitId: u.kit,
                referrer: null,
                allowedDevices: u.kit === 'KIT1' ? 1 : (u.kit === 'KIT2' ? 2 : 5),
                wallet: 0,
                consumed: 0,
                isPaid: true,
                customerId: "" // Will be generated
            });
        }
    });

    // Generate IDs
    history = ensureCustomerIds(history);
    setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, history);

    // 2. Add Test Sellers
    let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    const demoSellers = [
        { mobile: "9988776655", name: "Suresh Enterprise", pin: "1122" },
        { mobile: "8899776655", name: "Priya Digital", pin: "3344" }
    ];

    demoSellers.forEach(s => {
        if (!sellers[s.mobile]) {
            sellers[s.mobile] = {
                name: s.name,
                joined: Date.now() - 500000000,
                status: 'ACTIVE',
                pin: s.pin
            };
        }
    });
    setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);

    // 3. Add SMP Request
    let smp = getLocalStorageData('ssb_smp_list', {});
    if (!smp['9988776655']) {
        smp['9988776655'] = {
            name: "Suresh Enterprise",
            mobile: "9988776655",
            address: "123 Tech Park, Delhi",
            pincode: "110001",
            aadhar: "9988-7766-5544",
            status: "PENDING",
            date: Date.now()
        };
    }
    setLocalStorageData('ssb_smp_list', smp);

    alert("Demo Data Generated! Refreshing...");
    location.reload();
};

// --- Initialization & Auto-Refresh ---

// Initial Load Check
if (sessionStorage.getItem('ssb_admin_logged_in') === 'true') {
    const loginScreen = document.getElementById('login-screen');
    const dashboardContent = document.getElementById('dashboard-content');
    if (loginScreen && dashboardContent) {
        loginScreen.style.display = 'none';
        dashboardContent.style.display = 'block';
        loadDashboardData();
    }
}

// AUTO-REFRESH on Focus (Requested Feature)
window.addEventListener('focus', () => {
    if (sessionStorage.getItem('ssb_admin_logged_in') === 'true') {
        console.log("Window Focused: Refreshing Data...");
        loadDashboardData();

        // Also Re-render current table if visible
        const seederSection = document.getElementById('section-seeder');
        if (seederSection && seederSection.style.display !== 'none') {
            renderSellersTable();
        }
    }
});

// DEBUG / REPAIR TOOL (Requested for Sync Issues)
window.debugAdmin = function () {
    console.log("Starting Manual Repair...");
    let log = "Repair Log:\n";

    try {
        // 1. Force Sync Legacy Sellers
        const legacy = getLocalStorageData('ssb_sellers', {}); // Old Key
        let current = getLocalStorageData('ssb_authorized_sellers', {});
        let added = 0;

        Object.keys(legacy).forEach(m => {
            if (!current[m]) {
                current[m] = { ...legacy[m], sellerId: null, status: 'ACTIVE' };
                added++;
            }
        });

        if (added > 0) {
            setLocalStorageData('ssb_authorized_sellers', current);
            log += `✅ Recovered ${added} missing sellers from legacy data.\n`;
        } else {
            log += `ℹ️ No legacy sellers missing.\n`;
        }

        // 2. Regen IDs
        if (window.SSBLogic && window.SSBLogic.ensureSellerIds) {
            window.SSBLogic.ensureSellerIds();
            log += `✅ Seller IDs Verified/Generated.\n`;
        }

        // 3. Ensure Critical Accounts (Founder + VIP)
        if (window.SSBLogic && window.SSBLogic.ensureCriticalAccounts) {
            window.SSBLogic.ensureCriticalAccounts();
            log += `✅ Critical Accounts (Founder/VIP) Verified.\n`;
        }

        // 4. Clear "Break" Transactions (Optional Cleanup)
        let txns = getLocalStorageData('ssb_transactions', []);
        const originalLen = txns.length;
        txns = txns.filter(t => !t.description || !/break/i.test(t.description));
        if (txns.length < originalLen) {
            setLocalStorageData('ssb_transactions', txns);
            log += `✅ Removed ${originalLen - txns.length} 'Break' transactions from DB.\n`;
        }

        alert(log + "\nPage will reload to apply changes.");
        location.reload();

    } catch (e) {
        alert("Error during repair: " + e.message);
    }
};

// Inject Debug Button
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('ssb_admin_logged_in') === 'true') {
        // ... previous init ...
        const header = document.querySelector('header .container');
        if (header && !document.getElementById('btn-debug-fix')) {
            const btn = document.createElement('button');
            btn.id = 'btn-debug-fix';
            btn.textContent = "🔧 Fix Data";
            btn.style = "background:#ff9800; color:black; border:none; padding:5px 10px; border-radius:4px; font-weight:bold; cursor:pointer; margin-left:15px;";
            btn.onclick = window.debugAdmin;
            header.appendChild(btn);
        }
    }
});
