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

        // Register Form Submit
        const regForm = document.getElementById('register-form');
        if (regForm) {
            regForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const mobile = document.getElementById('register-mobile').value;
        const pin = document.getElementById('register-pin').value;

        if (mobile.length !== 10) { alert("Mobile must be 10 digits"); return; }
        if (pin.length !== 4) { alert("PIN must be 4 digits"); return; }

        try {
            if (store.getUser(mobile)) {
                alert("User already exists. Please Login.");
                window.toggleAuth('login');
                return;
            }

            const user = store.createUser({
                mobile: mobile,
                pin: pin,
                name: "Member"
            });

            alert("Registration Successful! Please Login.");
            window.toggleAuth('login');
            // Pre-fill login
            document.getElementById('login-mobile').value = mobile;
            // Trigger input event to load CIDs? 
            // Manual trigger:
            this.handleMobileInput({ target: { value: mobile } });

        } catch (err) {
            alert("Registration Error: " + err.message);
        }
    }


    handleMobileInput(e) {
        const mobile = e.target.value;
        const cidSelect = document.getElementById('login-cid');
        if (!cidSelect) return; // Exit if dropdown doesn't exist (Legacy Mode)

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
        console.log("Login sequence started"); // Debug
        const mobile = document.getElementById('login-mobile').value;
        const cidElement = document.getElementById('login-cid');
        let identityId = cidElement ? cidElement.value : null;
        const pin = document.getElementById('login-pin').value;

        if (!identityId) {
            // Fallback: If no identity ID selected (or hidden), try using Mobile directly
            const mobileInput = document.getElementById('login-mobile');
            if (mobileInput && mobileInput.value.length === 10) {
                identityId = mobileInput.value;
            } else {
                alert("Please enter a valid 10-digit Mobile Number.");
                return;
            }
        }

        try {
            if (typeof store === 'undefined') {
                console.error("Critical: Window.store is undefined");
                alert("System Error: Store not loaded. Please refresh.");
                return;
            }

            console.log(`Attempting login for: ${identityId} with PIN length: ${pin.length}`);

            // Authenticate using Identity ID to ensure we log into specific account
            const user = store.authenticate(identityId, pin);

            if (user) {
                // Set Active Identity in Session
                user.activeIdentityId = identityId;
                localStorage.setItem('ssb_session', JSON.stringify(user));

                // Redirect based on Role/Identity Type
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('mode') === 'purchase') {
                    // Redirect back to index with same params to trigger purchase modal
                    window.location.href = `index.html${window.location.search}`;
                    return;
                }

                let identity = user.identities.find(i => i.id === identityId);
                if (!identity && user.identities.length > 0) {
                    // Fallback: Use the first identity or active one if specific ID match fails
                    identity = user.identities[0];
                }

                if (!identity) throw new Error("No valid identity found for this user.");

                if (user.role === 'ADMIN' && identity.type === 'ADMIN') {
                    window.location.href = 'admin_panel.html';
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
                console.warn("Login Failed: Invalid credentials or user not found.");
                alert("Login Failed: Invalid Mobile or PIN.");
            }
        } catch (err) {
            console.error(err);
            alert("Login Error: " + err.message);
        }
    }
}

// Initialize
// Initialize
const authApp = new AuthApp();
window.authApp = authApp;
