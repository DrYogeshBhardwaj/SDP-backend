const CONFIG = {
    // Determine automatically if we're on local or production
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? '/api'
        : 'https://api.sinaank.com/api'
};

// Prevent modification
Object.freeze(CONFIG);
