// assets/js/auth.js

const Auth = {
    // Check if user is logged in (calls backend /me endpoint)
    async checkAuth() {
        try {
            const res = await ApiClient.get('/auth/me');
            return res.data?.user || res.user || res.data; // Return user object if authenticated (depending on backend standard response)
        } catch (error) {
            return null; // Return null if not authenticated or error
        }
    },

    // Login using mobile and pin
    async login(mobile, pin) {
        // Backend handles setting the HTTPOnly cookie
        return await ApiClient.post('/auth/login', { mobile, pin });
    },

    // Register a new user
    async register(userData) {
        return await ApiClient.post('/auth/register', userData);
    },

    // Logout and redirect
    async logout() {
        try {
            await ApiClient.post('/auth/logout');
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            // Always redirect to login on logout
            window.location.href = '/login';
        }
    },

    // Protect a page (redirects to login if not authenticated)
    async protectPage(requiredRole = null) {
        const user = await this.checkAuth();
        if (!user) {
            window.location.href = '/login';
            return null;
        }

        if (requiredRole && user.role !== requiredRole && user.role !== 'SUPERADMIN' && user.role !== 'ADMIN_A' && user.role !== 'ADMIN_B') {
            // Not authorized for this page, redirect to appropriate dashboard
            if (user.role === 'ADMIN' || user.role === 'ADMIN_A' || user.role === 'ADMIN_B') window.location.href = '/admin';
            else if (user.role === 'SEEDER') window.location.href = '/seeder';
            else window.location.href = '/dashboard';
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
