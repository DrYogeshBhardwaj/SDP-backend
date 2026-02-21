// assets/js/auth.js

const Auth = {
    // Check if user is logged in (calls backend /me endpoint)
    async checkAuth() {
        try {
            const data = await ApiClient.get('/auth/me');
            return data.user || data.data; // Return user object if authenticated (depending on backend standard response)
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
            window.location.href = '/public/login.html';
        }
    },

    // Protect a page (redirects to login if not authenticated)
    async protectPage(requiredRole = null) {
        const user = await this.checkAuth();
        if (!user) {
            window.location.href = '/public/login.html';
            return null;
        }

        if (requiredRole && user.role !== requiredRole) {
            // Not authorized for this page, redirect to appropriate dashboard
            if (user.role === 'ADMIN') window.location.href = '/dashboard/admin.html';
            else if (user.role === 'SEEDER') window.location.href = '/dashboard/seeder.html';
            else window.location.href = '/dashboard/user.html';
            return null;
        }

        // Add user info to UI if elements exist
        const userNameEl = document.getElementById('user-name-display');
        if (userNameEl) userNameEl.textContent = user.name || user.mobile;

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
