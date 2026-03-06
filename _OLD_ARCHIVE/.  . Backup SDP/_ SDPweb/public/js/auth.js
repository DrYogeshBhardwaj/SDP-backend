// Auth & Role Logic
// Config is handled by /__/firebase/init.js

const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

// --- Helpers for Mobile/PIN System ---
const AUTH_SUFFIX = "@sdp.com";
const PASS_SUFFIX = "SDP#2026"; // Padding to meet 6-char requirement

function emailFromMobile(mobile) {
    return mobile.trim() + AUTH_SUFFIX;
}

function passwordFromPin(pin) {
    return pin.trim() + PASS_SUFFIX;
}

function capitalizeName(name) {
    return name.replace(/\b\w/g, l => l.toUpperCase());
}

// Input Enforcers - Run on Load
document.addEventListener('DOMContentLoaded', () => {
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        if (input.id.includes('mobile') || input.id.includes('pin')) {
            // Enforce Numeric
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
            });
        }
        if (input.id.includes('name')) {
            // Enforce Capitalization
            input.addEventListener('input', (e) => {
                // Visual only during typing, finalized on submit
            });
            input.addEventListener('blur', (e) => {
                e.target.value = capitalizeName(e.target.value);
            });
        }
    });
});


// Role-based Redirects
function redirectUser(role) {
    switch (role) {
        case 'buyer178':
            window.location.href = 'dashboard_178.html';
            break;
        case 'buyer580':
            window.location.href = 'dashboard_580.html';
            break;
        case 'admin':
            window.location.href = 'admin_panel.html';
            break;
        case 'seeder': // Seeders share the 580 dashboard
            window.location.href = 'dashboard_580.html';
            break;

        case 'visitor':
            // Stay on index? If on index, do nothing.
            const path = window.location.pathname;
            const pageName = path.split("/").pop();
            // Don't redirect if on login page
            if (pageName !== 'index.html' && pageName !== 'login_original.html' && pageName !== '') {
                window.location.href = 'index.html';
            }
            break;
        default:
            console.error("Unknown role:", role);
    }
}

// Authentication State Observer
auth.onAuthStateChanged(user => {
    // Allow external control to stop auto-redirects (e.g. for Purchase flow)
    if (window.disableAuthRedirect) return;

    if (user) {
        // Check if we are on a dashboard page
        const path = window.location.pathname;
        const pageName = path.split("/").pop();

        // Fetch User Role from Firestore
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                const userRole = userData.role;

                // Security: Block Check
                if (userData.isBlocked) {
                    alert("Your account is blocked. Contact admin.");
                    auth.signOut().then(() => {
                        window.location.href = 'index.html';
                    });
                    return;
                }

                // Simple Route Protection Logic
                if (pageName === 'index.html' || pageName === '' || pageName === 'login_original.html') {
                    if (userRole !== 'visitor') {
                        redirectUser(userRole);
                    }
                } else if (pageName === 'dashboard_178.html' && userRole !== 'buyer178') {
                    redirectUser(userRole);
                } else if (pageName === 'dashboard_580.html' && userRole !== 'buyer580' && userRole !== 'seeder') {
                    redirectUser(userRole);
                } else if (pageName === 'admin_panel.html' && userRole !== 'admin') {

                    redirectUser(userRole);
                }
            } else {
                // If doc missing but auth exists
                alert("Account verification failed. Please contact support.");
            }
        }).catch(error => {
            console.error("Error getting user document:", error);
        });

        if (logoutBtn) logoutBtn.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';

    } else {
        const path = window.location.pathname;
        const pageName = path.split("/").pop();

        // Redirect to index if trying to access dashboards without login
        if (pageName !== 'index.html' && pageName !== 'login_original.html' && pageName !== '' && pageName !== 'buyer.html' && pageName !== 'seeder.html' && pageName !== 'admin-info.html') {
            // Allow static pages access
            window.location.href = 'login_original.html';
        }

        if (logoutBtn) logoutBtn.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'block';
    }
});

// Login Function
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const mobile = loginForm['login-mobile'].value;
        const pin = loginForm['login-pin'].value;

        // Validation
        if (mobile.length !== 10) { alert("Mobile must be 10 digits"); return; }
        if (pin.length !== 4) { alert("PIN must be 4 digits"); return; }

        const email = emailFromMobile(mobile);
        const password = passwordFromPin(pin);

        auth.signInWithEmailAndPassword(email, password).then(cred => {
            // Success - Observer handles redirect
        }).catch(err => {
            console.error(err.message);
            if (err.code === 'auth/user-not-found') {
                alert("Mobile number not registered.");
            } else if (err.code === 'auth/wrong-password') {
                alert("Incorrect PIN.");
            } else {
                alert(err.message);
            }
        });
    });
}

// Register Function
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const mobile = registerForm['register-mobile'].value;
        const pin = registerForm['register-pin'].value;

        // Strict Validation
        if (mobile.length !== 10) { alert("Mobile must be 10 digits"); return; }
        if (pin.length !== 4) { alert("PIN must be 4 digits"); return; }

        const email = emailFromMobile(mobile);
        const password = passwordFromPin(pin);

        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            // Create user document in Firestore with 'visitor' role
            return db.collection('users').doc(cred.user.uid).set({
                name: "Member", // Default since not collected
                mobile: mobile,
                email: email, // Keeping for ref, but login is via mobile
                role: 'visitor', // Default role
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            alert("Registration successful! Please wait...");
            loginForm.reset();
            registerForm.reset();
        }).catch(err => {
            console.error(err.message);
            if (err.code === 'auth/email-already-in-use') {
                alert("Mobile number already registered.");
            } else {
                alert(err.message);
            }
        });
    });
}

// Logout Function
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            window.location.href = 'login_original.html';
        });
    });
}
