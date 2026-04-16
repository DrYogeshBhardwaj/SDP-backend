const API_BASE_URL = "https://sdp-backend-production-3313.up.railway.app";

const SINAANK_CONFIG = {
    /** 
     * API_BASE: Production Railway Backend URL
     */
    API_BASE: API_BASE_URL,

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
