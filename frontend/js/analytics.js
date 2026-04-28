// Sinaank Analytics Tracker
(async function() {
    try {
        // Only run in browser environment
        if (typeof window === 'undefined') return;

        // Ensure CONFIG is loaded, otherwise wait a bit
        let attempts = 0;
        const checkConfigAndTrack = async () => {
            if (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) {
                const urlParams = new URLSearchParams(window.location.search);
                const ref = document.referrer || urlParams.get('ref') || 'Direct';
                const page = window.location.pathname.split('/').pop() || 'index.html';

                try {
                    await fetch(CONFIG.API_BASE_URL + '/api/analytics/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ referrer: ref, page: page })
                    });
                } catch(e) {
                    // Fail silently
                    console.warn('Analytics failed to send', e);
                }
            } else if (attempts < 5) {
                attempts++;
                setTimeout(checkConfigAndTrack, 500);
            }
        };

        // Start tracking
        checkConfigAndTrack();

    } catch (e) {
        console.warn('Analytics tracker error', e);
    }
})();
