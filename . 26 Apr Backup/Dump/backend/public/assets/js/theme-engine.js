/**
 * SINAANK Digital SID Engine
 * Persistent, database-backed identity system
 */
const ThemeEngine = {
    // SID Cache key
    CACHE_KEY: 'sinaank_sid_profile',
    // Safety & Audio Defaults (Frozen)
    SAFETY: {
        maxGain: 0.06,      // Default Volume 6% for PC audibility
        fadeInTime: 2000,   // 2 second fade in
        baseFreqRange: [200, 240],
        offsetRange: [3, 7]
    },

    sdsNames: [
        "Wave", "Drift", "Theta", "Pulse", "Calm", "Deep", "Zen", "Flow", "Rest", 
        "Hush", "Mist", "Aura", "Soul", "Mind", "Echo", "Void", "Spark", "Dream", 
        "Sleep", "Night", "Stars", "Moon", "Cloud", "Rain", "Wind", "Ocean", "Forest"
    ],

    ageProfiles: {
        '10-18': {
            label: 'Young',
            breathing: { inhale: 4000, hold: 2000, exhale: 4000 },
            blur: '0px',
            glow: '10px',
            intensity: 0.04
        },
        '18-40': {
            label: 'Adult',
            breathing: { inhale: 4000, hold: 2000, exhale: 6000 },
            blur: '0px',
            glow: '15px',
            intensity: 0.03
        },
        '40-60': {
            label: 'Senior',
            breathing: { inhale: 5000, hold: 3000, exhale: 7000 },
            blur: '2px',
            glow: '20px',
            intensity: 0.02
        },
        '60+': {
            label: 'Super Senior',
            breathing: { inhale: 6000, hold: 4000, exhale: 8000 },
            blur: '4px',
            glow: '30px',
            intensity: 0.015
        }
    },

    hashMobile(mobile) {
        if (!mobile) return 0;
        const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
        let hash = 0;
        for (let i = 0; i < cleanMobile.length; i++) {
            hash = ((hash << 5) - hash) + cleanMobile.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    },

    async fetchSID() {
        try {
            const resp = await fetch('/api/auth/sid');
            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    localStorage.setItem(this.CACHE_KEY, JSON.stringify(data.data));
                    return data.data;
                }
            }
        } catch (e) {
            console.warn("SID Fetch failed, using cached or fallback:", e.message);
        }
        
        const cached = localStorage.getItem(this.CACHE_KEY);
        return cached ? JSON.parse(cached) : null;
    },

    getHueName(hue) {
        hue = hue % 360;
        if (hue < 20 || hue >= 340) return "लाल";
        if (hue < 45) return "नारंगी";
        if (hue < 75) return "पीला";
        if (hue < 150) return "हरा";
        if (hue < 200) return "आसमानी"; // Cyan/Teal
        if (hue < 260) return "नीला";
        if (hue < 300) return "बैंगनी";
        return "गुलाबी"; // Pinkish range
    },

    generateSDSName(mobile) {
        const hash = this.hashMobile(mobile);
        return "SDS " + this.sdsNames[hash % this.sdsNames.length];
    },

    generateIdentity(sidData) {
        // If no SID data, use legacy hash fallback
        if (!sidData) {
            const mobile = this.getMobile();
            const hash = this.hashMobile(mobile);
            const hue = hash % 360;
            return {
                sid: "LEGACY-" + hash.toString(16).toUpperCase().slice(-4),
                colors: {
                    bg: `hsl(${hue}, 45%, 8%)`,
                    inhale: `hsl(${hue}, 70%, 55%)`,
                    hold: `hsl(${(hue + 30) % 360}, 70%, 65%)`,
                    exhale: `hsl(${(hue + 180) % 360}, 60%, 45%)`,
                    accent: `hsl(${hue}, 80%, 75%)`
                },
                frequencies: { 
                    left: 200 + (hash % 40), 
                    right: 200 + (hash % 40) + 7 
                },
                drift: 0
            };
        }

        // Use backend SID data
        const hue = sidData.color1;
        const hue2 = sidData.color2;

        return {
            sid: sidData.sinaankId,
            colors: {
                bg: `hsl(${hue}, 45%, 8%)`,
                inhale: `hsl(${hue}, 70%, 55%)`,
                hold: `hsl(${hue2}, 70%, 65%)`,
                exhale: `hsl(${(hue + 180) % 360}, 60%, 45%)`,
                accent: `hsl(${hue}, 80%, 75%)`
            },
            frequencies: { 
                left: sidData.leftHz, 
                right: sidData.rightHz 
            },
            drift: 0
        };
    },

    getMobile() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('mobile') || localStorage.getItem('sdp_mobile') || '0000000000';
    },

    getAge() {
        // Try session first (live), then storage
        const sessionStr = localStorage.getItem('ssb_session');
        if (sessionStr) {
            try {
                const user = JSON.parse(sessionStr);
                if (user.age_group) return user.age_group;
            } catch (e) {}
        }
        return localStorage.getItem('sdp_age') || '18-40';
    },

    async applyTheme() {
        const sidData = await this.fetchSID();
        const id = this.generateIdentity(sidData);
        const age = this.getAge();
        const profile = this.ageProfiles[age] || this.ageProfiles['18-40'];
        
        const config = {
            sid: id.sid,
            sdsName: "SDS " + id.sid,
            ...id.colors,
            ...profile,
            frequencies: id.frequencies,
            breathing: {
                inhale: profile.breathing.inhale + id.drift,
                hold: profile.breathing.hold,
                exhale: profile.breathing.exhale + id.drift
            }
        };
        
        // Apply CSS Variables
        const root = document.documentElement;
        root.style.setProperty('--sdp-bg', config.bg);
        root.style.setProperty('--sdp-inhale', config.inhale);
        root.style.setProperty('--sdp-hold', config.hold);
        root.style.setProperty('--sdp-exhale', config.exhale);
        root.style.setProperty('--sdp-accent', config.accent);
        
        root.style.setProperty('--sdp-inhale-time', config.breathing.inhale + 'ms');
        root.style.setProperty('--sdp-hold-time', config.breathing.hold + 'ms');
        root.style.setProperty('--sdp-exhale-time', config.breathing.exhale + 'ms');
        root.style.setProperty('--sdp-blur', config.blur);
        root.style.setProperty('--sdp-glow', `0 0 ${config.glow} ${config.accent}`);
        root.style.setProperty('--sdp-intensity', config.intensity);

        // Standard CSS variable overrides
        root.style.setProperty('--background', config.bg);
        root.style.setProperty('--primary', config.inhale);
        root.style.setProperty('--primary-hover', config.hold);

        // Global theme object for JS access
        window.SDP_THEME = config;
        window.SDP_SAFETY = this.SAFETY;
        
        // Add specific color names for TTS/Visuals
        window.SDP_THEME.color1Name = this.getHueName(sidData?.color1 || 0);
        window.SDP_THEME.color2Name = this.getHueName(sidData?.color2 || 30);
        
        // CSS Variable for SID Color Mapping
        root.style.setProperty('--sdp-color1', id.colors.bg);
        root.style.setProperty('--sdp-color2', id.colors.hold); 

        console.log(`SINAANK SID Applied [${id.sid}] | L:${config.frequencies.left}Hz R:${config.frequencies.right}Hz`);
        
        // Apply background to body immediately
        document.body.style.backgroundColor = config.bg;
        return config;
    },

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.applyTheme());
        } else {
            this.applyTheme();
        }
    }
};

ThemeEngine.init();
