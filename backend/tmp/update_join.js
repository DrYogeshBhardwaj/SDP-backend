const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/join.html');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace the login overlay HTML
const oldOverlayHtml = `    <!-- Login Required Overlay -->
    <div id="login-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.9); backdrop-filter: blur(8px); z-index: 2000; align-items: center; justify-content: center; padding: 1rem;">
        <div style="background: white; padding: 2.5rem; border-radius: 24px; max-width: 400px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
            <h2 style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Authentication Required</h2>
            <p style="color: var(--text-muted); margin-bottom: 2rem; line-height: 1.5;">To lock your identity and personalize your therapy, please login first.</p>
            <a href="login.html" id="login-link" style="display: block; width: 100%; padding: 1rem; background: var(--primary); color: white; border-radius: 12px; font-weight: 700; text-decoration: none; transition: transform 0.2s;">Login / Verify Mobile</a>
            <a href="index.html" style="display: block; margin-top: 1rem; color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">Back to Home</a>
        </div>
    </div>`;

const newOverlayHtml = `    <!-- Login Required Overlay (Updated Auth Popup) -->
    <div id="login-overlay" style="display: none; position: fixed; inset: 0; background: rgba(15,23,42,0.9); backdrop-filter: blur(8px); z-index: 2000; align-items: center; justify-content: center; padding: 1rem;">
        <div style="background: white; padding: 2.5rem; border-radius: 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🔐</div>
            <h2 id="auth-title" style="font-size: 1.5rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.5rem;">Verify Mobile</h2>
            <p id="auth-subtitle" style="color: var(--text-muted); margin-bottom: 1.5rem; line-height: 1.5; font-size: 0.95rem;">To lock your identity and join securely, verify your mobile number.</p>
            
            <div id="auth-alert" style="display: none; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 500; background: #fef2f2; color: #ef4444; border: 1px solid #fee2e2;"></div>

            <div id="auth-step-1">
                <form onsubmit="sendJoiningOTP(event)">
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Mobile Number</label>
                        <div style="display:flex;">
                            <span style="display:flex; align-items:center; padding:0 1rem; background:#f8fafc; border:1px solid #e2e8f0; border-right:none; border-radius:12px 0 0 12px; color:var(--text-muted); font-weight:600;">+91</span>
                            <input type="tel" id="auth-mobile" class="form-input" placeholder="10-digit number" maxlength="10" pattern="\\d{10}" required autofocus style="border-radius:0 12px 12px 0; border-left:none;">
                        </div>
                    </div>
                    <button type="submit" id="btn-send-otp" class="btn-submit" style="margin-top: 0.5rem;">Send OTP <span class="spinner" id="spinner-send" style="display:none; width: 14px; height: 14px; border-width: 2px;"></span></button>
                </form>
            </div>

            <div id="auth-step-2" style="display: none;">
                <form onsubmit="verifyJoiningOTP(event)">
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">OTP sent to <span id="auth-display-mobile" style="color:var(--text-main);"></span></label>
                        <input type="text" id="auth-otp" class="form-input" placeholder="XXXXXX" maxlength="6" pattern="\\d{6}" required style="text-align: center; letter-spacing: 6px; font-weight: 700; font-size: 1.25rem;">
                    </div>
                    <button type="submit" id="btn-verify-otp" class="btn-submit" style="margin-top: 0.5rem;">Verify OTP <span class="spinner" id="spinner-verify" style="display:none; width: 14px; height: 14px; border-width: 2px;"></span></button>
                    <div style="margin-top: 1.5rem;"><a href="#" onclick="cancelJoinAuth(event)" style="font-size: 0.85rem; color: var(--text-muted); text-decoration: none;">Change Number</a></div>
                </form>
            </div>

            <div id="auth-step-3" style="display: none;">
                <form onsubmit="submitJoiningPin(event)">
                    <div id="auth-name-group" style="display: none; text-align: left; margin-bottom: 1rem;">
                        <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">Full Name</label>
                        <input type="text" id="auth-name" class="form-input" placeholder="Your Name">
                    </div>
                    <div style="text-align: left; margin-bottom: 1rem;">
                        <label id="auth-pin-label" style="font-size: 0.85rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.5rem; display: block;">4-Digit PIN</label>
                        <input type="password" id="auth-pin" class="form-input" placeholder="****" maxlength="4" pattern="\\d{4}" required style="text-align: center; letter-spacing: 12px; font-weight: 700; font-size: 1.5rem;">
                    </div>
                    <button type="submit" id="btn-submit-pin" class="btn-submit" style="margin-top: 0.5rem;"><span id="btn-pin-text">Continue</span> <span class="spinner" id="spinner-pin" style="display:none; width: 14px; height: 14px; border-width: 2px;"></span></button>
                    <div style="text-align: center; margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted);">
                        By continuing, you agree to SDP's Terms & Conditions
                    </div>
                </form>
            </div>

            <div id="cancel-link-container">
                <a href="index.html" style="display: block; margin-top: 1.5rem; color: var(--text-muted); text-decoration: none; font-size: 0.9rem;">Cancel & Return Home</a>
            </div>
        </div>
    </div>`;

content = content.replace(oldOverlayHtml, newOverlayHtml);

// 2. Modify initAuth to show popup instead of redirecting
const initAuthOld1 = `                if (!token) {
                    const returnUrl = window.location.pathname + window.location.search;
                    window.location.href = "login.html?redirect=" + encodeURIComponent(returnUrl);
                    return;
                }`;
const initAuthNew1 = `                if (!token) {
                    document.getElementById('login-overlay').style.display = 'flex';
                    document.getElementById('auth-mobile').focus();
                    return;
                }`;
content = content.replace(initAuthOld1, initAuthNew1);

const initAuthOld2 = `                if (!res.ok || !data.success) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('ssb_session');
                    window.location.href = "login.html";
                    return;
                }`;
const initAuthNew2 = `                if (!res.ok || !data.success) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('ssb_session');
                    document.getElementById('login-overlay').style.display = 'flex';
                    document.getElementById('auth-mobile').focus();
                    return;
                }`;
content = content.replace(initAuthOld2, initAuthNew2);

// 3. Append the OTP / Auth JS functions before window.onload
const authJs = `

        // --- AUTHENTICATION POPUP LOGIC ---
        let authState = { mobile: '', sessionId: '', userExists: false };

        function showAuthAlert(msg, type = 'error') {
            const alertBox = document.getElementById('auth-alert');
            alertBox.textContent = msg;
            alertBox.style.display = 'block';
            alertBox.style.color = type === 'error' ? '#ef4444' : '#10b981';
            alertBox.style.background = type === 'error' ? '#fef2f2' : '#ecfdf5';
            alertBox.style.borderColor = type === 'error' ? '#fee2e2' : '#d1fae5';
            setTimeout(() => alertBox.style.display = 'none', 5000);
        }

        async function sendJoiningOTP(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-send-otp');
            const spinner = document.getElementById('spinner-send');
            authState.mobile = document.getElementById('auth-mobile').value;
            
            btn.disabled = true; spinner.style.display = 'inline-block';
            try {
                const res = await fetch('/api/send-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile: authState.mobile })
                });
                const data = await res.json();
                if (res.ok) {
                    authState.sessionId = data.data.sessionId;
                    document.getElementById('auth-display-mobile').textContent = "+91 " + authState.mobile;
                    document.getElementById('auth-step-1').style.display = 'none';
                    document.getElementById('auth-step-2').style.display = 'block';
                    document.getElementById('cancel-link-container').style.display = 'none';
                    document.getElementById('auth-otp').focus();
                } else {
                    showAuthAlert(data.message || 'Failed to send OTP');
                }
            } catch (err) {
                showAuthAlert('Network error.');
            } finally {
                btn.disabled = false; spinner.style.display = 'none';
            }
        }

        async function verifyJoiningOTP(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-verify-otp');
            const spinner = document.getElementById('spinner-verify');
            const otp = document.getElementById('auth-otp').value;
            
            btn.disabled = true; spinner.style.display = 'inline-block';
            try {
                const res = await fetch('/api/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mobile: authState.mobile, otp, sessionId: authState.sessionId })
                });
                const data = await res.json();
                if (res.ok) {
                    authState.userExists = data.data && data.data.userExists;
                    const user = data.data && data.data.user;
                    if (authState.userExists && user) {
                        // Success - user exists and token provided from verify (unusual but possible if API changed)
                        // If token is there, we can skip PIN. But let's follow the standard PIN flow.
                    }
                    setupPinStep();
                } else {
                    showAuthAlert(data.message || 'Invalid OTP');
                }
            } catch (err) {
                showAuthAlert('Network error verifying OTP');
            } finally {
                btn.disabled = false; spinner.style.display = 'none';
            }
        }

        function setupPinStep() {
            document.getElementById('auth-step-2').style.display = 'none';
            document.getElementById('auth-step-3').style.display = 'block';
            if (authState.userExists) {
                document.getElementById('auth-title').textContent = "Welcome Back";
                document.getElementById('auth-subtitle').textContent = "Enter your PIN to login securely.";
                document.getElementById('auth-pin-label').textContent = "Login PIN";
                document.getElementById('btn-pin-text').textContent = "Unlock Form";
            } else {
                document.getElementById('auth-title').textContent = "Create Account";
                document.getElementById('auth-subtitle').textContent = "Set a secure PIN for future logins.";
                document.getElementById('auth-pin-label').textContent = "Create 4-Digit PIN";
                document.getElementById('btn-pin-text').textContent = "Create & Unlock";
                document.getElementById('auth-name-group').style.display = 'block';
                document.getElementById('auth-name').required = true;
            }
            document.getElementById('auth-pin').focus();
        }

        async function submitJoiningPin(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-pin');
            const spinner = document.getElementById('spinner-pin');
            const pin = document.getElementById('auth-pin').value;
            const name = document.getElementById('auth-name').value;
            
            btn.disabled = true; spinner.style.display = 'inline-block';
            try {
                let res, data;
                if (authState.userExists) {
                    res = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ mobile: authState.mobile, pin })
                    });
                } else {
                    res = await fetch('/api/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'include',
                        body: JSON.stringify({ mobile: authState.mobile, pin, name, amount: PLANS[selectedPlanId].priceValue })
                    });
                    
                    if (res.ok) {
                        res = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({ mobile: authState.mobile, pin })
                        });
                    }
                }
                
                data = await res.json();
                if (res.ok && data.data && data.data.token) {
                    localStorage.setItem('token', data.data.token);
                    localStorage.setItem('ssb_session', JSON.stringify(data.data.user));
                    
                    // Auth success! Close overlay & re-init UI
                    document.getElementById('login-overlay').style.display = 'none';
                    initAuth();
                } else {
                    showAuthAlert(data.message || (authState.userExists ? 'Invalid PIN' : 'Registration failed'));
                }
            } catch (err) {
                showAuthAlert('Network error during authentication');
            } finally {
                btn.disabled = false; spinner.style.display = 'none';
            }
        }

        function cancelJoinAuth(e) {
            e.preventDefault();
            document.getElementById('auth-step-2').style.display = 'none';
            document.getElementById('auth-step-3').style.display = 'none';
            document.getElementById('auth-step-1').style.display = 'block';
            document.getElementById('cancel-link-container').style.display = 'block';
            document.getElementById('auth-otp').value = '';
            document.getElementById('auth-pin').value = '';
        }

        // --- END AUTHENTICATION POPUP LOGIC ---
`;

if (!content.includes('function sendJoiningOTP(')) {
    content = content.replace('window.onload = () => {', authJs + 'window.onload = () => {');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully updated join.html to include inline Auth Popup!');
