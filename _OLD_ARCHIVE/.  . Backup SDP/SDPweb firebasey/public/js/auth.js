// Auth & Role Logic
// Config is handled by /__/firebase/init.js

const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');

// Role-based Redirects
function redirectUser(role) {
    // console.log removed
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
        case 'visitor':
            // Stay on index? If on index, do nothing.
            const path = window.location.pathname;
            const pageName = path.split("/").pop();
            if (pageName !== 'index.html' && pageName !== '') {
                window.location.href = 'index.html';
            }
            break;
        default:
            console.error("Unknown role:", role);
    }
}

// Authentication State Observer
auth.onAuthStateChanged(user => {
    if (user) {
        // console.log removed
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
                if (pageName === 'index.html' || pageName === '') {
                    if (userRole !== 'visitor') {
                        redirectUser(userRole);
                    }
                } else if (pageName === 'dashboard_178.html' && userRole !== 'buyer178') {
                    // Strict: 178 only
                    redirectUser(userRole);
                } else if (pageName === 'dashboard_580.html' && userRole !== 'buyer580') {
                    // Strict: 580 only
                    redirectUser(userRole);
                } else if (pageName === 'admin_panel.html' && userRole !== 'admin') {
                    // Strict: Admin only
                    redirectUser(userRole);
                }
            } else {
                // console.log removed
                // Create user doc if missing (Fallback)
                db.collection('users').doc(user.uid).set({
                    email: user.email,
                    role: 'visitor',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }).then(() => {
                    // console.log removed
                    alert("Account initialized/Restored. Role: Visitor");
                });
            }
        }).catch(error => {
            console.error("Error getting user document:", error);
        });

        if (logoutBtn) logoutBtn.style.display = 'block';
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'none';

    } else {
        // console.log removed
        const path = window.location.pathname;
        const pageName = path.split("/").pop();

        // Redirect to index if trying to access dashboards without login
        if (pageName !== 'index.html' && pageName !== '') {
            window.location.href = 'index.html';
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
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        auth.signInWithEmailAndPassword(email, password).then(cred => {
            // console.log removed
        }).catch(err => {
            console.error(err.message);
            alert(err.message);
        });
    });
}

// Register Function
if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            // console.log removed
            // Create user document in Firestore with 'visitor' role
            return db.collection('users').doc(cred.user.uid).set({
                email: email,
                role: 'visitor', // Default role
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(() => {
            alert("Registration successful! Role: Visitor");
            loginForm.reset();
            registerForm.reset();
        }).catch(err => {
            console.error(err.message);
            alert(err.message);
        });
    });
}

// Logout Function
if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        auth.signOut().then(() => {
            // console.log removed
            window.location.href = 'index.html';
        });
    });
}
