// Global Configuration for Sinaank Rebirth
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
const CONFIG = {
    // Dynamically detect local development vs production
    API_BASE_URL: isLocal ? "http://localhost:5000" : "https://sdp-backend-production-c758.up.railway.app",
    VERSION: "1.0.0"
};
