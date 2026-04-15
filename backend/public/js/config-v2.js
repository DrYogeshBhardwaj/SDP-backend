/**
 * SINAANK Production Configuration
 * Purpose: Centralized API Base URL for shared hosting build.
 */
const SINAANK_CONFIG = {
    /** 
     * API_BASE: Production Railway Backend URL
     */
    API_BASE: 'https://sdp-backend-production-c758.up.railway.app',

    /**
     * getApiUrl: Standardized helper for direct backend communication.
     */
    getApiUrl(path) {
        // Shared logic for production and local dev
        const base = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
            ? 'http://localhost:5000' 
            : this.API_BASE;
            
        return base + '/api/' + path;
    }
};
