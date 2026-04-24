const API_BASE_URL = "https://sdp-backend-production-c758.up.railway.app";

const SINAANK_CONFIG = {
    /** 
     * API_BASE: Production Railway Backend URL
     */
    API_BASE: API_BASE_URL,

    /**
     * getApiUrl: Standardized helper for direct backend communication.
     */
    getApiUrl(path) {
        // Force production backend for all requests
        return this.API_BASE + '/api/' + path;
    }
};
