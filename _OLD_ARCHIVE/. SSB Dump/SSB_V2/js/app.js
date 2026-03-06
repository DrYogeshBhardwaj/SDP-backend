/**
 * SSB V2 - Application Logic
 * Dashboard First Architecture
 */

const SSBApp = {
    state: {
        currentUser: null,
    },

    // --- Configuration (Ported from V1) ---
    config: {
        chaldeanMap: {
            'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 8, 'G': 3, 'H': 5, 'I': 1,
            'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 7, 'P': 8, 'Q': 1, 'R': 2,
            'S': 3, 'T': 4, 'U': 6, 'V': 6, 'W': 6, 'X': 5, 'Y': 1, 'Z': 7
        },
        themes: {
            1: { code: "ALPHA", color: "#FF4500", desc: "Solar Orange" },
            2: { code: "THETA", color: "#E0FFFF", desc: "Lunar Cyan" },
            3: { code: "GAMMA", color: "#FFD700", desc: "Jupiter Gold" },
            4: { code: "DELTA", color: "#0000FF", desc: "Cosmic Blue" },
            5: { code: "EPSILON", color: "#39FF14", desc: "Mercury Green" },
            6: { code: "ZETA", color: "#FF1493", desc: "Venus Pink" },
            7: { code: "OMEGA", color: "#808080", desc: "Neptune Grey" },
            8: { code: "SIGMA", color: "#3366FF", desc: "Saturn Indigo" },
            9: { code: "BETA", color: "#FF0000", desc: "Mars Red" }
        }
    },

    init() {
        console.log("SSB V2 Initialized: Dashboard Mode");

        // Check for saved session
        const saved = localStorage.getItem('ssb_v2_session');
        if (saved) {
            this.state.currentUser = JSON.parse(saved);
            this.updateDashboard();
            this.hideSetup();
        } else {
            // New User -> Show Setup Overlay
            this.showSetup();
            // Default Dashboard State (Empty)
            document.getElementById('dash-name').textContent = "Guest";
        }

        // Set Date
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        document.getElementById('dash-date').textContent = new Date().toLocaleDateString('en-US', options);
    },

    // --- UI View Control ---
    showSetup() {
        const overlay = document.getElementById('setup-overlay');
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    },

    hideSetup() {
        const overlay = document.getElementById('setup-overlay');
        overlay.classList.add('hidden'); // Uses CSS class if available
        overlay.style.display = 'none'; // Inline override to be sure
    },

    openSettings() {
        // For now, re-open setup to edit details
        const user = this.state.currentUser;
        if (user) {
            document.getElementById('inp-name').value = user.name;
            document.getElementById('inp-mobile').value = user.mobile;
        }
        this.showSetup();
    },

    // --- Core Logic ---
    processInput() {
        const nameInp = document.getElementById('inp-name');
        const mobInp = document.getElementById('inp-mobile');

        const name = nameInp.value.trim();
        const mobile = mobInp.value.trim();

        if (name.length < 3) return alert("Please enter a valid name.");
        // Basic Mobile Validation
        if (mobile.length !== 10 || isNaN(mobile)) return alert("Please enter a valid 10-digit mobile.");

        // Calculate
        const namank = this.calculateNamank(name);
        const mobaank = this.calculateMobaank(mobile);

        // Theme Data
        const leftTheme = this.config.themes[mobaank] || this.config.themes[1];
        const rightTheme = this.config.themes[namank] || this.config.themes[1];

        const user = {
            name,
            mobile,
            namank,
            mobaank,
            leftTheme,
            rightTheme,
            joined: Date.now()
        };

        this.state.currentUser = user;
        localStorage.setItem('ssb_v2_session', JSON.stringify(user));

        this.updateDashboard();
        this.hideSetup();
    },

    calculateNamank(name) {
        let sum = 0;
        const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
        for (let char of cleanName) {
            sum += this.config.chaldeanMap[char] || 0;
        }
        return this.reduceToSingle(sum) || 1;
    },

    calculateMobaank(mobile) {
        const cleanPhone = mobile.replace(/[^0-9]/g, '');
        // Iterate backwards until non-zero
        for (let i = cleanPhone.length - 1; i >= 0; i--) {
            const digit = parseInt(cleanPhone[i]);
            if (digit !== 0) return digit;
        }
        return 1; // Fallback
    },

    reduceToSingle(num) {
        if (!num) return 0;
        while (num > 9) {
            num = String(num).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
        }
        return num;
    },

    // --- Dashboard Rendering ---
    updateDashboard() {
        const user = this.state.currentUser;
        if (!user) return;

        // Name
        document.getElementById('dash-name').textContent = user.name;

        // Values
        const elNamank = document.getElementById('val-namank');
        const elMobaank = document.getElementById('val-mobaank');

        elNamank.textContent = user.namank;
        elMobaank.textContent = user.mobaank;

        // Labels / Theme Descs
        document.getElementById('lbl-namank').textContent = user.rightTheme.desc;
        document.getElementById('lbl-mobaank').textContent = user.leftTheme.desc;

        // Apply Premium Glow Effects
        elNamank.style.color = user.rightTheme.color;
        elNamank.style.textShadow = `0 0 20px ${user.rightTheme.color}`;

        elMobaank.style.color = user.leftTheme.color;
        elMobaank.style.textShadow = `0 0 20px ${user.leftTheme.color}`;
    },

    loadDemo() {
        document.getElementById('inp-name').value = "Poonam Sharma";
        document.getElementById('inp-mobile').value = "8851168290";
    },

    logout() {
        localStorage.removeItem('ssb_v2_session');
        window.location.reload();
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => {
    SSBApp.init();
});
