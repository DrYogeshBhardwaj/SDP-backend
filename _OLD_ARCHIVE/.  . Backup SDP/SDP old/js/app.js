// Core Application Logic - Sinaank Digital Pause (SDP)

class App {
    constructor() {
        this.APP_VERSION = 'v2.4_stable';
        this.currentLang = localStorage.getItem('ssb_lang') || 'en';
        this.currentView = 'home';

        try {
            this.init();
        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("App Initialization Failed: " + e.message);
        }
    }

    init() {

        // --- Auto-Cleanup for Fresh Start ---
        // Check if version is current
        if (localStorage.getItem('ssb_app_version') !== this.APP_VERSION) {
            console.log('Clearing old data for new version:', this.APP_VERSION);

            // 1. Clear everything
            localStorage.clear();

            // 2. Re-initialize Store (which might clear again if DB version mismatch, but here it is fresh)
            if (window.store && typeof store.init === 'function') {
                store.init();
            }

            // 3. SET VERSION LAST so it survives
            localStorage.setItem('ssb_app_version', this.APP_VERSION);

            alert('Application Updated. Data Reset for Consistency. Please Login Again.');
            window.location.reload();
            return; // Stop execution here
        }
        // ------------------------------------
        this.captureReferral();
        this.updateLanguage();
        this.bindEvents();
        this.checkAuth();
        this.handleRouting();
    }

    resetData() {
        if (confirm("Are you sure you want to existing Reset App Data? This will clear all existing accounts and start fresh.")) {
            localStorage.clear();
            window.location.reload();
        }
    }

    captureReferral() {
        const params = new URLSearchParams(window.location.search);

        // V2 Referral: ?ref=SID
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('ssb_ref', ref);
            console.log(`Referral Captured: ${ref}`);

            // Auto-open Family Pack (Kit 580) directly
            console.log(`Referral Auto-Open: ${ref}`);
            setTimeout(() => {
                this.handleKitPurchase('family');
            }, 500);
            return;
        }

        // Legacy Referral: ?cid=...&scode=...
        const cid = params.get('cid');
        const scode = params.get('scode');
        if (cid && scode) {
            localStorage.setItem('ssb_ref_cid', cid);
            localStorage.setItem('ssb_ref_scode', scode);
            console.log(`Referral Captured: CID=${cid}, Scode=${scode}`);

            // AUTO-OPEN LOGIC for Seeder Referral
            // Attempt to fetch Seeder Details if available in store
            let seederInfo = { name: 'Authorized Seeder', mobile: '', id: cid };
            if (window.store && typeof store.getById === 'function') {
                // Try to find user by CID (This works if we have data, otherwise just ID)
                const allUsers = store.getUsers();
                const seederUser = allUsers.find(u => u.identities && u.identities.some(i => i.id === cid));
                if (seederUser) {
                    seederInfo.name = seederUser.name;
                    seederInfo.mobile = seederUser.mobile;
                }
            }

            console.log("Auto-Opening Purchase for Referral:", seederInfo);
            setTimeout(() => {
                this.handleKitPurchase('family'); // Open 580 Kit Modal

                // POPULATE REFERRER INFO
                const modal = document.getElementById('registration-modal');
                const infoDiv = document.getElementById('referrer-info');

                if (infoDiv) {
                    infoDiv.innerHTML = `
                            <div style="color:#166534; font-weight:bold; margin-bottom:4px;">Referrer Details</div>
                            <div style="display:flex; justify-content:space-between;">
                                <span>Name: <strong>${seederInfo.name}</strong></span>
                                <span>ID: <strong>${seederInfo.id}</strong></span>
                            </div>
                            ${seederInfo.mobile ? `<div style="margin-top:2px;">Mobile: <strong>${seederInfo.mobile}</strong></div>` : ''}
                        </div>
                    `;
                    infoDiv.style.display = 'block';
                }
            }, 800); // Slight delay to ensure DOM is ready
        }
    }

    bindEvents() {
        // IDs must be unique across views
        document.getElementById('lang-toggle').addEventListener('click', () => this.toggleLanguage());

        // Navigation
        document.querySelectorAll('[data-link]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.currentTarget.getAttribute('data-link');
                this.navigate(target);
            });
        });

        // Login Logic
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });

            // Dynamic CID Lookup
            const mobileInput = document.getElementById('login-mobile');
            const cidSelect = document.getElementById('login-cid');

            if (mobileInput && cidSelect) {
                mobileInput.addEventListener('input', (e) => {
                    const mobile = e.target.value;
                    if (mobile.length === 10) {
                        const accounts = store.getCidsByMobile(mobile);
                        console.log('Found accounts:', accounts);
                        cidSelect.innerHTML = '';

                        if (accounts.length > 0) {
                            accounts.forEach(acc => {
                                const opt = document.createElement('option');
                                opt.value = acc.cid;
                                // Show ID, Name, Type, and Balance
                                const typeLabel = acc.type === 'SID' ? 'Seeder' : (acc.type === 'CID' ? 'Buyer' : acc.type);
                                // Fix: Show 'mins' for CID/Buyer, '₹' for SID/Seeder
                                const balanceDisplay = acc.type === 'SID' ? `₹${acc.minutesBalance || 0}` : `${acc.minutesBalance || 0} mins`;
                                opt.textContent = `${acc.cid} (${acc.name} - ${typeLabel}) - ${balanceDisplay}`;
                                cidSelect.appendChild(opt);
                            });
                            // Auto-select the one with balance > 0 if available? 
                            const bestAcc = accounts.find(a => (a.minutesBalance || 0) > 0);
                            if (bestAcc) {
                                cidSelect.value = bestAcc.cid;
                            }
                        } else {
                            const opt = document.createElement('option');
                            opt.value = "";
                            opt.textContent = "No accounts found";
                            cidSelect.appendChild(opt);
                        }
                    } else {
                        cidSelect.innerHTML = '<option value="" disabled selected>Enter Mobile First</option>';
                    }
                });
            }
        }


        // Purchase Logic
        const purchaseForm = document.getElementById('purchase-form');
        if (purchaseForm) {
            purchaseForm.addEventListener('submit', (e) => {
                this.handlePurchaseSubmit(e);
            });
        }

        // Demo Logic
        const footerDemo = document.getElementById('footer-demo-link');
        if (footerDemo) {
            footerDemo.addEventListener('click', (e) => {
                e.preventDefault();
                this.startDemo();
            });
        }
        document.getElementById('close-demo-btn').addEventListener('click', () => this.stopDemo());

        // Family Form Logic
        const familyForm = document.getElementById('family-form');
        if (familyForm) {
            familyForm.addEventListener('submit', (e) => {
                this.handleFamilySubmit(e);
            });
        }

        this.setupInputValidation();
    }

    cancelPurchase() {
        document.getElementById('purchase-form').reset();
        document.getElementById('registration-modal').classList.add('hidden');
    }

    setupInputValidation() {
        // Name: Capitalize first letter of each word (support multiple inputs)
        const nameInputs = ['seed-name', 'fam-name'];
        nameInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    const words = e.target.value.split(' ');
                    e.target.value = words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                });
            }
        });

        // Mobile: 10 digits only - STRICT NUMERIC
        const mobileInputs = ['login-mobile', 'reg-mobile', 'fam-mobile'];
        mobileInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                });
            }
        });

        // PIN: 4 digits numeric only - STRICT NUMERIC
        const pinInputs = ['login-pin', 'reg-pin', 'fam-pin'];
        pinInputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                });
            }
        });
    }

    toggleLanguage() {
        this.currentLang = this.currentLang === 'en' ? 'hi' : 'en';
        localStorage.setItem('ssb_lang', this.currentLang);
        document.getElementById('lang-toggle').textContent = this.currentLang === 'en' ? 'EN | हिंदी' : 'HI | English';
        this.updateLanguage();

        // Re-render dynamic views if logged in
        const session = store.getSession();
        if (session) {
            if (session.role === 'ADMIN') {
                this.loadAdminPanel();
            } else {
                this.loadDashboard();
            }
        }
    }

    updateLanguage() {
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18nData[this.currentLang] && i18nData[this.currentLang][key]) {
                el.textContent = i18nData[this.currentLang][key];
            }
        });

        // Update placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (i18nData[this.currentLang] && i18nData[this.currentLang][key]) {
                el.placeholder = i18nData[this.currentLang][key];
            }
        });
    }

    navigate(viewId) {
        // Update URL hash without triggering reload
        if (viewId && viewId !== 'home') {
            window.location.hash = viewId;
        } else {
            // Remove hash for home to keep URL clean
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }

        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        // Show target view
        // Show target view
        const target = document.getElementById(viewId);
        if (target) {
            target.classList.remove('hidden');
            this.currentView = viewId;
            // Reset scroll to top on navigation to ensure user sees the "Theme" (Hero section)
            window.scrollTo(0, 0);
        }

        // Special handling
        if (viewId === 'dashboard') {
            this.loadDashboard();
        } else if (viewId.startsWith('admin')) {
            // Handle admin sub-routes
            const tab = viewId.split('-')[1] || 'data';
            // Show admin section
            const target = document.getElementById('admin');
            if (target) {
                target.classList.remove('hidden');
                this.currentView = 'admin';
            }
            this.loadAdminPanel(tab);
        }
    }

    navigateToLearnMore() {
        // Track where we came from
        this.previousView = this.currentView || 'home';
        this.navigate('learn-more-view');

        // Update Back Button Text dynamically
        const backBtns = document.querySelectorAll('[data-i18n="learn.back"], [data-i18n="learn.back_home"], [data-i18n="learn.back_dashboard"]');
        backBtns.forEach(btn => {
            if (this.previousView === 'dashboard') {
                btn.setAttribute('data-i18n', 'learn.back_dashboard');
                // Optional: Update text immediately if needed, but updateLanguage handles it on load/switch
                // this.updateLanguage(); 
            } else {
                btn.setAttribute('data-i18n', 'learn.back_home');
            }
        });
        this.updateLanguage(); // Refresh text immediately
    }

    backFromLearnMore() {
        const target = this.previousView || 'home';
        this.navigate(target);
    }

    handleRouting() {
        const hash = window.location.hash.substring(1);
        const session = store.getSession();
        const hasRef = new URLSearchParams(window.location.search).has('ref');

        // Only auto-redirect if NOT a referral link
        if (session && !hasRef) {
            // If logged in and at root or login page, go to dashboard/admin
            if (!hash || hash === 'login') {
                if (session.role === 'ADMIN') {
                    this.navigate('admin');
                } else {
                    this.navigate('dashboard');
                }
                return;
            }
        } else {
            // If protected route but not logged in, go to login
            if ((hash === 'dashboard' || hash === 'admin') && !session) {
                this.navigate('login');
                return;
            }
        }

        // Default routing
        if (hash) {
            this.navigate(hash);
        } else {
            this.navigate('home');
        }
    }

    formatDate(dateInput) {
        if (!dateInput) return '-';
        const date = new Date(dateInput);
        // DD/MMM/YYYY format (e.g., 11/Feb/2026)
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).replace(/\//g, ' ');
    }

    checkAuth() {
        const session = store.getSession();
        const authLinks = document.querySelectorAll('.auth-only');
        const guestLinks = document.querySelectorAll('.guest-only');
        const adminLinks = document.querySelectorAll('.admin-only');

        if (session) {
            authLinks.forEach(el => el.classList.remove('hidden'));
            guestLinks.forEach(el => el.classList.add('hidden'));

            if (session.role === 'ADMIN') {
                adminLinks.forEach(el => el.classList.remove('hidden'));
            } else {
                adminLinks.forEach(el => el.classList.add('hidden'));
            }
        } else {
            authLinks.forEach(el => el.classList.add('hidden'));
            guestLinks.forEach(el => el.classList.remove('hidden'));
            adminLinks.forEach(el => el.classList.add('hidden'));
        }
    }

    handleLogin() {
        const mobile = document.getElementById('login-mobile').value;
        const selectedIdentityId = document.getElementById('login-cid').value; // Matches CID or SID
        const pin = document.getElementById('login-pin').value;

        if (!selectedIdentityId) return alert("Please select an Account (CID/SID)");

        const user = store.authenticate(mobile, pin);

        if (user) {
            // Set Active Session Identity
            user.activeIdentityId = selectedIdentityId; // Virtual property for session
            localStorage.setItem('ssb_session', JSON.stringify(user));

            this.checkAuth();
            if (user.role === 'ADMIN') {
                this.navigate('admin');
            } else {
                this.navigate('dashboard');
            }
        } else {
            alert('Invalid credentials');
        }
    }

    logout() {
        if (this.breakInterval) clearInterval(this.breakInterval);
        if (this.alarmInterval) clearInterval(this.alarmInterval);
        this.stopAudio();
        store.logout();
        document.body.className = ''; // Reset theme to Serenity
        this.checkAuth();
        this.navigate('home');
    }

    // --- Purchase Logic ---

    handleKitPurchase(kitId) {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const cidParameter = urlParams.get('cid');
            const scode = urlParams.get('scode');

            // Use stored Ref if available (for V2 links)
            const storedRef = localStorage.getItem('ssb_ref');
            const finalReferrer = cidParameter || storedRef || '';

            // Constraint for specific mobile
            const session = store.getSession();
            if (session && session.mobile === '9211755212') {
                if (kitId === 'kit1') {
                    const totalMinutes = session.identities ? session.identities.reduce((acc, i) => acc + (i.minutesBalance || 0), 0) : (session.minutesBalance || 0);
                    if (totalMinutes > 0) {
                        return alert("Restricted: You can only purchase SDP 1 Kit when your Total Minutes Balance is 0.");
                    }
                }
                if (kitId === 'family') {
                    if (session.hasFamilyPlan) {
                        const confirmBuy = confirm("You already have a Family Pack. Do you really want to purchase another one?");
                        if (!confirmBuy) return;
                    }
                }
            }

            // Populate and Show Modal
            const kitInput = document.getElementById('reg-kit-id');
            const cidInput = document.getElementById('reg-cid');
            const scodeInput = document.getElementById('reg-scode');
            const modal = document.getElementById('registration-modal');

            if (!kitInput || !cidInput || !scodeInput || !modal) {
                alert("Error: Missing modal elements. Please refresh.");
                console.error("Missing elements:", { kitInput, cidInput, scodeInput, modal });
                return;
            }

            kitInput.value = kitId;
            cidInput.value = finalReferrer;
            scodeInput.value = scode || '';

            modal.classList.remove('hidden');
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.pointerEvents = 'auto';
        } catch (err) {
            alert("Error in handleKitPurchase: " + err.message);
            console.error(err);
        }
    }


    handlePurchaseSubmit(e) {
        e.preventDefault();
        console.log("Purchase Submit Triggered");

        const kitId = document.getElementById('reg-kit-id').value;
        const cid = document.getElementById('reg-cid').value; // Referrer CID
        const scode = document.getElementById('reg-scode').value; // Parent S-Code

        const mobile = document.getElementById('reg-mobile').value;
        const pin = document.getElementById('reg-pin').value;

        if (mobile.length !== 10) return alert("Invalid Mobile");
        if (pin.length !== 4) return alert("Invalid PIN");

        // 1. Check if user exists or create new
        let user = store.authenticate(mobile, pin);
        if (!user) {
            try {
                // Default name for new users (collected later at Seeder stage)
                user = store.createUser({ name: "Sinaank User", mobile, pin });
            } catch (err) {
                return alert(err.message);
            }
        }

        try {
            // 2. Process Purchase via Store
            // logic updated to reuse existing CID if present
            const updatedUser = store.processPurchase(user.mobile, kitId, cid);

            // 3. Success Message Logic
            const latestIdentity = updatedUser.identities[updatedUser.identities.length - 1]; // This might be the reused one now
            const displayId = latestIdentity ? latestIdentity.id : (updatedUser.identities[0] ? updatedUser.identities[0].id : 'N/A');

            alert(`Purchase Successful!\n\nBuyer ID: ${displayId}`);

            // Cleanup & Redirect
            document.getElementById('registration-modal').classList.add('hidden');
            document.getElementById('purchase-form').reset();

            // Refresh Session - CRITICAL FIX: Clear old session first
            store.logout(); // Ensure we are starting fresh

            // authenticate returns the user updates and saves to localStorage
            const freshUser = store.authenticate(user.mobile, pin);

            // AUTO-SELECT IDENTITY
            // Prioritize the one just purchased/used
            if (freshUser.identities && freshUser.identities.length > 0) {
                freshUser.activeIdentityId = displayId;
            }

            // Save updated session state explicitly
            localStorage.setItem('ssb_session', JSON.stringify(freshUser));

            // FORCE UI UPDATE
            this.checkAuth();

            // Navigate (using slight delay to ensure storage commit if any async issues, replacing hash)
            setTimeout(() => {
                this.navigate('dashboard');
            }, 100);

        } catch (error) {
            console.error(error);
            alert("Purchase Failed: " + error.message);
        }
    }

    _deprecated_loadDashboard() {
        const user = store.getSession();
        if (!user) return;

        // Failsafe: Filter out any corrupted identities (missing ID)
        if (user.identities && user.identities.length > 0) {
            const validIdentities = user.identities.filter(i => i.id && typeof i.id === 'string');
            if (validIdentities.length !== user.identities.length) {
                console.warn("Found corrupted identities. Cleaning up...");
                user.identities = validIdentities;
                store.updateUser(user.id, { identities: user.identities });
                localStorage.setItem('ssb_session', JSON.stringify(user));
            }
        }

        // Find Active Identity
        const identity = user.identities ? user.identities.find(i => i.id === user.activeIdentityId) : null;
        // Fallback for old data or safety
        const activeId = identity || (user.identities && user.identities.length > 0 ? user.identities[user.identities.length - 1] : null); // Default to latest

        if (!activeId) {
            console.error("No valid identity found for user:", user);
            alert("Error: No account found. Please contact support or try logging out.");
            return;
        }

        if (!activeId) return;

        // Failsafe: Re-check Auth state since we are definitively logged in here
        this.checkAuth();

        console.log('Dashboard ActiveID:', activeId);

        // --- Data Recovery: Fix missing ID ---
        if (!activeId.id) {
            console.warn("Identity ID Missing. Recovering...");
            activeId.id = 'CID-REC-' + Date.now();
            store.updateUser(user.id, { identities: user.identities });
            localStorage.setItem('ssb_session', JSON.stringify(user));
        }
        // -------------------------------------
        // --- Self Repair: Fix undefined minutes ---
        if (activeId.type === 'CID' && (activeId.minutesBalance === undefined || activeId.minutesBalance === null)) {
            console.warn("Minutes Balance Missing. Repairing...");
            activeId.minutesBalance = 3650; // Default to full kit for now
            // Save repair
            store.updateUser(user.id, { identities: user.identities });
            localStorage.setItem('ssb_session', JSON.stringify(user));
        }
        // ------------------------------------------

        document.getElementById('user-name').textContent = `${user.name} (${activeId.id})`;
        const mobileEl = document.getElementById('user-mobile');
        // DEBUG ALARM - ENABLED
        alert(`DEBUG:\nName: ${user.name}\nMobile: '${user.mobile}'\nID: ${user.id}\nUser Object: ${JSON.stringify(user, null, 2)}`);
        console.log("Loading Dashboard: User Mobile =", user.mobile);
        if (mobileEl) {
            mobileEl.textContent = user.mobile ? user.mobile : 'No Mobile Found (Empty)';
            mobileEl.style.color = 'red';
            mobileEl.style.display = 'block';
        }

        // Balance Display based on Type
        if (activeId.type === 'SID') {
            // Seeder Dashboard
            document.getElementById('user-balance').textContent = `₹${activeId.walletBalance}`;
            document.querySelector('[data-i18n="dashboard.balance"]').textContent = "Wallet Balance";

            // Show Seeder Profile if available
            if (activeId.profile) {
                // Inject Profile HTML
                const sidebar = document.querySelector('.sidebar');
                if (!document.getElementById('seeder-profile-card')) {
                    const profileDiv = document.createElement('div');
                    profileDiv.id = 'seeder-profile-card';
                    profileDiv.style.marginBottom = '1rem';
                    profileDiv.innerHTML = `
                        <div class="card" style="padding:1rem; text-align:center;">
                            <img src="${activeId.profile.photo || 'assets/default_user.png'}" style="width:80px; height:80px; border-radius:50%; margin-bottom:0.5rem; object-fit: cover;">
                            <h4 style="margin-bottom:0.25rem;">${activeId.profile.name || user.name}</h4>
                            <p style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1rem;">${activeId.profile.address}</p>
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem; margin-bottom:0.5rem;">
                                <button class="btn btn-secondary" onclick="app.editSeederProfile('${activeId.id}')" style="font-size:0.9rem; padding:0.5rem;">Edit Profile</button>
                                <button class="btn btn-secondary" onclick="app.showIncomeList('${activeId.id}')" style="font-size:0.9rem; padding:0.5rem;">Income List</button>
                            </div>
                            <button class="btn btn-secondary" onclick="app.logout()" style="width:100%; font-size:0.9rem; padding:0.5rem; color:var(--color-danger); border-color:var(--color-danger);">Logout</button>
                        </div>
                    `;
                    sidebar.prepend(profileDiv);
                }
            }
        } else {
            // Buyer Dashboard
            // console.log("Buyer Balance Check:", activeId.minutesBalance);
            const balance = (activeId.minutesBalance !== undefined && activeId.minutesBalance !== null) ? activeId.minutesBalance : 0;
            const balanceEl = document.getElementById('user-balance');
            if (balanceEl) balanceEl.textContent = balance;

            const unitEl = document.getElementById('balance-unit');
            if (unitEl) unitEl.textContent = "mins"; // Explicitly show 'mins'

            document.querySelector('[data-i18n="dashboard.balance"]').textContent = "Your Minutes Balance";
            document.getElementById('balance-unit').textContent = "mins"; // Explicitly show 'mins'

            // Remove seeder profile if present
            const profile = document.getElementById('seeder-profile-card');
            if (profile) profile.remove();
        }

        // Logic for "Start Break" remains available to everyone? Or only CIDs?
        // Assuming everyone can take breaks.

        // Load Family Section (Only if this specific identity has the family plan?)
        // Family logic was on User level previously. Let's assume it's tied to the specific "Kit" purchase which is now inside the identity.
        // Simplified: If user has family plan, show it.
        // Actually, user said: "if user purchase family pack... that specific CID..."
        // So family slots should likely be per Identity? 
        // For now, keeping Family Section visible if ANY identity has it, or just for this one?
        // Staying safe: If user.hasFamilyPlan is true, show it (legacy compatibility).
        if (user.hasFamilyPlan) {
            this.loadFamilySection(user);
        } else {
            const famSection = document.getElementById('family-section-container');
            if (famSection) famSection.innerHTML = '';
        }

        // Show Upgrade Banner if CID
        if (activeId.type === 'CID') {
            document.getElementById('upgrade-section').classList.remove('hidden');
            document.getElementById('partner-section').classList.add('hidden');
        } else {
            document.getElementById('upgrade-section').classList.add('hidden');
            this.loadPartnerData(user, activeId);
        }
    }

    // --- Feature Logic ---

    startDemo() {
        const overlay = document.getElementById('demo-overlay');
        overlay.classList.remove('hidden');
        // Force reflow
        void overlay.offsetWidth;
        overlay.classList.add('active');

        // Play audio placeholder logic
        console.log('Playing Demo Audio...');

        // Auto stop after 2 mins (120000ms) - shortened for dev testing to 10s if needed, keeping 2m
        setTimeout(() => {
            this.stopDemo();
        }, 120000);
    }

    stopDemo() {
        const overlay = document.getElementById('demo-overlay');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 500);
        console.log('Stopping Demo Audio...');
    }

    // --- Audio Logic (Web Audio API) ---

    setupAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    playPersonalizedBreak(user) {
        try {
            // Use stored values if available (calculated in startRealBreak)
            let val1 = this.currentFreq1;
            let val2 = this.currentFreq2;

            // Fallback calculation if direct call or values missing
            if (!val1 || !val2) {
                val1 = this.calculateLastNonZeroDigit(user.mobile);
                val2 = this.calculateMobileSum(user.mobile);
                if (val1 === val2) val1 = (val1 % 9) + 1;
            }

            const nameFreqVal = val1;
            const mobileFreqVal = val2;

            // File naming convention: NameDigit + MobileDigit .mp3 (e.g. 13.mp3)
            const audioFilename = `audio/${nameFreqVal}${mobileFreqVal}.mp3`;
            const fallbackAudio = `audio/sound_kit_1.mp3`;

            const color1 = this.getColor(nameFreqVal);
            const color2 = this.getColor(mobileFreqVal);

            console.log(`Personalizing Break: File=${audioFilename}, Colors=${color1}/${color2}`);

            // Update UI Background - Force with !important
            const breakUI = document.getElementById('real-break-ui');
            breakUI.style.cssText = `background: linear-gradient(135deg, ${color1}, ${color2}) !important; display: flex; opacity: 1; pointer-events: all;`;

            // Reset previous audio
            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            // Create Audio Object
            this.currentAudio = new Audio();
            this.currentAudio.loop = true;
            this.currentAudio.volume = 0.5;

            // Define Play Helper
            const tryPlay = () => {
                const playPromise = this.currentAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.error("Playback failed:", error);
                        if (error.name === 'NotAllowedError') {
                            alert("Please click the screen to enable audio.");
                        } else {
                            // If it's a loading error (404) that didn't trigger onerror yet, or other error
                            // Try fallback if we haven't already
                            if (!this.currentAudio.src.includes('sound_kit')) {
                                console.warn("Switching to fallback due to play error");
                                this.currentAudio.src = fallbackAudio;
                                this.currentAudio.play();
                            }
                        }
                    });
                }
            };

            // Setup Error Handler causing switch to fallback
            this.currentAudio.onerror = (e) => {
                console.warn(`Audio loading error for ${this.currentAudio.src}. Switching to fallback.`);
                if (!this.currentAudio.src.includes('sound_kit')) {
                    this.currentAudio.src = fallbackAudio;
                    tryPlay();
                }
            };

            // Start
            this.currentAudio.src = audioFilename;
            tryPlay();

        } catch (e) {
            console.error('Audio setup failed:', e);
        }
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        if (this.noiseSource) {
            try { this.noiseSource.stop(); } catch (e) { }
            this.noiseSource = null;
        }
    }

    // --- Numerology Helpers ---

    getFrequencyText(number) {
        const freqs = {
            1: "174 Hz",
            2: "285 Hz",
            3: "396 Hz",
            4: "417 Hz",
            5: "528 Hz",
            6: "639 Hz",
            7: "741 Hz",
            8: "852 Hz",
            9: "963 Hz"
        };
        return freqs[number] || "144.72 Hz";
    }

    getFrequencyValue(number) {
        const freqs = {
            1: 174,
            2: 285,
            3: 396,
            4: 417,
            5: 528,
            6: 639,
            7: 741,
            8: 852,
            9: 963
        };
        return freqs[number] || 144.72;
    }

    calculateLastNonZeroDigit(mobile) {
        if (!mobile) return 9;
        const cleanMobile = mobile.toString().replace(/[^0-9]/g, '');
        for (let i = cleanMobile.length - 1; i >= 0; i--) {
            const digit = parseInt(cleanMobile[i]);
            if (digit !== 0) return digit;
        }
        return 9;
    }

    calculateMobileSum(mobile) {
        if (!mobile) return 9;
        const cleanMobile = mobile.toString().replace(/[^0-9]/g, '');
        let sum = 0;
        for (let char of cleanMobile) {
            sum += parseInt(char);
        }
        while (sum > 9) {
            sum = sum.toString().split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
        }
        return sum || 9;
    }

    // Keep for potential legacy use or removed if sure
    getNumerologyValue(char) {
        const map = {
            'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
            'B': 2, 'K': 2, 'R': 2,
            'C': 3, 'G': 3, 'L': 3, 'S': 3,
            'D': 4, 'M': 4, 'T': 4,
            'E': 5, 'H': 5, 'N': 5, 'X': 5,
            'U': 6, 'V': 6, 'W': 6,
            'O': 7, 'Z': 7,
            'F': 8, 'P': 8
        };
        return map[char.toUpperCase()] || 0;
    }

    getColor(number) {
        const colors = {
            1: '#FFD700', // Sun - Gold
            2: '#C0C0C0', // Moon - Silver
            3: '#FFD700', // Jupiter - Gold/Yellow
            4: '#87CEEB', // Rahu - Blue
            5: '#32CD32', // Mercury - Green
            6: '#FFFFFF', // Venus - White
            7: '#5D4037', // Ketu - Smoky Brown
            8: '#000000', // Saturn - Black/Dark Blue
            9: '#FF4500'  // Mars - Red
        };
        return colors[number] || '#0F766E';
    }

    // --- Real Break Logic ---

    // 1. Show Duration Selection
    showBreakSelection() {
        const modal = document.getElementById('break-selection-modal');
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    cancelBreak() {
        // Hide Frequency Modal
        const freqModal = document.getElementById('frequency-modal');
        if (freqModal) freqModal.classList.add('hidden');

        // Show Duration Selection again
        this.showBreakSelection();
    }

    // 2. Start the Break (Step 1: Show Frequency Info)
    startRealBreak(durationMinutes) {
        try {
            console.log("startRealBreak called with:", durationMinutes);
            this.selectedDuration = durationMinutes;
            // Hide selection
            const selInfo = document.getElementById('break-selection-modal');
            if (selInfo) selInfo.classList.add('hidden');

            // --- USE CORE LOGIC ---
            const user = store.getSession();
            const { val1, val2 } = ssbCore.calculateValues(user ? user.mobile : '0000000000');

            // Store for playback
            this.currentFreq1 = val1;
            this.currentFreq2 = val2;

            // Get Display Info
            const nameFreq = ssbCore.getFrequencyText(val1);
            const mobileFreq = ssbCore.getFrequencyText(val2);
            const color1 = ssbCore.getColor(val1);
            const color2 = ssbCore.getColor(val2);

            this.currentColor1 = color1;
            this.currentColor2 = color2;

            console.log(`[App] Calculated Values: ${val1}/${val2}`);

            // Update Modal Text
            const freqModal = document.getElementById('frequency-modal');
            if (freqModal) {
                // use ID to be safe
                const noteEl = document.getElementById('freq-note');
                if (noteEl) {
                    // Determine language to set correct label
                    const lang = localStorage.getItem('ssb_lang') || 'en';
                    const leftLabel = lang === 'hi' ? 'बायां कान' : 'Left Ear';
                    const rightLabel = lang === 'hi' ? 'दायां कान' : 'Right Ear';

                    // Set HTML content with colors
                    noteEl.innerHTML = `
                        <div style="background: rgba(255,255,255,0.9); padding: 0.5rem; border-radius: 4px; display: inline-block;">
                            <span style="color: ${color1}; font-weight: bold;">${leftLabel}: ${nameFreq}</span> | 
                            <span style="color: ${color2}; font-weight: bold;">${rightLabel}: ${mobileFreq}</span>
                        </div>
                    `;
                }
                freqModal.classList.remove('hidden');
            } else {
                // Fallback if modal missing
                this.proceedToBreak();
            }
        } catch (error) {
            console.error("Critical error in startRealBreak:", error);
            // Alert the specific error to find the root cause
            alert("Break init error: " + (error.message || error));
            this.proceedToBreak();
        }
    }



    // 3. Proceed to Actual Break (Step 2: Start Timer & Audio)
    async proceedToBreak() {
        // Hide Frequency Modal
        const freqModal = document.getElementById('frequency-modal');
        if (freqModal) freqModal.classList.add('hidden');

        let user = store.getSession();
        const durationMinutes = this.selectedDuration || 2;

        // Ensure Name exists
        if (!user.name || user.name === 'Guest') {
            const newName = prompt("Please enter Name:", "User");
            if (newName) {
                user.name = newName;
                store.updateUser(user.id, { name: newName });
                user = store.getSession();
            }
        }

        // Check Balance
        const activeIdentity = user.identities ? user.identities.find(i => i.id === user.activeIdentityId) : null;
        const currentBalance = activeIdentity ? (activeIdentity.minutesBalance || 0) : (user.minutesBalance || 0);

        if (currentBalance < durationMinutes) {
            alert(`Insufficient balance (${currentBalance} mins). Please contact Admin.`);
            return;
        }

        // Show break UI
        const breakUI = document.getElementById('real-break-ui');
        breakUI.classList.remove('hidden');

        // Apply Dynamic Background from Core
        // Use verifyContrast to ensure we get distinct colors
        const { color1, color2 } = ssbCore.verifyContrast(this.currentFreq1, this.currentFreq2);

        console.log(`[App] Rendering Colors: Left=${color1} Right=${color2}`);

        // STRICT REQUIREMENT: Vertical Split or Soft Gradient.
        // Implementing Soft Linear Gradient as per user preference "Soft linear gradient"
        // But to ensure visibility of both, we use a 90deg gradient.
        breakUI.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

        // Fullscreen
        if (breakUI.requestFullscreen) {
            breakUI.requestFullscreen().catch(e => console.log('Fullscreen failed:', e));
        } else if (breakUI.webkitRequestFullscreen) {
            breakUI.webkitRequestFullscreen();
        } else if (breakUI.msRequestFullscreen) {
            breakUI.msRequestFullscreen();
        }

        // Setup Timer
        let secondsLeft = durationMinutes * 60;
        const timerDisplay = document.getElementById('break-timer');

        // Start Audio via Core
        try {
            await ssbCore.startAudio(this.currentFreq1, this.currentFreq2);
        } catch (audioError) {
            console.error("Audio failed to start:", audioError);
            alert("Audio Error: " + audioError.message + ". Visual break continued.");
        }

        // Countdown Loop...
        this.breakTimer = setInterval(() => {
            secondsLeft--;

            const m = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
            const s = (secondsLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;

            if (secondsLeft <= 0) {
                this.completeBreak(durationMinutes);
            }
        }, 1000);
    }

    cancelBreak() {
        // Requirement: If break is running, deduct FULL minutes even if cancelled.
        if (this.breakTimer) {
            this.completeBreak(this.selectedDuration);
            return;
        }
        ssbCore.stopAudio(); // Stop Core Audio

        // Exit Fullscreen
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log('Exit fullscreen failed:', e));
        } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        }

        const breakUI = document.getElementById('real-break-ui');
        if (breakUI) {
            breakUI.classList.add('hidden');
            breakUI.style.background = '';
        }

        const breakModal = document.getElementById('break-selection-modal');
        if (breakModal) breakModal.classList.add('hidden');

        const freqModal = document.getElementById('frequency-modal');
        if (freqModal) freqModal.classList.add('hidden');
    }

    async completeBreak(duration) {
        if (this.breakTimer) clearInterval(this.breakTimer);
        ssbCore.stopAudio(); // Stop Core Audio

        // Exit Fullscreen
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(e => console.log('Exit fullscreen failed:', e));
        } else if (document.webkitExitFullscreen && document.webkitFullscreenElement) {
            document.webkitExitFullscreen();
        }

        const breakUI = document.getElementById('real-break-ui');
        if (breakUI) {
            breakUI.classList.add('hidden');
            breakUI.style.background = ''; // Reset
        }

        // Deduct Minutes
        // Deduct Minutes via Store (Reliable)
        const user = store.getSession();
        const success = store.deductMinutes(user.id, duration, "Pause Session", user.activeIdentityId);

        if (!success) {
            console.error("Deduction failed - insufficient balance or user not found");
        }

        // store.updateUser(user.id, user); // REMOVED: This was reverting the deduction!
        alert("Break Completed! You feel refreshed.");
        window.location.reload();
    }

    loadAdminPanel(activeTab) {
        const adminUser = store.getById('u_admin');
        const session = store.getSession();

        // 0. Tab Persistence via Hash
        if (!activeTab || activeTab === 'data') {
            const hash = window.location.hash;
            if (hash.startsWith('#admin-')) {
                activeTab = hash.replace('#admin-', '');
            } else {
                activeTab = 'data';
            }
        }

        // Security check
        if (!session || session.role !== 'ADMIN') {
            return this.navigate('login');
        }

        document.body.className = 'theme-admin'; // Apply Admin Theme
        const adminSection = document.getElementById('admin');

        // 1. Setup Admin Layout (Tabs)
        let container = document.getElementById('admin-content-container');
        if (!container) {
            // Clear existing static placeholder content in HTML
            const staticContent = adminSection.querySelector('.container .main-content');
            if (staticContent) staticContent.remove();

            const mainContainer = adminSection.querySelector('.container');

            // Create Navigation
            const nav = document.createElement('div');
            nav.className = 'admin-tabs';
            nav.innerHTML = `
                <div class="flex gap-md" style="margin-bottom: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.5rem; flex-wrap: wrap; align-items: center;">
                    <button class="btn btn-text ${activeTab === 'data' ? 'btn-primary' : ''}" onclick="app.navigate('admin-data')" data-i18n="admin.tab.users">Users</button>
                    <button class="btn btn-text ${activeTab === 'seeder' ? 'btn-primary' : ''}" onclick="app.navigate('admin-seeder')" data-i18n="admin.tab.seeders">Seeder List</button>
                    <button class="btn btn-text ${activeTab === 'payouts' ? 'btn-primary' : ''}" onclick="app.navigate('admin-payouts')">Payouts 💰</button>
                    <button class="btn btn-text ${activeTab === 'cash' ? 'btn-primary' : ''}" onclick="app.navigate('admin-cash')" data-i18n="admin.tab.cash">History 🏦</button>
                    <button class="btn btn-text ${activeTab === 'comm' ? 'btn-primary' : ''}" onclick="app.navigate('admin-comm')">Communication 📢</button>
                    <div style="margin-left:auto; display:flex; gap:0.5rem;">
                        <button class="btn btn-sm btn-outline-danger" onclick="app.runCleanup()" title="Remove orphaned transactions">🧹 Cleanup DB</button>
                        <button class="btn btn-text ${activeTab === 'bin' ? 'btn-primary' : ''}" onclick="app.navigate('admin-bin')" style="color:var(--color-danger); border:1px solid var(--color-danger);" data-i18n="admin.tab.bin">Recycle Bin 🗑️</button>
                    </div>
                </div>
            `;
            mainContainer.appendChild(nav);

            container = document.createElement('div');
            container.id = 'admin-content-container';
            mainContainer.appendChild(container);
        } else {
            // Update Active Tab UI
            const btns = adminSection.querySelectorAll('.admin-tabs button');
            btns.forEach(btn => {
                btn.classList.remove('btn-primary');
                // Use dataset.i18n for robust checking
                if (btn.dataset.i18n === 'admin.tab.bin' && activeTab === 'bin') btn.classList.add('btn-primary');
                else if (btn.dataset.i18n === 'admin.tab.cash' && activeTab === 'cash') btn.classList.add('btn-primary');
                else if (btn.dataset.i18n === 'admin.tab.seeders' && activeTab === 'seeder') btn.classList.add('btn-primary');
                else if (btn.dataset.i18n === 'admin.tab.users' && activeTab === 'data') btn.classList.add('btn-primary');
                else if (btn.innerText.includes('Payouts') && activeTab === 'payouts') btn.classList.add('btn-primary');
                else if (btn.innerText.includes('Communication') && activeTab === 'comm') btn.classList.add('btn-primary');
            });
        }

        this.updateLanguage(); // Update i18n text for tabs

        // 2. Render Content based on Tab
        container.innerHTML = ''; // Clear current view logic

        if (activeTab === 'data') {
            this.renderAdminUsers(container);
        } else if (activeTab === 'seeder') {
            this.renderAdminSeeders(container);
        } else if (activeTab === 'payouts') {
            this.renderAdminPayouts(container);
        } else if (activeTab === 'cash') {
            this.renderAdminCash(container);
        } else if (activeTab === 'comm') {
            this.renderAdminCommunication(container);
        } else if (activeTab === 'bin') {
            this.renderAdminBin(container);
        }
    }

    renderAdminPayouts(container) {
        let users = store.getUsers();
        let requests = [];

        users.forEach(u => {
            if (u.identities) {
                u.identities.forEach(i => {
                    if (i.payoutRequested) {
                        requests.push({
                            userId: u.id,
                            name: u.name,
                            mobile: u.mobile,
                            amount: i.walletBalance, // Current Balance is what they get
                            upi: i.payoutUpi || i.profile.upiId,
                            date: i.payoutRequestDate,
                            identityId: i.id
                        });
                    }
                });
            }
        });

        // HTML
        let html = `<h3>💰 Payout Requests (${requests.length})</h3>`;

        if (requests.length === 0) {
            html += `<div class="card p-md text-center text-muted">No pending payout requests.</div>`;
        } else {
            html += `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Seeder</th>
                        <th>Mobile</th>
                        <th>UPI ID</th>
                        <th>Amount</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(r => `
                        <tr>
                            <td>${new Date(r.date).toLocaleDateString()}</td>
                            <td>${r.name} <div class="text-xs text-muted">${r.identityId}</div></td>
                            <td>${r.mobile}</td>
                            <td class="font-mono">${r.upi}</td>
                            <td class="font-bold text-success">₹${r.amount}</td>
                            <td>
                                <button class="btn btn-sm btn-primary" onclick="app.approvePayout('${r.userId}')">
                                    ✅ Paid via UPI
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;
        }
        container.innerHTML = html;
    }

    approvePayout(userId) {
        if (!confirm("Confirm that you have MANUALLY transferred the money via UPI? This will deduct the balance and log the transaction.")) return;
        try {
            store.approvePayout(userId);
            alert("Payout Recorded Successfully!");
            this.loadAdminPanel('payouts');
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    renderAdminUsers(container) {
        let users = store.getUsers();
        // Self-Healing
        if (!users.find(u => u.id === 'u_admin')) {
            store.init();
            users = store.getUsers();
        }

        const lang = this.currentLang || 'en';
        const t = i18nData[lang];

        const table = document.createElement('div');
        table.className = 'table-container';
        table.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${t['admin.table.id']}</th>
                        <th>${t['admin.table.name']}</th>
                        <th>${t['admin.table.mobile']}</th>
                        <th>PIN</th>
                        <th>${t['admin.table.role']}</th>
                        <th>${t['admin.table.balance']}</th>
                        <th>Purchase Amt</th>
                        <th>${t['admin.table.action']}</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => {
            let identityHtml = (u.identities || []).map(i =>
                `<div style="display:inline-block; background:rgba(0,0,0,0.1); padding:2px 6px; border-radius:4px; font-size:0.8rem;">
                                ${i.id} <span style="color:var(--color-danger); cursor:pointer;" onclick="app.deleteIdentity('${u.id}','${i.id}')">&times;</span>
                             </div>`).join(' ');

            return `
                        <tr>
                            <td>${identityHtml || 'No ID'}</td>
                            <td>${u.name}</td>
                            <td>${u.mobile}</td>
                            <td>${u.pin || '-'}</td>
                            <td>${u.role}</td>
                            <td>${u.minutesBalance}m</td>
                            <td class="font-bold">₹${(u.role === 'SEEDER' || u.hasFamilyPlan) ? 580 : 178}</td>
                            <td>
                                ${u.role !== 'ADMIN' ? `
                                    <button class="btn btn-text" style="color:var(--color-primary); margin-right:5px;" onclick="app.editUser('${u.id}')">${t['admin.btn.edit']}</button>
                                    <button class="btn btn-text" style="color:var(--color-danger);" onclick="app.deleteUserWithConfirmation('${u.id}')">${t['admin.btn.del']}</button>
                                ` : ''}
                            </td>
                        </tr>`;
        }).join('')}
                </tbody>
`;
        container.appendChild(table);
    }

    renderAdminCommunication(container) {
        const currentMot = store.getMotivation() || {};
        const allFeedback = store.getAllFeedback();

        // Sort Feedback: OPEN first, then by date desc
        allFeedback.sort((a, b) => {
            if (a.status === 'OPEN' && b.status !== 'OPEN') return -1;
            if (a.status !== 'OPEN' && b.status === 'OPEN') return 1;
            return new Date(b.date) - new Date(a.date);
        });

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:2rem;">
                
                <!-- Section 1: Notices (Urgent) -->
                <div>
                    <h3>📢 Broadcast Notice</h3>
                    <p class="text-sm text-muted">Display urgent alerts on all dashboards.</p>
                    
                    <div class="card" style="padding:1.5rem; border-left: 4px solid var(--color-danger);">
                        <div class="form-group">
                            <label class="form-label">Notice Content</label>
                            <textarea id="admin-mot-text" class="form-input" rows="3" placeholder="e.g. Payments delayed...">${currentMot.text || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">From</label>
                            <input type="text" id="admin-mot-author" class="form-input" value="${currentMot.author || 'Admin'}" placeholder="e.g. Admin">
                        </div>

                        <div style="display:flex; gap:1rem; align-items:center;">
                            <button class="btn btn-primary" onclick="app.saveMotivation()">Publish Notice</button>
                            ${currentMot.text ? `<button class="btn btn-secondary" onclick="app.clearNotice()">Clear</button>` : ''}
                        </div>
                    </div>
                </div>

                <!--Section 2: Feedback Inbox-- >
            <div>
                <h3>Feedback Inbox 💬</h3>
                <div class="table-container" style="max-height: 600px; overflow-y: auto;">
                    ${allFeedback.length === 0 ? `<p class="text-muted">No tickets.</p>` : `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>User</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${allFeedback.map(f => {
            const user = store.getById(f.userId);
            const userName = user ? user.name : f.userId;
            const isUnread = f.status === 'OPEN';
            return `
                                    <tr style="${isUnread ? 'background:rgba(16, 185, 129, 0.05); font-weight:bold;' : ''}">
                                        <td class="text-xs">${new Date(f.date).toLocaleDateString()}</td>
                                        <td>
                                            <div class="text-sm">${userName}</div>
                                        </td>
                                        <td><span class="badge ${isUnread ? 'badge-success' : 'badge-secondary'}">${f.status}</span></td>
                                        <td>
                                            <button class="btn btn-sm btn-secondary" onclick="app.openFeedbackAction('${f.id}')">
                                                ${isUnread ? 'Reply' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                    `;
        }).join('')}
                            </tbody>
                        </table>
                        `}
                </div>
            </div>

            </div >
            `;
    }

    saveMotivation() {
        const text = document.getElementById('admin-mot-text').value;
        const type = 'NOTICE'; // Hardcoded
        const author = document.getElementById('admin-mot-author').value;

        if (!text) return alert("Notice message cannot be empty");

        try {
            store.updateMotivation({ text, type, author });
            alert("Notice Published Successfully!");
            this.renderAdminCommunication(document.getElementById('admin-content-container'));
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    clearNotice() {
        if (confirm("Remove this notice from all dashboards?")) {
            store.updateMotivation(null);
            this.renderAdminCommunication(document.getElementById('admin-content-container'));
        }
    }


    openFeedbackAction(id) {
        const f = store.getFeedback(id); // Helper needed or direct find
        // store.getFeedback gets by User ID usually? No, let's use getAllFeedback and find
        const all = store.getAllFeedback();
        const ticket = all.find(t => t.id === id);

        if (!ticket) return alert("Ticket not found");

        const user = store.getById(ticket.userId);

        // Simple Modal for Reply
        // We can reuse a generic modal layout or inject one
        let modal = document.getElementById('admin-feedback-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'admin-feedback-modal';
            modal.className = 'modal'; // Reuse existing modal class
            modal.innerHTML = `
            < div class="modal-content" style = "max-width:500px;" >
                    <span class="close-btn" onclick="document.getElementById('admin-feedback-modal').classList.add('hidden')">&times;</span>
                    <h3 id="af-title">Feedback Reply</h3>
                    <div id="af-content" style="margin-top:1rem;"></div>
                </div >
            `;
            document.body.appendChild(modal);
        }

        const content = modal.querySelector('#af-content');

        // Chat History (if any) - currently simplistic one-shot
        // But the data structure supports array of messages if we enhanced it. 
        // Current structure: text, reply. 

        let statusHtml = '';
        if (ticket.status === 'OPEN') statusHtml = `< span style = "color:green; font-weight:bold;" > OPEN</span > `;
        else statusHtml = `< span style = "color:gray; font-weight:bold;" > ${ticket.status}</span > `;

        content.innerHTML = `
            <div style = "background:#f9f9f9; padding:1rem; border-radius:8px; margin-bottom:1rem;" >
                <div style="font-size:0.85rem; color:#666; display:flex; justify-content:space-between;">
                    <span>From: <strong>${user ? user.name : 'User'}</strong></span>
                    <span>${new Date(ticket.date).toLocaleString()}</span>
                </div>
                <div style="margin-top:0.5rem; font-size:1rem; line-height:1.5;">
                    "${ticket.text}"
                </div>
            </div >

            ${ticket.reply ? `
                <div style="background:#e0f2fe; padding:1rem; border-radius:8px; margin-bottom:1rem; border-left:4px solid #0284c7;">
                    <div style="font-size:0.75rem; color:#0284c7; margin-bottom:4px;">Admin Reply:</div>
                    <div>${ticket.reply}</div>
                </div>
            ` : ''
            }

            ${ticket.status === 'OPEN' ? `
                <div class="form-group">
                    <label class="form-label">Your Reply</label>
                    <textarea id="af-reply-text" class="form-input" rows="3" placeholder="Type your response..."></textarea>
                </div>
                <button class="btn btn-primary" style="width:100%;" onclick="app.submitFeedbackReply('${ticket.id}')">Send Reply & Close</button>
            ` : `
                <div class="text-center text-muted">This ticket is closed.</div>
            `}
        `;

        modal.classList.remove('hidden');
    }

    submitFeedbackReply(id) {
        const text = document.getElementById('af-reply-text').value;
        if (!text) return alert("Please enter a reply.");

        try {
            store.replyFeedback(id, text);
            alert("Reply Sent!");
            document.getElementById('admin-feedback-modal').classList.add('hidden');
            this.renderAdminFeedback(document.getElementById('admin-content-container'));
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    renderAdminBin(container) {
        const users = store.getDeletedUsers();
        const summary = store.getBinSummary();

        const lang = this.currentLang || 'en';
        const t = i18nData[lang];

        container.innerHTML = `
            < h3 > ${t['admin.msg.rec_bin']}</h3 >
            
            <!--Summary Card-- >
            <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--color-danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; display: flex; gap: 2rem; align-items: center;">
                <div>
                    <div class="text-xs text-muted">Total Deleted Users</div>
                    <div style="font-size: 1.2rem; font-weight: bold;">${summary.count}</div>
                </div>
                <div>
                    <div class="text-xs text-muted">Total Purchase Value Lost</div>
                    <div style="font-size: 1.2rem; font-weight: bold; color: var(--color-danger);">₹${summary.totalPurchaseValue}</div>
                </div>
            </div>
        `;

        if (users.length === 0) {
            container.innerHTML += `< p class="text-muted" style = "text-align:center; padding:2rem;" > ${t['admin.msg.bin_empty']}</p > `;
            return;
        }

        const table = document.createElement('div');
        table.className = 'table-container';
        table.innerHTML = `
            < table class="data-table" >
                <thead>
                    <tr>
                        <th>${t['admin.table.name']}</th>
                        <th>${t['admin.table.mobile']}</th>
                        <th>${t['admin.table.role']}</th>
                        <th>Purchase Amt</th>
                        <th>${t['admin.table.date']}</th>
                        <th>${t['admin.table.action']}</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => {
            const purchaseAmt = (u.role === 'SEEDER' || u.hasFamilyPlan) ? 580 : 178;

            return `
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.mobile}</td>
                            <td>${u.role}</td>
                            <td style="font-weight:bold;">₹${purchaseAmt}</td>
                            <td class="p-2">${this.formatDate(u.deletedAt || Date.now())}</td>
                            <td>
                                <button class="btn btn-sm" style="background:var(--color-success); color:white; margin-right:5px; padding: 0.25rem 0.75rem; border-radius: 99px;" onclick="app.restoreUser('${u.id}')">${t['admin.btn.restore']}</button>
                                <button class="btn btn-sm" style="background:var(--color-danger); color:white; padding: 0.25rem 0.75rem; border-radius: 99px;" onclick="app.permanentDeleteUser('${u.id}')">${t['admin.btn.delete_forever']}</button>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table >
            `;
        container.appendChild(table);
    }

    restoreUser(id) {
        if (confirm("Restore this user?")) {
            store.restoreUser(id);
            this.loadAdminPanel('bin');
        }
    }

    permanentDeleteUser(id) {
        if (confirm("PERMANENTLY DELETE? This cannot be undone!")) {
            store.permanentDeleteUser(id);
            this.loadAdminPanel('bin');
        }
    }

    runCleanup() {
        if (!confirm("Start Database Cleanup?\n\nThis will remove all 'Orphaned' transactions and feedback entries that reference users who no longer exist in the database.\n\nThis action cannot be undone.")) return;

        try {
            const result = store.cleanOrphanedData();
            const msg = `Cleanup Complete!\n\nRemoved Transactions: ${result.removedTxns} \nRemoved Feedback: ${result.removedFb} `;
            alert(msg);
            // Refresh current view
            const activeTab = this.currentView === 'admin' ? (location.hash.replace('#admin-', '') || 'data') : 'data';
            this.loadAdminPanel(activeTab);
        } catch (e) {
            console.error(e);
            alert("Cleanup Failed: " + e.message);
        }
    }

    renderAdminSeeders(container) {
        // Strict Filter: Only SEEDER role
        const users = store.getUsers().filter(u => u.role === 'SEEDER');

        const lang = this.currentLang || 'en';
        const t = i18nData[lang];

        container.innerHTML = `
            <div style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;" >
                <h3>${t['admin.tab.seeders']}</h3>
                <button class="btn btn-primary" onclick="app.exportPayouts()">${t['admin.btn.export']}</button>
            </div >
            `;

        if (users.length === 0) {
            container.innerHTML += `< p style = "padding:1rem; text-align:center; color:#666;" > ${t['admin.msg.no_seeders']}</p > `;
            return;
        }

        const table = document.createElement('div');
        table.className = 'table-container';
        table.innerHTML = `
            < table class="data-table" style = "width:100%; border-collapse:collapse;" >
                <thead>
                    <tr class="table-header">
                        <th class="p-2">${t['admin.table.name']}</th>
                        <th class="p-2">${t['admin.table.mobile']}</th>
                        <th class="p-2">UPI ID</th>
                        <th class="p-2">${t['admin.table.earnings']}</th>
                        <th class="p-2">${t['admin.table.action']}</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(u => {
            // Find Seeder Identity for accurate stats
            const sid = u.identities ? u.identities.find(i => i.type === 'SID') : null;
            // Support legacy or new structure
            const earnings = sid ? sid.walletBalance : (u.walletBalance || 0);
            const isRequested = sid ? sid.payoutRequested : false;

            return `
                        <tr class="data-row">
                            <td class="p-2">
                                ${u.name}
                                ${isRequested ? '<span style="display:inline-block; width:8px; height:8px; background:red; border-radius:50%; margin-left:5px;" title="Payout Requested"></span>' : ''}
                            </td>
                            <td class="p-2">${u.mobile}</td>
                            <td class="p-2">${u.upiId || '-'}</td>
                            <td class="p-2 font-bold text-success">
                                ₹${earnings || 0}
                                ${isRequested ? '<div style="font-size:0.7rem; color:red; font-weight:normal;">REQUESTED</div>' : ''}
                            </td>
                            <td class="p-2">
                                <button class="btn btn-secondary btn-sm" onclick="app.manageUser('${u.id}')">${t['admin.btn.edit']}</button>
                                <button class="btn btn-success btn-sm" style="margin-left:5px;" onclick="app.recordManualPayout('${u.id}')">${t['admin.btn.payout']}</button>
                            </td>
                        </tr>
                        `;
        }).join('')}
                </tbody>
            </table >
            `;
        container.appendChild(table);
    }

    exportPayouts() {
        const seeders = store.getUsers().filter(u => u.role === 'SEEDER');
        const data = seeders.map(u => {
            const sid = u.identities ? u.identities.find(i => i.type === 'SID') : null;
            return {
                Name: u.name,
                Mobile: u.mobile,
                UPI_ID: u.upiId || 'Not Set',
                Estimated_Earnings: sid ? (sid.walletBalance || 0) : 0,
                Status: 'PENDING'
            };
        });

        const csvContent = "Name,Mobile,UPI_ID,Estimated_Earnings,Status\n" +
            data.map(d => `${d.Name},${d.Mobile},${d.UPI_ID},${d.Estimated_Earnings},${d.Status} `).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", "payout_verification.csv");
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    recordManualPayout(userId) {
        const amount = prompt("Enter Amount Paid (₹):");
        if (!amount) return;
        const ref = prompt("Enter UPI Reference ID:");
        if (!ref) return;

        try {
            store.recordPayout(userId, parseFloat(amount), ref);
            alert("Payout Recorded Successfully!");
            this.loadAdminPanel('seeder');
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    renderAdminCash(container) {
        let stats = { totalRevenue: 0, systemShare: 0, salesCount: 0 };
        let txns = [];

        try {
            stats = store.getSystemStats();
            // Show Payments (DEBIT) and Purchases (PURCHASE)
            txns = store.getAllTransactions().filter(t => t.type === 'PURCHASE' || t.type === 'DEBIT');
            // Sort by Date Descending
            txns.sort((a, b) => new Date(b.date) - new Date(a.date));
        } catch (e) { console.error(e); }

        container.innerHTML = `
            < div class="stats-grid" >
                <div class="card stat-card">
                    <h4>Total Revenue</h4>
                    <p class="stat-value text-primary">₹${stats.totalRevenue}</p>
                </div>
                <div class="card stat-card">
                    <h4>System Share</h4>
                    <p class="stat-value text-success">₹${stats.systemShare}</p>
                </div>
                <div class="card stat-card">
                    <h4>Total Sales</h4>
                    <p class="stat-value text-accent">${stats.salesCount}</p>
                </div>
            </div >

            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
                <h3>Transaction History 🏦</h3>
                <button class="btn btn-sm btn-secondary" onclick="app.cleanUnknownTransactions()">Clean Unknown Data</button>
            </div>

            <div class="table-container">
                 <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>User Details</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${txns.map(t => {
            const isDebit = t.type === 'DEBIT';
            const color = isDebit ? 'var(--color-danger)' : 'var(--color-success)';
            const sign = isDebit ? '-' : '+';
            return `
                            <tr>
                                <td class="text-sm text-muted">${new Date(t.date).toLocaleDateString()} ${new Date(t.date).toLocaleTimeString()}</td>
                                <td>
                                    <div class="font-bold">${t.userName || 'Unknown'}</div>
                                    <div class="text-xs text-muted">${t.userId || '-'}</div>
                                </td>
                                <td>
                                    <span class="badge ${isDebit ? 'badge-danger' : 'badge-success'}">${t.type}</span>
                                </td>
                                <td style="color:${color}; font-weight:bold; font-family:monospace; font-size:1rem;">
                                    ${sign}₹${t.amount}
                                </td>
                                <td class="text-sm">
                                    ${t.desc || '-'}
                                    ${t.refId ? `<div class="text-xs text-muted">Ref: ${t.refId}</div>` : ''}
                                </td>
                            </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    formatDate(dateStr) {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString();
    }

    cleanUnknownTransactions() {
        if (confirm("This will remove all transactions linked to users that don't exist anymore. Continue?")) {
            const count = store.cleanupOrphanedTransactions();
            alert(`Cleanup Complete.Removed ${count} orphaned transactions.`);
            this.loadAdminPanel('cash');
        }
    }

    renderTransactionRow(t_item, allUsers, t) {
        const txnUser = allUsers.find(u => u.id === t_item.userId);
        const userMobile = txnUser ? txnUser.mobile : 'Unknown';
        const userIdentity = txnUser ? (txnUser.activeIdentityId || '') : '';
        const isDebit = t_item.type === 'DEBIT';
        const amountColor = isDebit ? 'var(--color-danger)' : 'var(--color-success)';

        return `
            < tr >
                                <td class="p-2">${this.formatDate(t_item.timestamp || t_item.date)}</td>
                                <td class="p-2">
                                    <div style="font-weight:bold;">${userMobile}</div>
                                    <div style="font-size:0.8rem; color:var(--color-text-muted);">${userIdentity}</div>
                                </td>
                                <td>${t_item.type}</td>
                                <td>${t_item.description || t_item.desc}</td>
                                <td style="color:${amountColor}; font-weight:bold;">₹${t_item.amount || 0}</td>
                                <td>
                                    ${!isDebit ? `<button class="btn btn-text btn-sm" onclick="app.editTransaction('${t_item.id}')">${t['admin.btn.edit']}</button>
                                    <button class="btn btn-text btn-sm" style="color:var(--color-danger);" onclick="app.deleteTransaction('${t_item.id}')">${t['admin.btn.del']}</button>` : ''}
                                </td>
                            </tr >
            `;
    }

    editTransaction(id) {
        const txns = store.getAllTransactions();
        const txn = txns.find(t => t.id === id);
        if (!txn) return alert("Transaction not found");
        this.showEditTransactionModal(txn);
    }

    showEditTransactionModal(txn) {
        const overlay = document.createElement('div');
        overlay.className = 'demo-overlay';
        overlay.style.display = 'flex';

        overlay.innerHTML = `
            < div class="card" style = "width: 90%; max-width: 400px; padding: 2rem; position: relative;" >
                <h3 style="margin-bottom: 1.5rem;">Edit Transaction</h3>
                
                <div class="form-group">
                    <label>Description</label>
                    <input type="text" id="edit-txn-desc" class="input-field" value="${txn.description || txn.desc || ''}">
                </div>
                <div class="form-group">
                    <label>Amount (₹)</label>
                    <input type="number" id="edit-txn-amount" class="input-field" value="${txn.amount || 0}">
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 2rem;">
                    <button id="btn-txn-cancel" class="btn btn-sm btn-secondary">Cancel</button>
                    <button id="btn-txn-save" class="btn btn-sm btn-primary">Save Changes</button>
                </div>
            </div >
            `;

        document.body.appendChild(overlay);

        overlay.querySelector('#btn-txn-cancel').onclick = () => {
            document.body.removeChild(overlay);
        };

        overlay.querySelector('#btn-txn-save').onclick = () => {
            const newDesc = document.getElementById('edit-txn-desc').value;
            const newAmount = parseFloat(document.getElementById('edit-txn-amount').value) || 0;

            if (!newDesc) return alert("Description required");

            try {
                store.updateTransaction(txn.id, {
                    description: newDesc,
                    amount: newAmount
                });
                alert("Transaction Updated");
                document.body.removeChild(overlay);
                this.loadAdminPanel('cash');
            } catch (e) {
                alert("Update failed: " + e.message);
            }
        };
    }

    deleteTransaction(id) {
        if (confirm("Permanently delete this transaction record?")) {
            store.deleteTransaction(id);
            this.loadAdminPanel('cash');
        }
    }

    loadAdminPanel_Legacy() {
        const adminUser = store.getById('u_admin');
        const session = store.getSession();

        // Security check
        if (!session || session.role !== 'ADMIN') {
            return this.navigate('login');
        }

        // --- 1. System Stats Injection ---
        const userList = document.getElementById('admin-user-list');
        if (!userList) return; // Safety default

        const parentDiv = userList.closest('.view-section');
        let statsDiv = document.getElementById('admin-stats-dashboard');

        if (!statsDiv && parentDiv) {
            statsDiv = document.createElement('div');
            statsDiv.id = 'admin-stats-dashboard';
            statsDiv.style.marginBottom = '2rem';
            statsDiv.style.display = 'grid';
            statsDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
            statsDiv.style.gap = '1rem';

            // Insert before the table/list
            const table = parentDiv.querySelector('table') || parentDiv.querySelector('.table-responsive');
            if (table) parentDiv.insertBefore(statsDiv, table);
        }

        if (statsDiv) {
            try {
                const stats = store.getSystemStats();
                statsDiv.innerHTML = `
            < div class="card" style = "padding:1.5rem; text-align:center; background: #f8fafc;" >
                        <h4 style="margin-bottom:0.5rem; color:#64748b;">Total Revenue</h4>
                        <p style="font-size:1.5rem; font-weight:800; color:var(--color-primary);">₹${stats.totalRevenue}</p>
                    </div >
                    <div class="card" style="padding:1.5rem; text-align:center; background: #f8fafc;">
                        <h4 style="margin-bottom:0.5rem; color:#64748b;">System Share</h4>
                        <p style="font-size:1.5rem; font-weight:800; color:var(--color-success);">₹${stats.systemShare}</p>
                    </div>
                    <div class="card" style="padding:1.5rem; text-align:center; background: #f8fafc;">
                        <h4 style="margin-bottom:0.5rem; color:#64748b;">Total Sales</h4>
                        <p style="font-size:1.5rem; font-weight:800; color:var(--color-accent);">${stats.salesCount}</p>
                    </div>
        `;
            } catch (e) {
                console.error("Failed to load stats:", e);
                statsDiv.innerHTML = `< p class="text-error" > Error loading stats</p > `;
            }
        }

        const tbody = document.getElementById('admin-user-list');
        tbody.innerHTML = '';

        let users = store.getUsers();

        // Self-Healing: If Admin is logged in but not in user list (e.g. data cleared), restore Admin.
        if (session.id === 'u_admin' && !users.find(u => u.id === 'u_admin')) {
            console.warn("Restoring missing Admin user...");
            store.init(); // Re-runs default user creation
            users = store.getUsers(); // Refresh list
        }

        if (users.length === 0) {
            tbody.innerHTML = `< tr > <td colspan="7" style="text-align:center; padding: 2rem;">No users found.</td></tr > `;
            return;
        }

        users.forEach(u => {
            // Format Identities for Display (e.g., "C1001 (CID) x")
            let identityHtml = 'No ID';
            if (u.identities && u.identities.length > 0) {
                identityHtml = u.identities.map(i => `
            <div style = "display: inline-block; background: #eee; padding: 2px 6px; border-radius: 4px; margin: 2px; font-size: 0.85rem;" >
                ${i.id} (${i.type})
        <span onclick="app.deleteIdentity('${u.id}', '${i.id}')"
            style="cursor: pointer; color: red; font-weight: bold; margin-left: 4px;" title="Delete Identity">&times;</span>
                </div >
            `).join('');
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
            < td > ${identityHtml}</td >
            <td>${u.name}</td>
            <td>${u.mobile}</td>
            <td>${u.role}</td>
            <td>${u.minutesBalance}m</td>
            <td>₹${u.earnings || 0}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="app.manageUser('${u.id}')">Edit</button>
                ${u.role !== 'ADMIN' ? `<button class="btn btn-primary btn-sm" onclick="app.deleteUserWithConfirmation('${u.id}')">Del</button>` : ''}
            </td>
        `;
            tbody.appendChild(tr);
        });
    }

    deleteUserWithConfirmation(id) {
        if (confirm("Move this user to Recycle Bin? You can restore them later.")) {
            store.deleteUser(id);
            this.loadAdminPanel();
        }
    }

    deleteIdentity(userId, identityId) {
        if (confirm(`Are you sure you want to delete identity ${identityId}?`)) {
            store.deleteIdentity(userId, identityId);
            this.loadAdminPanel();
        }
    }

    editUser(id) {
        this.manageUser(id);
    }

    manageUser(id) {
        const user = store.getById(id);
        if (!user) return alert('User not found');
        this.showEditUserModal(user);
    }

    showEditUserModal(user) {
        const overlay = document.createElement('div');
        overlay.className = 'demo-overlay active';
        overlay.style.background = 'rgba(0,0,0,0.8)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';

        overlay.innerHTML = `
            <div style = "background: white; padding: 2rem; border-radius: 8px; width: 400px; color: black;" >
                <h3 style="margin-bottom: 1rem;">Edit User: ${user.name}</h3>
                <div class="form-group">
                    <label>Name</label>
                    <input type="text" id="edit-name" class="form-input" value="${user.name}">
                </div>
                <div class="form-group">
                    <label>Mobile</label>
                    <input type="text" id="edit-mobile" class="form-input" value="${user.mobile}">
                </div>
                <div class="form-group">
                    <label>PIN</label>
                    <input type="text" id="edit-pin" class="form-input" value="${user.pin}">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="edit-role" class="form-input">
                        <option value="BUYER" ${user.role === 'BUYER' ? 'selected' : ''}>BUYER</option>
                        <option value="SEEDER" ${user.role === 'SEEDER' ? 'selected' : ''}>SEEDER</option>
                        <option value="ADMIN" ${user.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Balance (Minutes)</label>
                    <input type="number" id="edit-minutes" class="form-input" value="${user.minutesBalance}">
                </div>

                <div style="display: flex; justify-content: space-between; margin-top: 2rem;">
                     ${user.role !== 'ADMIN' ?
                `<button id="btn-delete" class="btn btn-sm" style="background: var(--color-danger); color: white;">Delete User</button>`
                : '<div></div>'}
                    <div style="display: flex; gap: 0.5rem;">
                        <button id="btn-cancel" class="btn btn-sm btn-secondary">Cancel</button>
                        <button id="btn-save" class="btn btn-sm btn-primary">Save Changes</button>
                    </div>
                </div>
            </div >
            `;

        document.body.appendChild(overlay);

        // Event: Cancel
        overlay.querySelector('#btn-cancel').onclick = () => {
            document.body.removeChild(overlay);
        };

        // Event: Delete
        const delBtn = overlay.querySelector('#btn-delete');
        if (delBtn) {
            delBtn.onclick = () => {
                if (confirm(`Are you certain you want to move ${user.name} to the Recycle Bin ? `)) {
                    store.deleteUser(user.id);
                    document.body.removeChild(overlay);
                    this.loadAdminPanel();
                }
            };
        }

        // Event: Save
        overlay.querySelector('#btn-save').onclick = () => {
            const newName = document.getElementById('edit-name').value;
            const newMobile = document.getElementById('edit-mobile').value;
            const newPin = document.getElementById('edit-pin').value;
            const newRole = document.getElementById('edit-role').value;
            const newBalance = parseInt(document.getElementById('edit-minutes').value) || 0;

            if (!newName || !newMobile || !newPin) return alert("Please fill required fields");

            try {
                const updates = {
                    name: newName,
                    mobile: newMobile,
                    pin: newPin,
                    minutesBalance: newBalance,
                    role: newRole
                };

                // Sync name change to Identity Profile
                if (user.identities) {
                    updates.identities = user.identities.map(i => {
                        if (i.profile) i.profile.name = newName;
                        return i;
                    });
                }

                store.updateUser(user.id, updates);
                alert('User updated successfully');
                document.body.removeChild(overlay);
                this.loadAdminPanel();
            } catch (e) {
                alert("Update failed: " + e.message);
            }
        };
    }

    updateTheme(role) {
        document.body.classList.remove('theme-admin', 'theme-seeder', 'theme-buyer');
        switch (role) {
            case 'ADMIN':
                document.body.classList.add('theme-admin');
                break;
            case 'SEEDER':
                document.body.classList.add('theme-seeder');
                break;
            case 'BUYER':
                document.body.classList.add('theme-buyer');
                break;
            default:
                // Main Page / Default
                break;
        }
    }

    loadDashboard() {
        let user = store.getSession();

        // CRITICAL FIX: Reload user from Database to ensure Balance is fresh
        if (user && user.id) {
            const freshUser = store.getById(user.id);
            if (freshUser) {
                // Preserve session-specifics (like activeIdentityId)
                freshUser.activeIdentityId = user.activeIdentityId;
                user = freshUser;
                localStorage.setItem('ssb_session', JSON.stringify(user));
                console.log("Dashboard: User data refreshed from DB");
            }
        }

        if (user) {
            this.updateTheme(user.role);
        } else {
            this.updateTheme(null);
        }

        if (!user) return this.navigate('login');

        // --- 1. Identity Validation & Active ID Logic ---
        if (user.identities && user.identities.length > 0) {
            const validIdentities = user.identities.filter(i => i.id && typeof i.id === 'string');
            if (validIdentities.length !== user.identities.length) {
                console.warn("Found corrupted identities. Cleaning up...");
                user.identities = validIdentities;
                store.updateUser(user.id, { identities: user.identities });
                localStorage.setItem('ssb_session', JSON.stringify(user));
            }
        }

        // Find Active Identity
        const identity = user.identities ? user.identities.find(i => i.id === user.activeIdentityId) : null;
        const activeId = identity || (user.identities && user.identities.length > 0 ? user.identities[user.identities.length - 1] : null);

        if (!activeId) {
            console.error("No valid identity found for user:", user);
            return;
        }

        // --- 2. Self Repair & Recovery ---
        if (!activeId.id) {
            activeId.id = 'CID-REC-' + Date.now();
            store.updateUser(user.id, { identities: user.identities });
            localStorage.setItem('ssb_session', JSON.stringify(user));
        }
        if (activeId.type === 'CID' && (activeId.minutesBalance === undefined || activeId.minutesBalance === null)) {
            console.warn("Minutes Balance Missing. Repairing...");
            activeId.minutesBalance = 3650;
            store.updateUser(user.id, { identities: user.identities });
            localStorage.setItem('ssb_session', JSON.stringify(user));
        }

        // --- 3. UI Updates ---
        document.getElementById('user-name').textContent = `${user.name} (${activeId.id})`;

        // Show Mobile Number (Restored from Deprecated Logic)
        const mobileEl = document.getElementById('user-mobile');
        if (mobileEl) {
            mobileEl.textContent = user.mobile || '';
        }

        // --- 4. Balance Display Logic (Robust) ---
        if (activeId.type === 'SID' || user.role === 'SEEDER') {
            // Seeder Dashboard
            // User Feedback: Show Minutes as BIG number, Wallet as small/secondary
            // Current Layout: #user-balance is the big number
            document.getElementById('user-balance').textContent = activeId.minutesBalance || 0;
            document.getElementById('balance-unit').textContent = "mins";

            const labelEl = document.getElementById('balance-label');
            if (labelEl) {
                labelEl.setAttribute('data-i18n', 'dashboard.balance'); // Revert to "Your Minutes Balance"
                const lang = this.currentLang || 'en';
                labelEl.textContent = i18nData[lang]['dashboard.balance'];
            }

            // Secondary: Show Wallet Balance
            let walletEl = document.getElementById('seeder-min-balance'); // Reusing this ID for Wallet
            if (!walletEl) {
                walletEl = document.createElement('div');
                walletEl.id = 'seeder-min-balance';
                walletEl.style.fontSize = '1.1rem';
                walletEl.style.marginTop = '8px';
                walletEl.style.fontWeight = 'bold';
                walletEl.style.color = 'var(--color-primary-dark)';
                document.getElementById('user-balance').parentNode.appendChild(walletEl);
            }
            // Use translation or hardcoded symbol
            walletEl.innerHTML = `💰 ₹${activeId.walletBalance || 0} <span style="font-size:0.8rem; font-weight:normal; color:var(--color-text-muted);">Wallet</span>`;


            // --- 5. Custom Seeder Header Injection (Premium Design) ---
            const profile = activeId.profile || {
                name: user.name,
                address: 'Authorized Seeder',
                photo: 'assets/default_user.png'
            };

            const dashboardContainer = document.querySelector('#dashboard .container');
            if (dashboardContainer) {
                const welcomeHeader = dashboardContainer.querySelector('h2'); // The Welcome text
                const userInfo = dashboardContainer.querySelector('div'); // The name/mobile block

                // Hide standard welcome approach for Seeder
                if (welcomeHeader) welcomeHeader.style.display = 'none';
                if (userInfo && userInfo.id !== 'seeder-header') userInfo.style.display = 'none';

                // Insert Custom Seeder Header if not exists
                let seederHeader = document.getElementById('seeder-header');
                if (!seederHeader) {
                    seederHeader = document.createElement('div');
                    seederHeader.id = 'seeder-header';
                    seederHeader.className = 'seeder-profile-header';

                    // Photo
                    const photoSrc = (profile.photo && profile.photo.length > 100) ? profile.photo : 'assets/default_user.png';

                    seederHeader.innerHTML = `
            < img src = "${photoSrc}" class="profile-avatar-large" >
                <div class="profile-info">
                    <h2>${profile.name || user.name}</h2>
                    <div style="display:flex; gap:0.5rem; align-items:center;">
                        <span class="profile-tag">Authorized Seeder</span>
                        <span style="color:#64748B; font-weight:600;">|</span>
                        <span style="color:#64748B;">${activeId.id}</span>
                    </div>
                    <div style="font-size:0.9rem; font-weight:500; color:var(--color-text-main); margin-top:0.25rem;">
                        📞 ${user.mobile}
                    </div>
                    <div style="font-size:0.85rem; color:#94A3B8; margin-top:0.1rem;">
                        ${profile.address || ''}
                    </div>
                    <div style="margin-top:0.5rem;">
                        <button onclick="app.editSeederProfile('${activeId.id}')" style="font-size:0.8rem; color:var(--color-primary); text-decoration:underline;">Edit Profile</button>
                    </div>
                </div>
        `;

                    dashboardContainer.insertBefore(seederHeader, dashboardContainer.firstChild);
                } else {
                    seederHeader.style.display = 'flex'; // Ensure visible on refresh
                }
            }

            // Remove Old Sidebar Profile if it exists (Cleanup)
            const sidebarProfile = document.getElementById('seeder-profile-card');
            if (sidebarProfile) sidebarProfile.style.display = 'none';

            // Seeder Profile
            // ... (profile rendering) ...

            document.body.className = 'theme-seeder'; // Apply Seeder Theme
        } else {
            // Buyer Dashboard

            document.body.className = 'theme-buyer'; // Apply Buyer Theme (Focus)

            const balance = (activeId.minutesBalance !== undefined && activeId.minutesBalance !== null) ? activeId.minutesBalance : 0;
            const balanceEl = document.getElementById('user-balance');
            if (balanceEl) balanceEl.textContent = balance;

            const unitEl = document.getElementById('balance-unit');
            // Use translation key for unit
            if (unitEl) {
                unitEl.setAttribute('data-i18n', 'dashboard.unit');
                // Trigger update immediately if needed, but updateLanguage handles it ideally
                const lang = this.currentLang || 'en';
                unitEl.textContent = i18nData[lang]['dashboard.unit'] || 'mins';
            }

            // Ensure label also has key
            const labelEl = document.getElementById('balance-label');
            if (labelEl) {
                // Reset key just in case it was overwritten (though it shouldn't be)
                labelEl.setAttribute('data-i18n', 'dashboard.balance');
                const lang = this.currentLang || 'en';
                labelEl.textContent = i18nData[lang]['dashboard.balance'];
            }

            // Clean up Seeder specific elements
            const minBalEl = document.getElementById('seeder-min-balance');
            if (minBalEl) minBalEl.remove();

            // Remove seeder profile if present
            const profile = document.getElementById('seeder-profile-card');
            if (profile) profile.remove();
        }


        // --- 5. Partner Section Logic ---
        const partnerSection = document.getElementById('partner-section');
        const upgradeSection = document.getElementById('upgrade-section');
        const isFamilyMemberRole = user.role === 'FAMILY_MEMBER';
        const isPartner = user.role === 'PARTNER' || user.role === 'ADMIN' || user.role === 'SEEDER';

        if (isFamilyMemberRole) {
            partnerSection.classList.add('hidden');
            upgradeSection.classList.add('hidden');
        } else if (isPartner) {
            partnerSection.classList.remove('hidden');
            upgradeSection.classList.add('hidden');
            this.loadPartnerData(user, activeId); // CORRECTED Call for Premium Dashboard
        } else if (user.hasFamilyPlan && !isPartner) {
            partnerSection.classList.add('hidden');
            upgradeSection.classList.remove('hidden');
            // Family Plan Owner but not Seeder - Show standard upgrade banner
        } else {
            // Standard Buyer (No Family, No Seeder)
            partnerSection.classList.add('hidden');
            upgradeSection.classList.remove('hidden');

            // POPULATE BLANK AREA WITH CONTENT
            if (upgradeSection) {
                upgradeSection.innerHTML = this.renderInfoCard();
                // Ensure text is readable
                upgradeSection.style.color = 'var(--color-text-main)';
            }
        }

        // --- 6. Bind Break Button ---
        const startBtn = document.getElementById('start-break-btn');
        if (startBtn) {
            const newBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newBtn, startBtn);
            newBtn.addEventListener('click', () => this.showBreakSelection());
        }

        // --- 7. Family Section Logic ---
        let familyContainer = document.getElementById('family-section-container');
        if (!familyContainer) {
            familyContainer = document.createElement('div');
            familyContainer.id = 'family-section-container';
            if (upgradeSection && upgradeSection.parentNode) {
                upgradeSection.parentNode.insertBefore(familyContainer, upgradeSection);
            }
        }

        if (user.hasFamilyPlan || user.familySlots > 0 || (user.familyMembers && user.familyMembers.length > 0)) {
            this.loadFamilySection(user);
        } else {
            familyContainer.innerHTML = '';
        }

        // --- 8. Initialize Alarm Check ---
        this.startAlarmCheck();
        this.updateAlarmUI();
        // Ensure translations are applied to any dynamically injected content
        this.updateLanguage();
    }

    startAlarmCheck() {
        if (this.alarmInterval) clearInterval(this.alarmInterval);
        this.alarmInterval = setInterval(() => this.checkAlarm(), 30000); // Check every 30s
        this.checkAlarm(); // Immediate check
    }



    setAlarm() {
        const timeInput = document.getElementById('alarm-time');
        if (!timeInput || !timeInput.value) return alert("Please select a time.");

        // Request Desktop Notification Permission
        if ("Notification" in window) {
            if (Notification.permission === "granted") {
                // Already granted
            } else if (Notification.permission !== "denied") {
                Notification.requestPermission().then(permission => {
                    if (permission === "granted") {
                        new Notification("Sinaank Break Reminder", { body: "Notifications enabled!" });
                    }
                });
            } else {
                alert("Notifications are BLOCKED by your browser. Please enable them in site settings to receive alerts in other tabs.");
            }
        }

        const alarmTime = timeInput.value; // HH:MM format
        localStorage.setItem('ssb_alarm_time', alarmTime);
        localStorage.removeItem('ssb_alarm_last_triggered_date'); // Allow re-triggering today
        localStorage.setItem('ssb_alarm_triggered', 'false'); // Reset trigger status

        this.updateAlarmUI();
        console.log(`Alarm set for: ${alarmTime} `);
        alert("Reminder Set! Keep this tab open (even in background) to receive the alert.");
    }

    testNotification() {
        if (!("Notification" in window)) {
            alert("This browser does not support desktop notifications");
        } else if (Notification.permission === "granted") {
            new Notification("Sinaank Test", {
                body: "This is how your break reminder will appear!",
                icon: 'assets/logo.png'
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    new Notification("Sinaank Test", { body: "Permission granted!" });
                }
            });
        } else {
            alert("Notifications are disabled. Please check browser settings.");
        }
    }

    clearAlarm() {
        localStorage.removeItem('ssb_alarm_time');
        localStorage.removeItem('ssb_alarm_triggered');
        this.updateAlarmUI();
    }

    updateAlarmUI() {
        const alarmTime = localStorage.getItem('ssb_alarm_time');
        const statusDiv = document.getElementById('alarm-status');
        const displaySpan = document.getElementById('alarm-display-time');

        if (alarmTime && statusDiv && displaySpan) {
            // Convert to 12h format for display
            const [h, m] = alarmTime.split(':');
            const date = new Date();
            date.setHours(h);
            date.setMinutes(m);
            const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            displaySpan.textContent = timeString;
            statusDiv.style.display = 'block';
        } else if (statusDiv) {
            statusDiv.style.display = 'none';
        }
    }

    checkAlarm() {
        const alarmTime = localStorage.getItem('ssb_alarm_time');
        if (!alarmTime) return;

        const now = new Date();
        const currentHM = now.toTimeString().slice(0, 5); // HH:MM

        // Debug Log (Viewable in Console)
        // console.log(`Checking Alarm: Set = ${ alarmTime }, Now = ${ currentHM } `);

        // Check if already triggered today
        const lastTriggered = localStorage.getItem('ssb_alarm_last_triggered_date');
        const today = new Date().toDateString();

        if (alarmTime === currentHM) {
            if (lastTriggered !== today) {
                console.log("Triggering Alarm Now!");
                this.triggerAlarm();
                localStorage.setItem('ssb_alarm_last_triggered_date', today);
            } else {
                // console.log("Alarm already triggered today.");
            }
        }
    }

    triggerAlarm() {
        const toast = document.getElementById('alarm-toast');
        const msg = document.getElementById('alarm-msg');

        // Play Sound
        try {
            this.playBeep();
        } catch (e) { console.error("Alarm sound failed", e); }

        // Localize Text (Safe Mode)
        let alertText = "It's time for a Pause!";
        let flashText = "🔔 TIME FOR PAUSE! 🔔";

        try {
            const lang = this.currentLang || 'en';
            if (window.i18nData && window.i18nData[lang]) {
                if (window.i18nData[lang]['alarm.alert']) alertText = window.i18nData[lang]['alarm.alert'];
                if (window.i18nData[lang]['alarm.title_flash']) flashText = window.i18nData[lang]['alarm.title_flash'];
            }
        } catch (e) {
            console.error("Localization failed for alarm", e);
        }

        // 1. Desktop Notification
        if ("Notification" in window && Notification.permission === "granted") {
            try {
                const notification = new Notification("Sinaank Break Reminder", {
                    body: alertText,
                    icon: 'assets/logo.png', // Ensure this runs from root
                    tag: 'ssb-alarm' // Prevent duplicates
                });

                notification.onclick = () => {
                    window.focus();
                    this.dismissAlarm();
                    notification.close();
                };
            } catch (notifyErr) {
                console.error("System Notification failed:", notifyErr);
            }
        }

        // 2. In-App Toast
        if (toast && msg) {
            msg.textContent = alertText;
            toast.classList.remove('hidden');
        }
    }

    dismissAlarm() {
        const toast = document.getElementById('alarm-toast');
        if (toast) toast.classList.add('hidden');
        this.stopAudio(); // Stop beep if looping
    }

    // --- Audio Logic for Break ---

    async playPersonalizedBreak(user) {
        // Ensure context exists
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return console.error("Web Audio API not supported");

        this.stopAudio(); // clear previous

        this.audioCtx = new AudioContext();

        // 1. Resume Context if suspended (Browser Autoplay Policy)
        if (this.audioCtx.state === 'suspended') {
            try {
                await this.audioCtx.resume();
                console.log("AudioContext resumed successfully");
            } catch (e) {
                console.error("AudioContext resume failed", e);
            }
        }

        // Frequencies from startRealBreak
        const f1 = parseFloat(this.currentFreq1) || 144.72; // Left Ear
        const f2 = parseFloat(this.currentFreq2) || 432;    // Right Ear (Default if missing, but usually calc'd)

        console.log(`Starting Audio: L = ${f1} Hz, R = ${f2} Hz, State = ${this.audioCtx.state} `);

        // Oscillator 1 (Left)
        const osc1 = this.audioCtx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.value = f1;

        // Oscillator 2 (Right)
        const osc2 = this.audioCtx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = f2;

        // Panning
        // Use StereoPannerNode if available
        if (this.audioCtx.createStereoPanner) {
            const panL = this.audioCtx.createStereoPanner();
            panL.pan.value = -1; // Full Left

            const panR = this.audioCtx.createStereoPanner();
            panR.pan.value = 1; // Full Right

            // Volume Control (optional, prevent clipping)
            const gain = this.audioCtx.createGain();
            gain.gain.value = 0.5;

            osc1.connect(panL).connect(gain).connect(this.audioCtx.destination);
            osc2.connect(panR).connect(gain).connect(this.audioCtx.destination);
        } else {
            // Fallback for older browsers (ChannelMerger)
            const merger = this.audioCtx.createChannelMerger(2);
            osc1.connect(merger, 0, 0); // Input 0 -> Output 0 (Left)
            osc2.connect(merger, 0, 1); // Input 0 -> Output 1 (Right)
            merger.connect(this.audioCtx.destination);
        }

        osc1.start();
        osc2.start();

        this.audioOscillators = [osc1, osc2];
    }

    stopAudio() {
        if (this.audioOscillators) {
            this.audioOscillators.forEach(osc => {
                try { osc.stop(); } catch (e) { }
            });
            this.audioOscillators = null;
        }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch (e) { }
            this.audioCtx = null;
        }
    }

    playBeep() {
        // Simple Oscillator Beep
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();

        // Attempt to resume if suspended (autoplay policy)
        if (ctx.state === 'suspended') {
            ctx.resume().catch(e => console.error("Audio resume failed", e));
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

        osc.start();
        osc.stop(ctx.currentTime + 1);
    }

    loadFamilySection(user) {
        const container = document.getElementById('family-section-container');
        if (!container) return;

        // Logic: Total 3 slots.
        const members = user.familyMembers || [];
        const usedSlots = members.length;
        const remainingSlots = 3 - usedSlots;
        const displaySlots = remainingSlots < 0 ? 0 : remainingSlots;

        let membersHtml = '';
        if (members.length > 0) {
            membersHtml = '<ul style="margin-top: 1rem; list-style: none; padding: 0;">';
            members.forEach(m => {
                membersHtml += `< li style = "background: white; padding: 0.75rem; border-radius: 8px; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;" >
                    <span><strong style="color: var(--color-primary);">${m.name}</strong> (${m.mobile})</span>
                    <span style="font-size: 0.85rem; color: #64748b;" data-i18n="family.allocated_mins">3650 mins allocated</span>
                </li > `;
            });
            membersHtml += '</ul>';
        } else {
            membersHtml = `< p class="text-muted" data - i18n="family.no.members" > No family members added yet.</p > `;
        }

        // Add Member Button (Only if slots available)
        const lang = this.currentLang || 'en';
        const t = (typeof i18nData !== 'undefined' && i18nData[lang]) ? i18nData[lang] : {};

        let addBtn = '';
        if (displaySlots > 0) {
            addBtn = `< button class="btn btn-sm btn-primary" onclick = "app.showFamilyModal()" >
            ${t['family.add_btn'] || 'Add Member'} <span style="margin-left: 4px;">(${displaySlots} ${t['family.slots.left'] || 'slots left'})</span>
            </button > `;
        } else {
            addBtn = `< span class="text-muted" data - i18n="family.max.reached" > Max members reached</span > `;
        }

        container.innerHTML = `
            <div style = "margin-bottom: 2rem; padding: 1.5rem; background: #fff; border-radius: 1rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" >
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="color: var(--color-primary);">My Family</h3>
                    ${addBtn}
                </div>
                <p class="text-muted" style="font-size: 0.9rem; margin-top: 0.5rem;" data-i18n="family.desc">
                    You can add up to 3 family members. Each member gets their own account with 3650 minutes.
                </p>
                ${membersHtml}
            </div >
            `;

        this.updateLanguage();
    }

    loadPartnerData(user, activeIdentity) {
        const partnerSection = document.getElementById('partner-section');
        partnerSection.classList.remove('hidden');

        // Generate Referral Link for this SID
        // Self-Healing: If Seeder has no units, create one now.
        if (!activeIdentity.units || activeIdentity.units.length === 0) {
            console.warn("Seeder missing units. Auto-generating root unit...");
            if (!activeIdentity.units) activeIdentity.units = [];

            // We need to generate a code. activeIdentity.id is SID.
            // Helper: store.generateSCode might be available.
            let newCode = 'U' + activeIdentity.id.replace(/\D/g, ''); // Fallback: U + numeric part of SID

            if (store.generateSCode) {
                newCode = store.generateSCode(null);
            }

            activeIdentity.units.push({
                sCode: newCode,
                parentSCode: null,
                createdAt: new Date().toISOString()
            });

            // Persist immediately
            // We need to update the main user object
            const u = store.getById(user.id);
            const idx = u.identities.findIndex(i => i.id === activeIdentity.id);
            if (idx !== -1) {
                u.identities[idx] = activeIdentity;
                store.updateUser(user.id, { identities: u.identities });
            }
        }

        const firstUnit = activeIdentity.units && activeIdentity.units.length > 0 ? activeIdentity.units[0] : null;
        // FIX: Use href based split for robust local file support (file://) AND strip hash
        const baseUrl = window.location.href.split('#')[0].split('?')[0];
        const refLink = firstUnit ? `${baseUrl}?cid = ${activeIdentity.id}& scode=${firstUnit.sCode} ` : 'Error: No Unit';



        const lang = this.currentLang || 'en';
        const t = i18nData[lang] || i18nData['en'];

        // Calculate Stats
        const allUsers = store.getUsers();
        const team = allUsers.filter(u => u.identities && u.identities.some(i => i.referrerSid === activeIdentity.id));
        const teamCount = team.length;
        const unitsCount = activeIdentity.units ? activeIdentity.units.length : 0;
        const walletBal = activeIdentity.walletBalance || 0;
        const minutesBal = activeIdentity.minutesBalance || 0;

        // NEW: Premium Layout Structure
        partnerSection.innerHTML = `
            <!--1. Stats Row(Quick Glance)-- >
            <div class="stats-row" style="margin-bottom: 1.5rem;">
                <div class="mini-stat-card">
                    <div class="mini-stat-icon">👥</div>
                    <div>
                        <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.5px;">My Team</div>
                        <div class="text-xl font-bold text-main">${teamCount}</div>
                    </div>
                </div>
                <div class="mini-stat-card">
                    <div class="mini-stat-icon">🌱</div>
                    <div>
                        <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.5px;">Active Units</div>
                        <div class="text-xl font-bold text-main">${unitsCount}</div>
                    </div>
                </div>
                <div class="mini-stat-card" onclick="app.showIncomeList('${activeIdentity.id}')" style="cursor:pointer;">
                    <div class="mini-stat-icon">📋</div>
                    <div>
                        <div class="text-xs text-muted" style="text-transform:uppercase; letter-spacing:0.5px;">Income List</div>
                         <div class="text-sm font-bold text-primary">View History -></div>
                    </div>
                </div>
            </div>

            <!--2. Motivation / Notice Box-- >
            <div id="seeder-motivation-container" style="margin-bottom: 2rem;"></div>

            <!--3. Main Action Grid-- >
            <div class="seeder-action-grid">
                
                <!-- HERO CARD: Referral Center (Big Box) -->
                <div class="hero-card">
                    <div class="hero-card-title">
                        <span style="background:#FFFBEB; padding:4px; border-radius:4px;">🔗</span> 
                        <span data-i18n="partner.link">Your Referral Link</span>
                    </div>
                    <p class="text-muted text-sm" style="margin-bottom: 1rem;">
                        Share this link to grow your team. Earn ₹200 for every Family Pack activation.
                    </p>
                    
                    <div style="background: white; padding: 0.5rem; border-radius: 8px; border: 1px solid #E2E8F0; display: flex; gap: 0.5rem; box-shadow: inset 0 2px 4px rgba(0,0,0,0.03);">
                        <input type="text" id="ref-link" class="form-input" style="border:none; background:transparent; box-shadow:none;" readonly value="${refLink}">
                        <button class="btn btn-primary" onclick="app.copyLink()" style="padding: 0.5rem 1.5rem;">Copy</button>
                    </div>

                    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; align-items: center;">
                        <div class="text-sm text-muted">
                            <strong>Your ID:</strong> <span style="font-family:monospace; background:#F3F4F6; padding:2px 6px; border-radius:4px;">${activeIdentity.id}</span>
                        </div>
                         <div class="text-sm text-muted">
                            <strong>Unit Code:</strong> <span style="font-family:monospace; background:#F3F4F6; padding:2px 6px; border-radius:4px;">${firstUnit ? firstUnit.sCode : 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <!-- FINANCE CARD: Wallet & Payout -->
                <div class="finance-card">
                    <div>
                        <div style="font-size:0.85rem; opacity:0.8; text-transform:uppercase; letter-spacing:1px;">Available Balance</div>
                        <div class="wallet-amount">₹${walletBal}</div>
                        <div style="font-size:0.9rem; opacity:0.9; margin-bottom: 1rem;">
                             Total Earned: ₹${activeIdentity.totalEarnings || walletBal}
                        </div>
                    </div>

                    <div>
                        ${activeIdentity.payoutRequested
                ? `<button class="btn" style="width:100%; background:rgba(255,255,255,0.2); color:white; cursor:not-allowed;" disabled>
                                 ⏳ Request Sent
                               </button>
                               <div style="font-size:0.75rem; text-align:center; margin-top:0.5rem; opacity:0.7;">Processing by Admin</div>`
                : `<button class="btn" onclick="app.requestPayout('${user.id}')" style="width:100%; background:#FCD34D; color:#78350F; font-weight:bold; box-shadow:0 4px 6px rgba(0,0,0,0.2);">
                                 Request Payout ➔
                               </button>`
            }
                    </div>
                </div>

            </div>

            <!--Units List(Hidden by default, expandable ?) - Keeping simple list for now-- >
            <div style="margin-top: 2rem;">
                 <h4 style="margin-bottom: 1rem; color:var(--color-text-muted);">Recent Unit Activity</h4>
                 <div id="unit-list" style="display:flex; flex-direction:column; gap:1rem;"></div>
            </div>
            
            <div class="hidden">
                 <div id="team-list"></div>
            </div>

            <!--Feedback / Conversation Box-- >
            <div id="seeder-feedback-container" style="margin-top: 2rem;"></div>
        `;

        // Render Sub-components
        this.renderMotivationBox(activeIdentity);
        this.renderFeedbackBox(user.id);

        // Populate Unit List Logic
        const unitList = document.getElementById('unit-list');
        const units = activeIdentity.units || [];
        // ... (existing unit populating logic to follow in next block or keep existing if possible)
        // Re-adding the unit population logic since we overwrote the innerHTML
        if (units.length > 0) {
            units.slice(0, 3).forEach(unit => { // Show max 3 recently
                const div = document.createElement('div');
                div.className = 'mini-stat-card';
                div.innerHTML = `
                <div style = "display:flex; justify-content:space-between; align-items:center; width:100%;" >
                    <div>
                        <div style="font-weight:bold; color: var(--color-primary);">${unit.sCode}</div>
                        <div style="font-size:0.8rem; color: var(--color-text-muted);">Parent: ${unit.parentSCode || 'Root'}</div>
                    </div>
                    <span style="font-size:0.8rem; background:#ECFDF5; color:#065F46; padding:2px 8px; border-radius:10px;">Active</span>
                </div >
            `;
                unitList.appendChild(div);
            });
            if (units.length > 3) {
                const more = document.createElement('div');
                more.style.textAlign = 'center';
                more.style.fontSize = '0.9rem';
                more.style.color = 'var(--color-primary)';
                more.innerText = `+ ${units.length - 3} more units`;
                unitList.appendChild(more);
            }
        } else {
            unitList.innerHTML = `< p class="text-muted text-sm" > No active units.</p > `;
        }

        // --- Payment History Section ---
        const historyContainer = document.createElement('div');
        historyContainer.style.marginTop = '2rem';
        historyContainer.innerHTML = '<h4 style="margin-bottom:1rem; color:var(--color-text-muted);">Transaction History 📜</h4>';

        const txns = activeIdentity.transactions || [];
        if (txns.length === 0) {
            historyContainer.innerHTML += '<p class="text-sm text-muted">No transactions found.</p>';
        } else {
            // Sort by date desc
            const sortedTxns = [...txns].sort((a, b) => new Date(b.date) - new Date(a.date));
            const table = document.createElement('table');
            table.className = 'data-table'; // Reuse global table style
            table.style.width = '100%';
            table.style.fontSize = '0.85rem';
            table.innerHTML = `
            < thead >
            <tr style="text-align:left; border-bottom:1px solid #eee;">
                <th style="padding:8px;">Date</th>
                <th style="padding:8px;">Amount</th>
                <th style="padding:8px;">Type</th>
                <th style="padding:8px;">Details</th>
            </tr>
                </thead >
            <tbody>
                ${sortedTxns.map(t => `
                        <tr style="border-bottom:1px solid #f9f9f9;">
                            <td style="padding:8px;">${new Date(t.date).toLocaleDateString()}</td>
                            <td style="padding:8px; font-weight:bold; color:${t.type === 'DEBIT' ? 'var(--color-danger)' : 'var(--color-success)'}">
                                ${t.type === 'DEBIT' ? '-' : '+'}₹${t.amount}
                            </td>
                            <td style="padding:8px;">
                                <span class="badge ${t.type === 'DEBIT' ? 'badge-danger' : 'badge-success'}" style="font-size:0.75rem;">${t.type}</span>
                            </td>
                            <td style="padding:8px;" class="text-xs text-muted">${t.desc || '-'}</td>
                        </tr>
                    `).join('')}
            </tbody>
        `;
            historyContainer.appendChild(table);
        }
        partnerSection.appendChild(historyContainer);
    }

    // --- Motivation & Feedback Logic ---

    renderMotivationBox(identity) {
        const container = document.getElementById('seeder-motivation-container');
        if (!container) return;

        const notice = store.getMotivation() || {}; // This is the Admin Notice
        const dailyQuote = this.getDailyQuote();   // This is the Auto-Generated Quote

        let html = '';

        // 1. Admin Notice (If active/exists)
        // We assume if text exists, it's an active notice.
        if (notice.text) {
            const isCritical = notice.type === 'NOTICE'; // Red/Yellow
            // Admin only sets "NOTICE" now, but keep logic flexible
            const noticeColor = isCritical ? '#FEF2F2' : '#FFFBEB';
            const noticeBorder = isCritical ? '#FCA5A5' : '#FCD34D';
            const icon = isCritical ? '📢' : 'ℹ️';

            html += `
            <div style = "background:${noticeColor}; border:1px solid ${noticeBorder}; padding:1rem; border-radius:12px; margin-bottom:1.5rem; display:flex; gap:1rem; align-items:start;" >
                <div style="font-size:1.5rem;">${icon}</div>
                <div>
                    <strong style="color:var(--color-primary-dark); display:block; margin-bottom:0.25rem;">Admin Notice</strong>
                    <div style="color:#1F2937; line-height:1.5;">${notice.text}</div>
                    ${notice.author ? `<div style="font-size:0.8rem; color:#6B7280; margin-top:0.5rem;">— ${notice.author}</div>` : ''}
                </div>
            </div > `;
        }

        // 2. Daily Motivation (Always Visible)
        html += `
            <div style = "background:linear-gradient(135deg, #ECFDF5, #D1FAE5); padding:1.5rem; border-radius:16px; position:relative; overflow:hidden;" >
            <!--Decorative Icon-- >
            <div style="position:absolute; top:-10px; right:-10px; font-size:4rem; opacity:0.1;">🌱</div>
            
            <h4 style="color:#047857; margin-bottom:0.75rem; display:flex; align-items:center; gap:0.5rem;">
                <span>💡</span> Daily Inspiration
            </h4>
            <p style="font-size:1.1rem; color:#065F46; font-style:italic; line-height:1.6; margin-bottom:0;">
                "${dailyQuote}"
            </p>
        </div >
            `;

        container.innerHTML = html;
    }

    renderFeedbackBox(userId) {
        const container = document.getElementById('seeder-feedback-container');
        if (!container) return;

        const myFeedback = store.getFeedback(userId);
        const latest = myFeedback[0]; // Most recent

        // State Determination
        let contentHtml = '';

        if (latest && latest.status === 'OPEN') {
            // Waiting for Reply
            contentHtml = `
            <div style = "background:#F3F4F6; padding:1rem; border-radius:8px; border:1px solid #E5E7EB;" >
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <span style="font-weight:bold; color:#4B5563;">Your Request</span>
                        <span class="badge" style="background:#DBEAFE; color:#1E40AF;">Pending Review</span>
                    </div>
                    <p style="font-style:italic; color:#374151;">"${latest.message}"</p>
                    <div style="margin-top:0.5rem; font-size:0.8rem; color:#6B7280;">Sent: ${new Date(latest.createdAt).toLocaleString()}</div>
                    <div style="margin-top:1rem; padding-top:0.5rem; border-top:1px solid #E5E7EB; text-align:center; color:#6B7280; font-size:0.85rem;">
                        Please wait for the System Admin to reply.
                    </div>
                </div >
            `;
        } else if (latest && latest.status === 'REPLIED') {
            // Show Reply + Close Action
            contentHtml = `
            <div style = "background:#ECFDF5; padding:1rem; border-radius:8px; border:1px solid #A7F3D0;" >
                    <div style="margin-bottom:0.75rem;">
                        <div style="font-size:0.85rem; color:#047857; margin-bottom:0.25rem;">You Asked:</div>
                        <div style="color:#064E3B; font-style:italic;">"${latest.message}"</div>
                    </div>
                    
                    <div style="background:white; padding:0.75rem; border-radius:6px; border-left:3px solid #059669; margin-bottom:1rem;">
                        <div style="font-weight:bold; color:#059669; margin-bottom:0.25rem;">System Reply:</div>
                        <p style="margin:0; color:#111827;">${latest.reply}</p>
                    </div>

                    <button class="btn btn-sm" onclick="app.closeFeedback('${latest.id}')" style="width:100%; background:#059669; color:white;">
                        Acknowledge & Close Ticket
                    </button>
                    <div style="text-align:center; margin-top:0.5rem; font-size:0.75rem; color:#047857;">Only one ticket allowed at a time. Close this to open a new one.</div>
                </div >
            `;
        } else {
            // New Ticket Form
            contentHtml = `
            <div style = "background:white; padding:1rem; border-radius:8px; border:1px solid #E5E7EB; box-shadow:0 1px 2px rgba(0,0,0,0.05);" >
                    <h4 style="margin:0 0 0.5rem 0; color:#111827;">Conversation with System</h4>
                    <p style="font-size:0.85rem; color:#6B7280; margin-bottom:1rem;">
                        Use this box for queries, suggestions, or issues. 
                        <br><strong style="color:#DC2626;">Safety: Do NOT share PINs or OTPs here.</strong>
                    </p>
                    
                    <textarea id="feedback-msg" rows="3" class="form-input" style="width:100%; margin-bottom:0.5rem;" placeholder="Type your message here..."></textarea>
                    <button class="btn btn-primary" onclick="app.submitFeedback('${userId}')" style="width:100%;">Send Message</button>
                </div >
            `;
        }

        container.innerHTML = contentHtml;
    }

    submitFeedback(userId) {
        const msg = document.getElementById('feedback-msg').value.trim();
        if (!msg) return alert("Please enter a message.");
        if (msg.length < 5) return alert("Message too short.");

        try {
            store.submitFeedback(userId, msg);
            alert("Message sent successfully!");
            this.renderFeedbackBox(userId); // Re-render
        } catch (e) {
            alert(e.message);
        }
    }

    closeFeedback(id) {
        if (!confirm("Are you sure you want to close this ticket?")) return;
        store.closeFeedback(id);
        const user = store.getSession();
        this.renderFeedbackBox(user.id);
    }
    requestPayout(userId) {
        if (!confirm("Are you sure you want to request a payout for your available wallet balance?")) return;

        try {
            store.requestPayout(userId);
            alert("Payout request sent successfully! Admin will process it shortly.");
            location.reload(); // Simple reload to refresh state
        } catch (e) {
            alert("Error: " + e.message);
        }
    }

    // Legacy support wrapper or helper
    renderPayoutButton() {
        return; // Handled in loadPartnerData HTML generation
    }

    // No need to set value manually since we injected it in HTML, but for safety/updates:
    updateRefLinkFallback(refLink) {
        if (document.getElementById('ref-link')) document.getElementById('ref-link').value = refLink;
    }

    upgradeToPartner() {
        const user = store.getSession();
        // find active CID to display
        const activeId = user.activeIdentityId || (user.identities && user.identities.length > 0 ? user.identities[0].id : 'Unknown');
        const cidText = document.getElementById('seed-cid-text');
        if (cidText) cidText.textContent = activeId;

        document.getElementById('seeder-upgrade-modal').classList.remove('hidden');
    }

    closeSeederUpgradeModal() {
        document.getElementById('seeder-upgrade-modal').classList.add('hidden');
        document.getElementById('seeder-upgrade-form').reset();
        document.getElementById('seed-photo-preview').src = 'assets/default_user.png';
    }

    async handleSeederUpgrade(e) {
        e.preventDefault();
        const user = store.getSession();
        if (!user) return;

        // Find Identity to Upgrade (First CID usually)
        // If already has units, upgrade the one generating them?
        // Default to activeIdentity
        const targetId = user.activeIdentityId || (user.identities[0] ? user.identities[0].id : null);
        if (!targetId) return alert("No identity found to upgrade.");

        // Structured Address
        // Re-gathering these from the form since the original version here hardcoded them differently
        // We need to match the IDs used in the form: seed-hno, seed-street, seed-po, seed-city, seed-state, seed-country, seed-pin
        const hno = document.getElementById('seed-hno').value;
        const street = document.getElementById('seed-street').value;
        const po = document.getElementById('seed-po').value;
        const city = document.getElementById('seed-city').value;
        const state = document.getElementById('seed-state').value;
        const country = document.getElementById('seed-country').value || 'India';
        const pin = document.getElementById('seed-pin').value;
        const upiId = document.getElementById('seed-upi').value; // New Field

        // Validation
        if (!document.getElementById('seed-terms').checked) return alert("Please accept the Terms & Conditions.");
        const name = document.getElementById('seed-name').value;
        if (!name) return alert("Please enter your Full Name.");
        if (!pin || pin.length !== 6) return alert("Please enter a valid PIN Code.");
        if (!hno || !street) return alert("Please enter House No and Street.");
        if (!po) return alert("Please select a Post Office.");

        // Construct formatted address string
        const address = `${hno}, ${street}, ${po}, ${city}, ${state}, ${country} - ${pin} `;

        const formData = {
            name: name,
            address: address,
            upiId: upiId, // Save UPI
            photo: 'assets/default_user.png' // Default, will be overwritten if upload exists
        };

        // handle image upload
        const fileInput = document.getElementById('seed-photo');
        if (fileInput.files && fileInput.files[0]) {
            try {
                // Resize before saving to avoid QuotaExceededError
                const base64 = await this.resizeImage(fileInput.files[0], 500, 500, 0.7);
                formData.photo = base64;
            } catch (err) {
                console.error("Image processing failed", err);
                alert("Image upload failed. Using default.");
            }
        } else {
            // Keep existing photo if this is an update and no new file selected
            const existingIdentity = user.identities.find(i => i.id === targetId);
            if (existingIdentity && existingIdentity.profile && existingIdentity.profile.photo) {
                formData.photo = existingIdentity.profile.photo;
            }
        }

        try {
            // Check if already a Seeder (Update Mode) - Reuse upgradeToSeeder or just update?
            // store.upgradeToSeeder handles logic: if SID exists, it might error "Already a Seeder".
            // We need a way to just UPDATE profile if already seeder.

            const existingIdentity = user.identities.find(i => i.id === targetId);
            if (existingIdentity && existingIdentity.type === 'SID') {
                // Update specific identity profile directly
                existingIdentity.profile = formData;

                // CRITICAL FIX: Update Root User Name as well so it appears in Admin/Referrals
                store.updateUser(user.id, {
                    name: formData.name,
                    identities: user.identities
                });
                alert("Profile Updated Successfully!");
            } else {
                // First Time Upgrade
                store.upgradeToSeeder(user.mobile, targetId, formData);
                alert("Upgrade Successful! Welcome, Seeder.");
            }

            this.closeSeederUpgradeModal();
            this.loadDashboard(); // Refresh UI
        } catch (err) {
            console.error(err);
            alert("Action Failed: " + err.message);
        }
    }

    readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    resizeImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = error => reject(error);
            };
            reader.onerror = error => reject(error);
        });
    }

    populateTeamList(seederId) {
        const teamList = document.getElementById('team-list');
        if (!teamList) return;

        // Fetch team members
        // Logic: Find users who have an identity with referrerSid === seederId
        // OR users who were referred by this seeder (if we store referrer on user level)
        const allUsers = store.getUsers();
        const team = allUsers.filter(u => {
            // Check if any identity has referrerSid matching seederId
            return u.identities && u.identities.some(i => i.referrerSid === seederId);
        });

        if (team.length === 0) {
            teamList.innerHTML = '<li class="text-muted">No team members yet. Share your link!</li>';
            return;
        }

        teamList.innerHTML = team.map(member => {
            // Mask mobile
            const maskedMobile = member.mobile.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2');
            const joinDate = this.formatDate(member.createdAt);
            // Default Avatar
            const avatar = 'assets/default_user.png';

            return `
            < div class="card" style = "padding: 1rem; display: flex; align-items: center; gap: 1rem; transition: transform 0.2s;" >
                <img src="${avatar}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; opacity: 0.8;">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--color-text-main);">${member.name}</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-muted);">${maskedMobile}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.75rem; color: var(--color-text-light); text-transform: uppercase; font-weight: 600;">Joined</div>
                        <div style="font-size: 0.85rem; color: var(--color-text-muted);">${joinDate}</div>
                    </div>
                </div>
        `;
        }).join('');
    }

    previewSeederPhoto(input) {
        const preview = document.getElementById('seed-photo-preview');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                preview.src = e.target.result;
            }
            reader.readAsDataURL(input.files[0]);
        } else {
            preview.src = 'assets/default_user.png';
        }
    }

    editSeederProfile(id) {
        const user = store.getSession();
        const identity = user.identities.find(i => i.id === id);
        if (!identity || !identity.profile) return;

        // Populate Form
        const parts = identity.profile.address.split(' - ');
        const pin = parts[1] || '';
        const addrParts = parts[0].split(', ');

        // Basic re-population (Best effort parsing)
        document.getElementById('seed-name').value = identity.profile.name || user.name;
        document.getElementById('seed-pin').value = pin;
        document.getElementById('seed-hno').value = addrParts[0] || '';
        document.getElementById('seed-street').value = addrParts[1] || '';

        // Update Photo Preview
        document.getElementById('seed-photo-preview').src = identity.profile.photo || 'assets/default_user.png';

        // Trigger PIN fetch to populate readonly fields and PO
        if (pin) {
            this.handlePinInput(pin).then(() => {
                // Wait for fetch, then set PO
                // PO is at index 2.
                const poEl = document.getElementById('seed-po');
                if (poEl && addrParts[2]) {
                    poEl.value = addrParts[2];
                }
            });
        }

        const termsCheck = document.getElementById('seed-terms');
        if (termsCheck) termsCheck.checked = true; // Assume accepted

        // Ensure terms label has translation
        const termsLabel = document.querySelector('label[for="seed-terms"] span');
        if (termsLabel) termsLabel.setAttribute('data-i18n', 'modal.reg.agree');

        // Show Modal
        const modal = document.getElementById('seeder-upgrade-modal');
        if (modal) modal.classList.remove('hidden');
    }

    showIncomeList(id) {
        alert("Income List feature coming soon! Check your Wallet Balance for total earnings.");
    }

    async handlePinInput(pin) {
        const pinStatus = document.getElementById('pin-status');
        const poSelect = document.getElementById('seed-po');

        if (!pin || pin.length !== 6) {
            pinStatus.innerHTML = '';
            poSelect.innerHTML = '<option value="" disabled selected>Select Post Office</option>';
            return;
        }

        pinStatus.innerHTML = '<span class="text-muted">Searching...</span>';

        try {
            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
            const data = await response.json();

            if (data && data[0].Status === 'Success') {
                const postOffices = data[0].PostOffice;
                const details = postOffices[0];

                document.getElementById('seed-country').value = 'India';
                document.getElementById('seed-state').value = details.State;
                document.getElementById('seed-city').value = details.District;

                // Populate PO Dropdown
                poSelect.innerHTML = '<option value="" disabled selected>Select Post Office</option>';
                postOffices.forEach(po => {
                    const option = document.createElement('option');
                    option.value = po.Name;
                    option.textContent = po.Name;
                    poSelect.appendChild(option);
                });

                pinStatus.innerHTML = '<span style="color:var(--color-success)">✓ Found</span>';
            } else {
                pinStatus.innerHTML = '<span style="color:var(--color-danger)">Invalid PIN</span>';
                document.getElementById('seed-state').value = '';
                document.getElementById('seed-city').value = '';
                document.getElementById('seed-country').value = '';
                poSelect.innerHTML = '<option value="" disabled selected>Select Post Office</option>';
            }
        } catch (e) {
            console.error("PIN Fetch Error:", e);
            pinStatus.innerHTML = '<span style="color:var(--color-text-muted)">Offline</span>';
        }
    }




    // --- Family Logic ---

    showFamilyModal() {
        document.getElementById('family-modal').classList.remove('hidden');
    }

    closeFamilyModal() {
        document.getElementById('family-modal').classList.add('hidden');
        document.getElementById('family-form').reset();
    }

    handleFamilySubmit(e) {
        e.preventDefault();
        const user = store.getSession();
        if (!user) return;

        // const name = document.getElementById('fam-name').value; // Removed
        const mobile = document.getElementById('fam-mobile').value;
        const pin = document.getElementById('fam-pin').value;
        const name = "Family Member"; // Default name as per request

        if (mobile.length !== 10) return alert("Invalid Mobile");
        // if (!name) return alert("Please enter member name"); // Removed validation
        if (pin.length !== 4) return alert("Invalid PIN");

        try {
            store.addFamilyMember(user.id, { name, mobile, pin });

            // Success
            alert('Family Member Added Successfully!');
            this.closeFamilyModal();

            // Refresh Dashboard
            const updatedUser = store.getById(user.id);
            localStorage.setItem('ssb_session', JSON.stringify(updatedUser)); // Update session
            this.loadDashboard();

        } catch (error) {
            alert("Failed to add member: " + error.message);
        }
    }

    // --- Modal Helpers ---

    showTerms(isAcceptance = false) {
        document.getElementById('terms-modal').classList.remove('hidden');
        const closeBtn = document.getElementById('btn-terms-close');
        const acceptBtn = document.getElementById('btn-terms-accept');

        if (isAcceptance) {
            closeBtn.classList.add('hidden');
            acceptBtn.classList.remove('hidden');
        } else {
            closeBtn.classList.remove('hidden');
            acceptBtn.classList.add('hidden');
        }
    }

    closeTerms() {
        document.getElementById('terms-modal').classList.add('hidden');
        if (this.pendingLoginUser) {
            // If they close without accepting during login flow, logout
            this.logout();
            this.pendingLoginUser = null;
        }
    }

    acceptTerms() {
        if (this.pendingLoginUser) {
            store.updateUser(this.pendingLoginUser.id, { termsAccepted: true });

            // Refresh session with updated user
            const updatedUser = store.getById(this.pendingLoginUser.id);
            localStorage.setItem('ssb_session', JSON.stringify(updatedUser)); // Update session logic to be safe

            this.pendingLoginUser = null;
            this.closeTerms();

            // Proceed to Login Success
            this.checkAuth();
            if (updatedUser.role === 'ADMIN') {
                this.navigate('admin');
            } else {
                this.navigate('dashboard');
            }
        }
    }
    resetDataExceptAdmin() {
        if (!confirm("⚠️ WARNING: This will delete ALL user data (Buyers, Seeders, Transactions). Only the Admin account will remain.\n\nAre you sure?")) {
            return;
        }

        const admin = store.getById('u_admin');
        if (!admin) {
            alert("Admin account not found! Cannot reset safely.");
            return;
        }

        // Clear LocalStorage
        localStorage.clear();

        // Restore Admin
        const users = [admin];
        localStorage.setItem('ssb_users', JSON.stringify(users));

        // Preserve Versions to prevent Double-Wipe by App.init
        localStorage.setItem('ssb_app_version', this.APP_VERSION);
        localStorage.setItem('ssb_db_version', '4'); // Start at stable version

        alert("System Reset Complete. Admin preserved.");
        window.location.reload();
    }

    renderInfoCard() {
        return `
            <div class="glass-card" style="margin-top: 2rem;">
                <h3 style="color: var(--color-primary); margin-bottom: 1rem;" data-i18n="learn.whatis.title">What is SDP?</h3>
                <p style="margin-bottom: 1rem; line-height: 1.6;" data-i18n="learn.whatis.text">
                    SDP (Sinaank Digital Pause) is a digital wellness system that reduces screen fatigue using special color and sound combinations.
                </p>

                <h4 style="color: var(--color-primary-dark); margin-top: 1.5rem; margin-bottom: 0.5rem;" data-i18n="learn.how.title">How to use SDP</h4>
                <ul style="padding-left: 1.2rem; line-height: 1.6; margin-bottom: 1.5rem;">
                    <li data-i18n="learn.how.li1">Click on "Start Pause"</li>
                    <li data-i18n="learn.how.li2">Choose a 2 / 5 / 10 minute pause</li>
                    <li data-i18n="learn.how.li3">Stay away from the screen and experience the sound and color</li>
                    <li data-i18n="learn.how.li4">Return to your work with a fresh mind after the pause</li>
                </ul>

                <h4 style="color: var(--color-primary-dark); margin-top: 1.5rem; margin-bottom: 0.5rem;" data-i18n="learn.family.title">For Family & Sharing</h4>
                <p style="margin-bottom: 0.5rem; line-height: 1.6;" data-i18n="learn.family.text">
                    SDP Family Pack is available...
                </p>

                <div style="background: rgba(255, 255, 255, 0.5); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                    <h5 style="margin-bottom: 0.5rem; color: var(--color-primary);\" data-i18n="learn.partner.title">Simple meaning of SDP Partner</h5>
                    <ul style="padding-left: 1.2rem; line-height: 1.5; font-size: 0.95rem;">
                        <li data-i18n="learn.partner.li1">You use SDP yourself</li>
                        <li data-i18n="learn.partner.li2">And if you want, you can suggest it to your friends...</li>
                        <li data-i18n="learn.partner.li3">The company gives you a thank-you benefit...</li>
                        <li data-i18n="learn.partner.li4">No force, no target pressure</li>
                    </ul>
                </div>

                <div style="margin-top: 1.5rem; background: #e0f2fe; padding: 1rem; border-radius: 8px; border-left: 4px solid var(--color-primary);">
                    <strong data-i18n="learn.tip">💡 Helpful Tip: Use SDP yourself first...</strong>
                </div>
                
                 <div style="margin-top: 1.5rem; text-align: center;">
                    <button class="btn btn-secondary" onclick="app.navigateToLearnMore()" style="width: 100%; border: 1px solid var(--color-primary);" data-i18n="partner.btn.learn_more">Learn More About Seeder Program</button>
                </div>
            </div>
        `;
    }

    renderWallet(user, activeId) {
        // 1. Balance
        const walletBalEl = document.getElementById('wallet-balance');
        if (walletBalEl) walletBalEl.textContent = activeId.walletBalance || 0;

        // Update Label to "Estimated Earnings" if needed dynamically, 
        // though i18n should handle it if data-i18n is "partner.wallet"
        const walletLabel = document.querySelector('[data-i18n="partner.wallet"]') || document.getElementById('balance-label');
        if (walletLabel) {
            const lang = this.currentLang || 'en';
            walletLabel.textContent = i18nData[lang]['partner.wallet'];
        }

        // 2. Network Stats
        const teamCountEl = document.getElementById('team-count');

        // Count direct referrals (rough approximation for now, or true count if I have it)
        const users = store.getUsers();
        // Find users referred by THIS identity
        const team = users.filter(u => u.referredBy === activeId.id);
        if (teamCountEl) teamCountEl.textContent = team.length;

        // 3. Transactions
        const historyEl = document.getElementById('wallet-history');
        if (historyEl) {
            historyEl.innerHTML = '';
            const txns = activeId.transactions || [];

            // Filter/Sort
            const recent = txns.slice().reverse().slice(0, 5);

            if (recent.length === 0) {
                historyEl.innerHTML = '<li class="text-muted text-center" style="padding:1rem;">No transactions yet</li>';
            } else {
                recent.forEach(t => {
                    const li = document.createElement('li');
                    li.className = 'glass-card';
                    li.style.cssText = 'padding: 0.75rem; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center; border: 1px solid rgba(0,0,0,0.05);';

                    const isCredit = t.type === 'CREDIT';
                    const color = isCredit ? 'var(--color-success)' : 'var(--color-danger)';
                    const sign = isCredit ? '+' : '-';

                    li.innerHTML = `
                        <div>
                            <div style="font-weight: 500;">${t.desc || 'Transaction'}</div>
                            <div style="font-size: 0.8rem; color: #888;">${this.formatDate(t.date)}</div>
                        </div>
                        <div style="font-weight: bold; color: ${color};">
                            ${sign}₹${t.amount}
                        </div>
                    `;
                    historyEl.appendChild(li);
                });
            }

            // Today's Income
            const today = new Date().toISOString().split('T')[0];
            const todayIncome = txns
                .filter(t => t.type === 'CREDIT' && t.date.startsWith(today))
                .reduce((sum, t) => sum + t.amount, 0);
            const todayEl = document.getElementById('today-income');
            if (todayEl) todayEl.textContent = `₹${todayIncome}`;
        }

        // 4. UPI ID, Request Payout & Status
        const profileCard = document.getElementById('seeder-profile-card');
        if (profileCard) {
            // Check if containers exist, if not create
            let actionContainer = document.getElementById('seeder-action-container');
            if (!actionContainer) {
                actionContainer = document.createElement('div');
                actionContainer.id = 'seeder-action-container';
                actionContainer.style.marginTop = '1rem';
                actionContainer.style.background = 'rgba(255,255,255,0.05)';
                actionContainer.style.padding = '0.75rem';
                actionContainer.style.borderRadius = '8px';

                const cardInner = profileCard.querySelector('.card');
                if (cardInner) cardInner.appendChild(actionContainer);
                else profileCard.appendChild(actionContainer);
            }

            const lang = this.currentLang || 'en';
            const t = i18nData[lang] || i18nData['en'];
            const balance = activeId.walletBalance || 0;
            const isRequested = activeId.payoutRequested;

            // UPI Input
            let upiHtml = `
                <div style="margin-bottom:1rem;">
                    <label style="font-size:0.75rem; color:var(--color-text-muted); display:block; margin-bottom:4px;">${t['partner.upi'] || 'UPI ID (for Payout)'}</label>
                    <div style="display:flex; gap:0.5rem;">
                        <input type="text" id="upi-id-input" value="${user.upiId || ''}" placeholder="${t['partner.upi_ph'] || 'Enter UPI ID'}" 
                            style="width:100%; padding:6px; font-size:0.9rem; border-radius:4px; border:1px solid rgba(255,255,255,0.2); background:rgba(0,0,0,0.2); color:white; outline:none;">
                        <button onclick="app.saveUpiId()" class="btn btn-secondary" style="padding:4px 10px; font-size:0.8rem; white-space:nowrap;">${t['partner.save_upi'] || 'Save'}</button>
                    </div>
                </div>
            `;

            // Payout Status / Button
            let statusHtml = '';
            if (isRequested) {
                // Formatting date safely
                let reqDate = 'Recent';
                try {
                    if (activeId.payoutRequestDate) reqDate = new Date(activeId.payoutRequestDate).toLocaleDateString();
                } catch (e) { }

                statusHtml = `
                    <div style="padding: 0.75rem; background: rgba(255, 193, 7, 0.1); border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 6px; text-align: center;">
                        <span style="color: #fbbf24; font-weight: bold;">🕒 ${t['partner.status.pending'] || 'Payout Requested'}</span>
                        <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 4px;">${reqDate}</div>
                    </div>
                 `;
            } else if (balance > 0) {
                statusHtml = `
                    <div style="text-align: center;">
                        <div style="font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--color-success);">${t['partner.msg.avail_bal'] || 'Available Balance'}: ₹${balance}</div>
                        <button onclick="app.requestPayout()" class="btn btn-primary" style="width: 100%; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">${t['partner.btn.request'] || 'Request Payout'}</button>
                    </div>
                 `;
            } else {
                statusHtml = `
                    <div style="text-align: center; color: var(--color-text-muted); font-size: 0.85rem; padding: 0.5rem;">
                        (Earn commissions to request payout)
                    </div>
                 `;
            }

            actionContainer.innerHTML = upiHtml + statusHtml;
        }
    }

    saveUpiId() {
        const input = document.getElementById('upi-id-input');
        if (!input) return;

        const newUpi = input.value.trim();
        if (!newUpi) return alert("Please enter UPI ID");

        const user = store.getSession();
        if (!user) return;

        // Use store helper if available, else generic update
        // We need to update the top-level user object, as UPI is personal
        try {
            store.updateUser(user.id, { upiId: newUpi });
            // Update session
            const freshUser = store.getById(user.id);
            // Preserve active identity
            freshUser.activeIdentityId = user.activeIdentityId;
            localStorage.setItem('ssb_session', JSON.stringify(freshUser));
            alert("UPI details saved!");
        } catch (e) {
            alert("Failed to save UPI: " + e.message);
        }
    }

    requestPayout() {
        const user = store.getSession();
        if (!user) return;

        // Validation
        // We check the STORED user for UPI to rely on backend state, or session which should be synced
        if (!user.upiId) return alert("Please save your UPI ID first.");

        const lang = this.currentLang || 'en';
        // Fallback text
        const confirmMsg = "Request payout for your current earnings? Admin will manually verify and transfer via UPI.";

        if (confirm(confirmMsg)) {
            try {
                store.requestPayout(user.id);

                // Refresh Dashboard to show 'Requested' status
                // We need to reload the user from store to get the updated Identity status
                const updatedUser = store.getById(user.id);
                updatedUser.activeIdentityId = user.activeIdentityId;
                localStorage.setItem('ssb_session', JSON.stringify(updatedUser));

                this.loadDashboard();

                const successMsg = (i18nData[lang] && i18nData[lang]['partner.msg.request_sent']) || "Payout Request Sent!";
                alert(successMsg);
            } catch (e) {
                alert("Error: " + e.message);
            }
        }
    }

    copyLink() {
        const linkInput = document.getElementById('ref-link');
        if (linkInput && linkInput.value) {
            navigator.clipboard.writeText(linkInput.value).then(() => {
                alert("Referral Link Copied!");
            });
        }
    }
}

// Global App Instance
// Global App Instance (Immediate)
const app = new App();
window.app = app;

// Explicit Global Handler for Purchase to avoid scope issues
window.handlePurchaseSubmit = function (e) {
    if (app) {
        app.handlePurchaseSubmit(e);
    } else {
        console.error("App not initialized yet");
    }
};

// Global Logout Handler
window.logout = function () {
    if (app) {
        app.logout();
    } else {
        console.error("App not initialized yet");
        // Fallback: Clear storage and reload
        localStorage.removeItem('ssb_session');
        window.location.reload();
    }
};

// Global Reset Helper (Removed for Safety)
window.resetBuyer = function () {
    alert("This feature is disabled for safety.");
};

window.toggleAuth = function () {
    if (app) {
        app.toggleAuth();
    } else {
        // Safe fallback if app crashes
        const session = localStorage.getItem('ssb_session');
        if (session) {
            localStorage.removeItem('ssb_session'); // Force logout
        } else {
            // Force reload to try init again or go to login (if handled by URL)
        }
        window.location.reload();
    }
};

