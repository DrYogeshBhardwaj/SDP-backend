// Auth Logic for login.html

class AuthApp {
    constructor() {
        this.init();
    }

    init() {
        // Auto-redirect removed to allow user to switch accounts or re-login.
        // const session = store.getSession();
        // if (session) { ... }

        this.bindEvents();
    }

    bindEvents() {
        // Mobile Input Handler (Auto-populate CIDs)
        const mobileInput = document.getElementById('login-mobile');
        if (mobileInput) {
            mobileInput.addEventListener('input', (e) => this.handleMobileInput(e));
            mobileInput.addEventListener('change', (e) => this.handleMobileInput(e));
        }

        // Login Form Submit
        const form = document.getElementById('login-form');
        if (form) {
            form.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    handleMobileInput(e) {
        const mobile = e.target.value;
        const cidSelect = document.getElementById('login-cid');

        if (mobile.length === 10) {
            const accounts = store.getCidsByMobile(mobile);
            cidSelect.innerHTML = '';

            if (accounts.length > 0) {
                accounts.forEach(acc => {
                    const opt = document.createElement('option');
                    opt.value = acc.cid; // This is the Identity ID (C1001 or S1001)

                    const typeLabel = acc.type === 'SID' ? 'Seeder' : (acc.type === 'CID' ? 'Buyer' : acc.type);
                    const balDisplay = acc.type === 'SID' ? `₹${acc.walletBalance || 0}` : `${acc.minutesBalance || 0}m`;

                    opt.textContent = `${acc.cid} (${typeLabel}) - ${balDisplay}`;
                    cidSelect.appendChild(opt);
                });

                // Auto-select first active or meaningful account
                cidSelect.selectedIndex = 0;
            } else {
                cidSelect.innerHTML = '<option value="" disabled selected>No accounts found</option>';
            }
        } else {
            cidSelect.innerHTML = '<option value="" disabled selected>Enter mobile first...</option>';
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const mobile = document.getElementById('login-mobile').value;
        const identityId = document.getElementById('login-cid').value;
        const pin = document.getElementById('login-pin').value;

        if (!identityId) {
            alert("Please select an Account ID.");
            return;
        }

        try {
            // Authenticate using Identity ID to ensure we log into specific account
            const user = store.authenticate(identityId, pin);

            if (user) {
                // Set Active Identity in Session
                user.activeIdentityId = identityId;
                localStorage.setItem('ssb_session', JSON.stringify(user));

                // Redirect based on Role/Identity Type
                const identity = user.identities.find(i => i.id === identityId);

                if (user.role === 'ADMIN' && identity.type === 'ADMIN') {
                    window.location.href = 'admin.html';
                } else if (identity.type === 'SID') {
                    window.location.href = 'seeder.html';
                } else {
                    // Buyer Logic: Check Plan Type
                    if (user.hasFamilyPlan) {
                        window.location.href = 'dashboard_580.html';
                    } else {
                        window.location.href = 'dashboard_178.html';
                    }
                }
            } else {
                alert("Invalid PIN or User not found.");
            }
        } catch (err) {
            console.error(err);
            alert("Login Error: " + err.message);
        }
    }
}

// Initialize
const authApp = new AuthApp();
