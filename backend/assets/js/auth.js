// assets/js/auth.js

const Auth = {
    // Check if user is logged in (calls backend /me endpoint)
    async checkAuth() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api.php?action=me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const res = await response.json();
            return res.data?.user || res.user || res.data; 
        } catch (error) {
            return null; 
        }
    },

    // Login using mobile and pin
    async login(mobile, pin) {
        const response = await fetch('/api.php?action=login', {
            method: 'POST',
            body: JSON.stringify({ mobile, pin }),
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    },

    // Register a new user
    async register(userData) {
        const response = await fetch('/api.php?action=register', {
            method: 'POST',
            body: JSON.stringify(userData),
            headers: { 'Content-Type': 'application/json' }
        });
        return await response.json();
    },

    // Logout and redirect
    async logout() {
        try {
            await ApiClient.post('/auth/logout');
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            // Always redirect to landing page on logout
            window.location.href = '../public/index.html';
        }
    },

    // Protect a page (redirects to login if not authenticated)
    async protectPage(requiredRole = null) {
        const user = await this.checkAuth();
        if (!user) {
            window.location.href = '../public/login.html';
            return null;
        }

        if (requiredRole && user.role !== requiredRole && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_A' && user.role !== 'ADMIN_B') {
            // Not authorized for this page, redirect to appropriate dashboard
            if (user.role === 'ADMIN' || user.role === 'ADMIN_A' || user.role === 'ADMIN_B') window.location.href = '../dashboard/admin.html';
            else if (user.role === 'BUSINESS' || user.role === 'SEEDER') window.location.href = '../dashboard/dashboard-business.html';
            else window.location.href = '../dashboard/dashboard-basic.html';
            return null;
        }

        // Add user info to UI if elements exist
        const userNameEl = document.getElementById('user-name-display');
        if (userNameEl) {
            let displayName = user.name || user.mobile;
            if (displayName === 'New Member') displayName = user.mobile; // Better fallback
            userNameEl.textContent = displayName;
        }

        return user;
    }
};

// Global logout handler binding
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtns = document.querySelectorAll('.logout-btn');
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    });
});
