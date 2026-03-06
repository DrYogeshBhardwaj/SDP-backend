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
        switchSection('menu'); // Default to Safe Menu
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
        sessionStorage.removeItem('ssb_admin_logged_in');
        window.location.href = 'index.html';
    }
};

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

    const btns = document.querySelectorAll('.tab-nav-btn');
    // Index mapping depends on HTML order: [Home, Dashboard, Sellers, SMP]
    if (btns[0] && sectionId === 'menu') btns[0].classList.add('active');
    if (btns[1] && sectionId === 'dashboard') btns[1].classList.add('active');

    if (sectionId === 'sellers') {
        if (btns[2]) btns[2].classList.add('active');
        try {
            renderSellersTable(); // Force Refresh
        } catch (e) {
            console.error("Error rendering sellers:", e);
            document.querySelector('#sellers-table tbody').innerHTML = '<tr><td colspan="8" style="color:red; text-align:center;">Error loading data. Reset App if persists.</td></tr>';
        }
    }

    if (sectionId === 'smp') {
        if (btns[3]) btns[3].classList.add('active');
        // Reset SMP to Menu (Inline Logic for Safety)
        const landing = document.getElementById('smp-landing');
        const dataContainer = document.getElementById('smp-data-container');
        if (landing) {
            landing.classList.remove('hidden');
            landing.style.display = 'block';
        }
        if (dataContainer) {
            dataContainer.classList.add('hidden');
            dataContainer.style.display = 'none';
        }

        // Ensure Founder Status Here Too (Just in case)
        try {
            if (window.SSBLogic && window.SSBLogic.ensureFounderStatus) {
                window.SSBLogic.ensureFounderStatus();
            }
        } catch (e) { console.error("Error ensuring founder:", e); }
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
        let m = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        if (!m) return;

        // Normalize: Remove non-digits, keep last 10
        m = String(m).replace(/\D/g, '').slice(-10);

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
        console.log("Auto-Deduplicated History (Normalized)");
    }

    recalculateStatsFromHistory(currentHistory);

    // NEW: Sync Lists from Data (Heal Empty Lists)
    syncAdminListsFromData();

    renderStats();
    renderSellersTable();
    renderSalesTable();
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

    // 3. RECOVER SELLERS FROM HISTORY (If they have an 'S' ID)
    history.forEach(u => {
        const id = u.customerId || '';
        const m = u.phone || u.mobile;
        if (m && id.startsWith('S') && !sellers[m]) {
            sellers[m] = {
                name: u.name || "Unknown Seller",
                joined: u.date || Date.now(),
                status: 'ACTIVE',
                pin: '1234'
            };
            // Preserve the ID if possible (though ensureSellerIds will overwrite or confirm)
            sellers[m].sellerId = id;
            modified = true;
        }
    });

    if (modified) {
        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        // Ensure IDs are generated for these new entries
        if (window.SSBLogic && window.SSBLogic.ensureSellerIds) {
            window.SSBLogic.ensureSellerIds();
        }
    }
}

function renderStats() {
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    const smpList = getLocalStorageData('ssb_smp_list', {});

    // STRICT FILTER: Only count valid records (must have phone)
    const validHistory = paidHistory.filter(item => {
        if (!item) return false;
        const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
        return !!p; // Must have phone
    });

    // Calculate Revenue
    let totalRevenue = 0;

    // Shared Source of Truth
    const KITS = window.SSB_KITS || {
        'KIT1': { name: 'SSB Base', price: 178, payout: 56 },
        'KIT2': { name: 'SSB Mix', price: 320, payout: 130 },
        'KIT3': { name: 'SSB Family', price: 688, payout: 390 }
    };
    const SMP_BONUS = (window.SSB_CONFIG && window.SSB_CONFIG.SMP_BONUS) ? window.SSB_CONFIG.SMP_BONUS : 10;

    let totalPayout = 0; // Seller Share

    validHistory.forEach(item => {
        // item: { phone, date, kitId, ... }
        // Default to KIT1 if unknown
        const kId = item.kitId || 'KIT1';
        const kit = KITS[kId] || KITS['KIT1'];

        // Only count if it's a valid paid entry (Strict Object Check)
        if (typeof item === 'object' && kit) {
            totalRevenue += kit.price;

            // FIX: Only add Seller Share/Payout IF a REFERRER exists
            if (item.referrer) {
                totalPayout += kit.payout;

                // SMP Share Calculation (Strict 10 Rs Rule)
                // Only if referrer has an upline who is active SMP
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

    document.getElementById('stat-revenue').textContent = `₹${totalRevenue.toLocaleString()}`;
    document.getElementById('stat-system-share').textContent = `₹${systemShare.toLocaleString()}`;
    document.getElementById('stat-seller-share').textContent = `₹${totalPayout.toLocaleString()}`;
    document.getElementById('stat-users').textContent = validHistory.length; // Use verified count
    document.getElementById('stat-sellers').textContent = Object.keys(sellers).length;
}

// --- Sellers Management ---

function renderSellersTable() {
    try {
        console.log("Rendering Sellers Table...");
        let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        const stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
        const smpList = getLocalStorageData('ssb_smp_list', {});

        // SELF-HEALING: Ensure Founder is in Sellers List
        const founderMobile = '8851168290';
        if (!sellers[founderMobile]) {
            sellers[founderMobile] = {
                name: 'Poonam Sharma',
                joined: Date.now(),
                status: 'ACTIVE',
                pin: '1234'
            };
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        }

        // SELF-HEALING: Ensure Demo User is in Sellers List
        // (Disabled for Production)
        /*
        const demoMobile = '9999999991';
        if (!sellers[demoMobile]) {
            sellers[demoMobile] = {
                name: 'Demo User',
                joined: Date.now(),
                status: 'ACTIVE',
                pin: '1234'
            };
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        }
        */

        // AUTO-GENERATE IDs if missing (Sync with SSBLogic)
        if (window.SSBLogic && window.SSBLogic.ensureSellerIds) {
            window.SSBLogic.ensureSellerIds();
            // Refetch updated data with IDs
            sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
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
                <button class="action-btn delete" onclick="deleteSeller('${mobile}')">Remove</button>
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

    if (sellers[mobile]) {
        alert("Seller with this mobile number already exists!");
        return;
    }

    sellers[mobile] = {
        name: formattedName,
        joined: Date.now(),
        status: 'ACTIVE',
        pin: pin
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

    renderSellersTable();
    loadDashboardData(); // Refresh stats
};

window.deleteSeller = function (mobile) {
    if (confirm(`Are you sure you want to remove seller ${mobile}?`)) {
        const sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
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
                <button class="action-btn" onclick="editUser('${phone}', ${index})" style="background:rgba(255,255,255,0.1); border:1px solid #444; margin-right: 5px;">Edit</button>
                <button class="action-btn delete" onclick="deleteSale('${phone}', ${index})" style="font-size: 0.8rem; padding: 4px 8px;">Del</button>
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

        if (smpList[mobile] && smpList[mobile].status === 'ACTIVE') {
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

window.deleteSale = function (mobile) {
    if (!confirm(`Are you sure you want to PERMANENTLY delete this record? This cannot be undone.`)) return;

    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
    const initialLength = paidHistory.length;

    // HANDLE CORRUPT DATA DELETION
    if (mobile.startsWith("INVALID_DATA_")) {
        // Remove ALL records that don't have a valid phone number
        paidHistory = paidHistory.filter((item, idx) => {
            if (!item) return false; // Delete nulls
            const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
            return !!p; // Keep only if phone exists
        });
    } else {
        // Normal Deletion
        paidHistory = paidHistory.filter(item => {
            const itemPhone = (typeof item === 'object') ? (item.phone || item.mobile) : item;
            return itemPhone !== mobile;
        });
    }

    if (paidHistory.length < initialLength) {
        setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);

        // FULL CLEANUP: Remove from other lists too
        let smpList = getLocalStorageData('ssb_smp_list', {});
        if (smpList[mobile]) {
            delete smpList[mobile];
            setLocalStorageData('ssb_smp_list', smpList);
        }

        let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
        if (sellers[mobile]) {
            delete sellers[mobile];
            setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
        }

        let stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
        if (stats[mobile]) {
            delete stats[mobile];
            setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, stats);
        }

        // SYNC FIX
        if (window.SSBLogic && window.SSBLogic.recalculateStats) {
            window.SSBLogic.recalculateStats();
        } else {
            recalculateStatsFromHistory(paidHistory);
        }

        alert("Record and all associated data deleted.");
        loadDashboardData();
    } else {
        // Force reload if cleaning up
        if (mobile.startsWith("INVALID_DATA_")) {
            setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);
            loadDashboardData();
            return;
        }
        alert("Could not find record to delete.");
    }
}

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
    const originalMobile = document.getElementById('edit-original-mobile').value;
    const indexStr = document.getElementById('edit-user-index').value;
    const index = parseInt(indexStr);

    const newMobile = document.getElementById('edit-new-mobile').value.trim();
    let newName = document.getElementById('edit-new-name').value.trim();
    const newKit = document.getElementById('edit-new-kit').value;
    const newPin = document.getElementById('edit-new-pin').value.trim();

    // VALIDATION: Mobile
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!newMobile.match(mobileRegex)) {
        return alert("Invalid Mobile Number. Must be 10 digits and start with 6, 7, 8, or 9.");
    }

    // DUPLICATE CHECK (Buyer Side)
    if (originalMobile !== newMobile) {
        let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);
        const exists = paidHistory.some(h => {
            const p = (typeof h === 'object') ? (h.phone || h.mobile) : h;
            return p === newMobile;
        });
        if (exists) {
            return alert("Cannot update mobile: Use 'Add Paid User' instead. A user with this mobile number already exists.");
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
        if (originalMobile !== newMobile) delete authPins[originalMobile];
        setLocalStorageData('ssb_auth_pins', authPins);
    }

    // 1. Update Paid History
    let paidHistory = getLocalStorageData(STORAGE_KEYS.PAID_HISTORY, []);

    // Primary Path: Update via Index
    if (index >= 0 && index < paidHistory.length) {
        let item = paidHistory[index];
        if (typeof item !== 'object') {
            item = { phone: newMobile, mobile: newMobile, name: newName, date: Date.now(), kitId: newKit, allowedDevices: devices, wallet: 1780, consumed: 0, isPaid: true };
        } else {
            item.phone = newMobile;
            item.mobile = newMobile;
            if (newName) item.name = newName;
            item.kitId = newKit;
            item.allowedDevices = devices;
        }
        paidHistory[index] = item;
        setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);
    } else {
        // Fallback Path: Update via Mobile Match (Legacy)
        let modified = false;
        paidHistory = paidHistory.map(item => {
            const p = (typeof item === 'object') ? (item.phone || item.mobile) : item;
            if (p === originalMobile) {
                modified = true;
                if (typeof item === 'object') {
                    return { ...item, phone: newMobile, mobile: newMobile, name: newName || item.name, kitId: newKit, allowedDevices: devices };
                } else {
                    return { phone: newMobile, mobile: newMobile, name: newName, date: Date.now(), kitId: newKit, allowedDevices: devices, wallet: 1780, consumed: 0, isPaid: true };
                }
            }
            return item;
        });
        setLocalStorageData(STORAGE_KEYS.PAID_HISTORY, paidHistory);
    }

    // 2. Update Sellers (if exists)
    let sellers = getLocalStorageData(STORAGE_KEYS.SELLERS, {});
    if (sellers[originalMobile]) {
        const data = sellers[originalMobile];
        delete sellers[originalMobile];
        let updatedSeller = { ...data, name: newName || data.name };
        if (newPin && newPin.length >= 4) updatedSeller.pin = newPin;
        sellers[newMobile] = updatedSeller;
        setLocalStorageData(STORAGE_KEYS.SELLERS, sellers);
    }

    // 3. Update Partner Stats (if exists)
    let stats = getLocalStorageData(STORAGE_KEYS.PARTNER_STATS, {});
    if (stats[originalMobile]) {
        const data = stats[originalMobile];
        delete stats[originalMobile];
        stats[newMobile] = data;
        setLocalStorageData(STORAGE_KEYS.PARTNER_STATS, stats);
    }

    // 4. Update Auth PINs cleanup
    if (!newPin && originalMobile !== newMobile) {
        let authPins = getLocalStorageData('ssb_auth_pins', {});
        if (authPins[originalMobile]) {
            authPins[newMobile] = authPins[originalMobile];
            delete authPins[originalMobile];
            setLocalStorageData('ssb_auth_pins', authPins);
        }
    }

    // 5. Update Buyers List
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

    alert("User Details Updated Successfully!");
    closeEditModal();
    loadDashboardData();
};


// --- Add Paid User Feature ---



