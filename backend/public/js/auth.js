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

        if (mobile.length !== 10) { 
            if (window.showAlert) window.showAlert("Mobile must be 10 digits");
            return; 
        }
        if (pin.length !== 4) { 
            if (window.showAlert) window.showAlert("PIN must be 4 digits");
            return; 
        }

        try {
            if (store.getUser(mobile)) {
                if (window.showAlert) window.showAlert("User already exists. Please Login.");
                window.toggleAuth('login');
                return;
            }

            const user = store.createUser({
                mobile: mobile,
                pin: pin,
                name: "Member"
            });

            if (window.showAlert) window.showAlert("Registration Successful! Please Login.", false);
            window.toggleAuth('login');
            // Pre-fill login
            document.getElementById('login-mobile').value = mobile;
            this.handleMobileInput({ target: { value: mobile } });

        } catch (err) {
            if (window.showAlert) window.showAlert("Registration Error: " + err.message);
        }
    }


    handleMobileInput(e) {
        const mobile = e.target.value;
        const cidSelect = document.getElementById('login-cid');
        if (!cidSelect) return; 

        if (mobile.length === 10) {
            const accounts = store.getCidsByMobile(mobile);
            cidSelect.innerHTML = '';

            if (accounts.length > 0) {
                accounts.forEach(acc => {
                    const opt = document.createElement('option');
                    opt.value = acc.cid;

                    const typeLabel = acc.type === 'SID' ? 'Seeder' : (acc.type === 'CID' ? 'Buyer' : acc.type);
                    const balDisplay = acc.type === 'SID' ? `₹${acc.walletBalance || 0}` : `${acc.minutesBalance || 0}m`;

                    opt.textContent = `${acc.cid} (${typeLabel}) - ${balDisplay}`;
                    cidSelect.appendChild(opt);
                });

                cidSelect.selectedIndex = 0;
            } else {
                cidSelect.innerHTML = '<option value="" disabled selected>No accounts found</option>';
            }
        } else {
            cidSelect.innerHTML = '<option value="" disabled selected>Enter mobile first...</option>';
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const mobile = document.getElementById('login-mobile').value;
        const cidElement = document.getElementById('login-cid');
        const pin = document.getElementById('login-pin').value;

        const btn = e.submitter || document.querySelector('#login-form button[type="submit"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Signing in...';
        }

        try {
            const res = await fetch('https://sdp-backend-production-c758.up.railway.app/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mobile, pin })
            });
            const data = await res.json();

            if (data.success) {
                localStorage.setItem('token', data.token || data.data?.token);
                localStorage.setItem('ssb_session', JSON.stringify(data.data.user));
                window.location.href = '../dashboard/dashboard.html';
            } else {
                if (window.showAlert) window.showAlert("Login Failed: " + (data.message || "Invalid Mobile or PIN"));
            }
        } catch (err) {
            if (window.showAlert) window.showAlert("Login System Error. Check connection.");
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = 'Sign In';
            }
        }
    }
}

// Initialize
const authApp = new AuthApp();
window.authApp = authApp;
