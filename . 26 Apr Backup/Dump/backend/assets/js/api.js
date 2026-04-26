// assets/js/api.js

class ApiClient {
    static async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;

        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };

        // Add Authorization header from localStorage token as fallback for cookie auth
        const lsToken = localStorage.getItem('token');
        if (lsToken) {
            defaultHeaders['Authorization'] = `Bearer ${lsToken}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: 'include' // Also send HttpOnly cookies when available
        };


        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({})); // Handle empty responses

            if (!response.ok) {
                // If 401 Unauthorized, redirect to login
                if (response.status === 401 && !window.location.pathname.includes('login.html')) {
                    window.location.href = '/public/login.html';
                }

                throw new Error(data.message || data.error || 'API Request Failed');
            }

            return data;
        } catch (error) {
            throw error;
        }
    }

    static get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    static post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    static put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    static delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
}
