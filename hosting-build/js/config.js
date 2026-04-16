/**
 * SINAANK Production Configuration (Railway Backend)
 */

const SINAANK_CONFIG = {

    // ✅ BASE WITHOUT /api
    API_BASE: 'https://sdp-backend-production-c758.up.railway.app',

    /**
     * Correct API path builder
     */
    getApiUrl(action) {
        return this.API_BASE + '/api/' + action;
    }
};

// Local dev (same as before)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    SINAANK_CONFIG.API_BASE = 'http://localhost:5000';
}