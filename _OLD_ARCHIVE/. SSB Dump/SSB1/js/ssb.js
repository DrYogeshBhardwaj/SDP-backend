/**
 * Sinaank Screen Break (SSB) - Logic
 * Calculates Namank & Mobaank to assign personalized themes.
 * THEME: Digital Science / Bio-Resonance / Binaural
 */

const SSB_CONFIG = {
    // Chaldean Numerology Map
    chaldeanMap: {
        'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 8, 'G': 3, 'H': 5, 'I': 1,
        'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 7, 'P': 8, 'Q': 1, 'R': 2,
        'S': 3, 'T': 4, 'U': 6, 'V': 6, 'W': 6, 'X': 5, 'Y': 1, 'Z': 7
    },

    // Theme Map (Number -> Color & Frequency)
    // Updated to High-Contrast Neon Palette to avoid "All Yellow" issue
    themes: {
        1: { code: "ALPHA", color: "#FF4500", note: 528, desc: "Solar Orange (Vitality)" }, // Sun: Distinct Orange
        2: { code: "THETA", color: "#E0FFFF", note: 417, desc: "Lunar Cyan (Clarity)" },    // Moon: Cyan/White
        3: { code: "GAMMA", color: "#FFD700", note: 396, desc: "Jupiter Gold (Expansion)" }, // Jupiter: Pure Gold/Yellow
        4: { code: "DELTA", color: "#0000FF", note: 639, desc: "Cosmic Blue (Focus)" },      // Rahu: Deep Blue
        5: { code: "EPSILON", color: "#39FF14", note: 741, desc: "Mercury Green (Balance)" },// Mercury: Neon Green
        6: { code: "ZETA", color: "#FF1493", note: 852, desc: "Venus Pink (Harmony)" },      // Venus: Hot Pink
        7: { code: "OMEGA", color: "#808080", note: 963, desc: "Neptune Grey (Wisdom)" },    // Ketu: Grey
        8: { code: "SIGMA", color: "#3366FF", note: 174, desc: "Saturn Indigo (Power)" },    // Saturn: Vivid Blue
        9: { code: "BETA", color: "#FF0000", note: 285, desc: "Mars Red (Energy)" }          // Mars: Red
    },

    // Global Constants
    SMP_BONUS: 10
};

const SSB_KITS = {
    'KIT1': { id: 'KIT1', name: 'SSB', price: 178, payout: 56, devices: 1, desc: 'Base Kit', icon: '📱' },
    'KIT2': { id: 'KIT2', name: 'SSB Mix', price: 320, payout: 130, devices: 2, desc: '2 Mobiles', icon: '👥' },
    'KIT3': { id: 'KIT3', name: 'SSB Family', price: 688, payout: 390, devices: 5, desc: '5 Mobiles', icon: '🏠' }
};

const SSBLogic = {

    // Global Date Formatter (DD/MM/YYYY)
    formatDate: function (timestamp) {
        if (!timestamp) return '-';
        const d = new Date(timestamp);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    reduceToSingle: function (num) {
        if (!num) return 0; // Guard against NaN
        while (num > 9) {
            num = String(num).split('').reduce((a, b) => parseInt(a) + parseInt(b), 0);
        }
        return num;
    },

    calculateNamank: function (name) {
        if (!name) return 0;
        let sum = 0;
        const cleanName = name.toUpperCase().replace(/[^A-Z]/g, '');
        for (let char of cleanName) {
            sum += SSB_CONFIG.chaldeanMap[char] || 0;
        }
        return this.reduceToSingle(sum);
    },

    // Updated Logic: Mobaank = Last non-zero digit
    calculateMobaank: function (phone) {
        if (!phone) return 0;
        const cleanPhone = phone.replace(/[^0-9]/g, '');

        // Iterate backwards from the end
        for (let i = cleanPhone.length - 1; i >= 0; i--) {
            const digit = parseInt(cleanPhone[i]);
            if (digit !== 0) {
                return digit;
            }
        }
        return 0; // Should not happen with valid input
    },

    // NEW: Persistent History for Paid Numbers (Objects: {phone, date})
    getPaidHistory: function () {
        try {
            const history = localStorage.getItem('ssb_paid_history');
            let parsed = history ? JSON.parse(history) : [];
            // Migration: Convert old string arrays to objects
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                parsed = parsed.map(p => ({ phone: p, date: Date.now() })); // Assume active for legacy
                localStorage.setItem('ssb_paid_history', JSON.stringify(parsed));
            }
            return parsed;
        } catch (e) { return []; }
    },

    addToHistory: function (phone, extraData = {}) {
        let history = this.getPaidHistory();
        // Check for existing to preserve Name/KitId
        const existing = history.find(h => h.phone === phone) || {};

        // Remove old entry
        history = history.filter(h => h.phone !== phone);

        // Push merged entry
        history.push({
            ...existing,
            ...extraData,
            phone: phone,
            date: Date.now()
        });
        localStorage.setItem('ssb_paid_history', JSON.stringify(history));
    },

    // Returns full status object
    // MILLISECOND to MINUTES Logic
    // Total 1780 Minutes
    // 1 Min = 1 Deduct

    // Generate UUID for Device Locking
    getDeviceId: function () {
        let id = localStorage.getItem('ssb_device_id');
        if (!id) {
            id = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ssb_device_id', id);
        }
        return id;
    },

    generateUserTheme: function (name, phone, isd) {
        const namank = this.calculateNamank(name);
        const mobaank = this.calculateMobaank(phone);

        const rightTheme = SSB_CONFIG.themes[namank] || SSB_CONFIG.themes[1];
        const leftTheme = SSB_CONFIG.themes[mobaank] || SSB_CONFIG.themes[1];
        const mixColor = `linear-gradient(90deg, ${leftTheme.color} 0%, ${rightTheme.color} 100%)`;

        // Check Existing Session/History for Balance
        const historyStatus = this.checkHistoryStatus(phone);

        let wallet = 1780; // Default full for paid
        let consumed = 0;
        let registeredDeviceId = null;

        if (historyStatus.found && historyStatus.data) {
            wallet = historyStatus.data.wallet || 1780;
            consumed = historyStatus.data.consumed || 0;
            registeredDeviceId = historyStatus.data.deviceId || null;
            // RESTORE KIT INFO (Fix: Persistence)
            if (historyStatus.data.kitId) {
                // If it exists in history, use it. Default to KIT1 if missing.
                const kitId = historyStatus.data.kitId || 'KIT1';
                const allowedDevices = historyStatus.data.allowedDevices || 1;

                // Return explicitly here to merge
                return {
                    name: name,
                    phone: phone,
                    isd: isd || "+91",
                    namank: namank,
                    mobaank: mobaank,
                    left: leftTheme,
                    right: rightTheme,
                    mixColor: mixColor,
                    isPaid: true,
                    wallet: wallet,
                    consumed: consumed,
                    deviceId: registeredDeviceId,
                    kitId: kitId,
                    allowedDevices: allowedDevices
                };
            }
        }

        return {
            name: name,
            phone: phone,
            isd: isd || "+91",
            namank: namank,
            mobaank: mobaank,
            left: leftTheme,
            right: rightTheme,
            mixColor: mixColor,
            isPaid: historyStatus.found, // Only true if previously paid
            wallet: wallet,
            consumed: consumed,
            deviceId: registeredDeviceId
        };
    },

    saveSession: function (data) {
        localStorage.setItem('ssb_session', JSON.stringify(data));
    },

    getSession: function () {
        const data = localStorage.getItem('ssb_session');
        return data ? JSON.parse(data) : null;
    },

    getValidSession: function () {
        const session = this.getSession();
        if (!session) return null;
        // Simple expiry check if needed (optional for now, trust existence)
        return session;
    },

    clearSession: function () {
        localStorage.removeItem('ssb_session');
    },

    // Save Persistent Data
    updateHistory: function (phone, updates) {
        let history = localStorage.getItem('ssb_paid_history');
        history = history ? JSON.parse(history) : [];
        const index = history.findIndex(h => h.phone === phone);
        if (index !== -1) {
            history[index] = { ...history[index], ...updates };
        } else {
            // Create New Entry
            const newEntry = { phone: phone, ...updates };
            // Ensure essential fields if missing in updates
            if (!newEntry.date) newEntry.date = Date.now();
            history.push(newEntry);
        }
        localStorage.setItem('ssb_paid_history', JSON.stringify(history));
    },

    // --- WEEKLY REMINDER LOGIC (Fixed Times) ---
    reminderInterval: null,
    reminderTargetTime: null,

    startFixedWeeklyReminder: function (times) {
        // times: Array of "HH:MM" e.g. ["09:00", "14:30"]

        if (this.reminderInterval) clearInterval(this.reminderInterval);

        // Save State
        if (times && times.length > 0) {
            const config = {
                times: times,
                startDate: Date.now()
            };
            localStorage.setItem('ssb_reminder_config', JSON.stringify(config));

            // Start Polling (Heartbeat) - Check every 15 seconds
            this.reminderInterval = setInterval(() => this.checkPoll(config), 15000);
            this.scheduleNext(config);

            // REMOVED: Auto-request permission. 
            // User can manually enable via 'Test' button if they want System Notifications.

            console.log(`Reminder Policy Active: Polling every 15s for [${times.join(', ')}]`);
        } else {
            localStorage.removeItem('ssb_reminder_config');
            this.reminderTargetTime = null;
            if (this.reminderInterval) clearInterval(this.reminderInterval);
            console.log("Reminders Disabled");
        }
    },

    // Restore on load
    initReminder: function () {
        const stored = localStorage.getItem('ssb_reminder_config');
        if (stored) {
            const config = JSON.parse(stored);
            // Start Poller
            this.reminderInterval = setInterval(() => this.checkPoll(config), 15000);
            this.scheduleNext(config);
        }
    },

    checkPoll: function (config) {
        if (!this.reminderTargetTime) return;

        const now = Date.now();
        // If we are past the target time (within reasonable window, e.g. 5 mins logic handled by trigger)
        if (now >= this.reminderTargetTime) {
            console.log("Reminder Target Reached!");

            // Format Completed Time (HH:MM)
            const d = new Date(this.reminderTargetTime);
            const hh = String(d.getHours()).padStart(2, '0');
            const mm = String(d.getMinutes()).padStart(2, '0');
            const timeStr = `${hh}:${mm}`;

            this.triggerWeeklyNotification(config, timeStr);
        }
    },

    scheduleNext: function (config) {
        if (!config || !config.times || config.times.length === 0) return;

        // 1. Check Wallet/Expiry
        const data = this.getSession();
        if (!data || data.wallet <= 0) {
            localStorage.removeItem('ssb_reminder_config');
            if (this.reminderInterval) clearInterval(this.reminderInterval);
            return;
        }

        const now = new Date();
        const nowTime = now.getTime();

        let candidates = config.times.map(t => {
            // Support One-Time DateTime (YYYY-MM-DDTHH:MM)
            if (t.includes('T')) {
                return new Date(t);
            }

            // Standard Daily (HH:MM)
            const [h, m] = t.split(':').map(Number);
            const d = new Date(now);
            d.setHours(h, m, 0, 0);

            // If this timestamp is in the past (< now), we must look at tomorrow.
            if (d.getTime() <= nowTime) {
                d.setDate(d.getDate() + 1);
            }
            return d;
        });

        candidates.sort((a, b) => a.getTime() - b.getTime());
        const nextTime = candidates[0];

        this.reminderTargetTime = nextTime.getTime();

        const delayMins = Math.round((this.reminderTargetTime - nowTime) / 60000);
        console.log(`Next Reminder Targeted: ${nextTime.toLocaleTimeString()} (in ~${delayMins} mins)`);
    },

    triggerWeeklyNotification: function (config, completedTimeStr) {
        // Re-check validity just in case
        const data = this.getSession();
        if (!data || data.wallet <= 0) return;

        // SAVE PROGRESS (Optional for one-time, but kept for stats)
        if (completedTimeStr) {
            this.markDailyProgress(completedTimeStr);
        }

        // PLAY SOUND
        this.playNotificationSound();

        // VIBRATE (Mobile Feedback)
        if (navigator.vibrate) {
            try { navigator.vibrate([1000, 500, 1000]); } catch (e) { console.log('Vib err', e); }
        }

        // TEXT MESSAGE (In-App Toast) - Guaranteed Visibility
        const msg = (typeof currentLang !== 'undefined' && currentLang === 'hi' && TRANSLATIONS)
            ? TRANSLATIONS['hi']['rem_msg']
            : (typeof TRANSLATIONS !== 'undefined' ? TRANSLATIONS['en']['rem_msg'] : "Time for your Digital Break!");

        this.showInAppToast(msg, true);
        this.flashTabTitle("🔔 REMINDER! 🔔");

        // ONE-TIME ALARM LOGIC: CLEAR AND STOP FIRST
        // This ensures that when the UI listens to the event, the storage is already empty
        localStorage.removeItem('ssb_reminder_config');
        this.reminderTargetTime = null;
        if (this.reminderInterval) clearInterval(this.reminderInterval);
        console.log("One-time alarm triggered and cleared.");

        // Dispatch Event for UI (Real-time update)
        window.dispatchEvent(new CustomEvent('ssb_reminder_triggered', { detail: { time: completedTimeStr } }));

        // System Notification (Backup - Only if ALREADY granted)
        if (Notification.permission === "granted") {
            const notification = new Notification("SSB Digital Break", {
                body: msg,
                icon: 'assets/icon.png',
                requireInteraction: false
            });
            notification.onclick = function () { window.focus(); notification.close(); };
        }

        // Update UI to reflect "Reset" state if user is on the page
        // The 'ssb_reminder_triggered' event should handle this in course.html
    },

    markDailyProgress: function (timeStr) {
        const today = new Date().toISOString().split('T')[0];
        let progress = localStorage.getItem('ssb_daily_progress');
        progress = progress ? JSON.parse(progress) : { date: today, completed: [] };

        // Reset if new day
        if (progress.date !== today) {
            progress = { date: today, completed: [] };
        }

        if (!progress.completed.includes(timeStr)) {
            progress.completed.push(timeStr);
            localStorage.setItem('ssb_daily_progress', JSON.stringify(progress));
        }
    },

    playNotificationSound: function () {
        try {
            // Ensure Context exists
            if (!this.audioCtx) this.unlockAudio(); // Try to get it if missing

            const ctx = this.audioCtx;
            if (!ctx) return console.log("AudioContext not supported");

            // Resume if suspended (common in browsers)
            if (ctx.state === 'suspended') ctx.resume();

            this.oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            this.oscillator.type = 'sine';
            this.oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            this.oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

            this.oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            this.oscillator.start();
            this.oscillator.stop(ctx.currentTime + 1.2);

            console.log("Playing Ping Sound (Shared Context)");
        } catch (e) {
            console.error("Audio Playback Failed", e);
        }
    },

    stopNotificationSound: function () {
        // Just stop oscillator, don't close context to allow reuse
        if (this.oscillator) {
            try { this.oscillator.stop(); } catch (e) { }
            try { this.oscillator.disconnect(); } catch (e) { }
            this.oscillator = null;
        }
    },

    getDailyProgress: function () {
        const today = new Date().toISOString().split('T')[0];
        const progress = localStorage.getItem('ssb_daily_progress');
        if (progress) {
            const p = JSON.parse(progress);
            if (p.date === today) return p.completed;
        }
        return [];
    },

    showInAppToast: function (msg, persist = false) {
        // Create container if not exists
        let container = document.getElementById('ssb-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'ssb-toast-container';
            // CHANGED: Top Center
            container.style = "position: fixed; top: 30px; left: 50%; transform: translateX(-50%); z-index: 10000; display: flex; flex-direction: column; gap: 10px; pointer-events: none; align-items: center;";
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        // AI / Futuristic Style
        toast.style = "pointer-events: auto; background: rgba(10, 20, 30, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(0, 240, 255, 0.8); color: #fff; padding: 15px 25px; border-radius: 50px; font-family: 'Outfit', sans-serif; box-shadow: 0 0 25px rgba(0, 240, 255, 0.6); display: flex; align-items: center; gap: 15px; min-width: 320px; opacity: 0; transform: translateY(-20px); transition: all 0.5s cubic-bezier(0.68, -0.55, 0.27, 1.55); cursor: pointer;";

        // AI Image (Robot Emoji) + Message + Dismiss Hint
        toast.innerHTML = `
            <div style="background: linear-gradient(135deg, #00f0ff, #0055ff); width: 40px; height: 40px; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-size: 1.2rem; box-shadow: 0 0 10px #00f0ff;">🤖</div>
            <div style="display:flex; flex-direction:column;">
                <div style="font-size:1rem; font-weight: 600; text-shadow: 0 0 5px rgba(0,0,0,0.5);">${msg}</div>
                ${persist ? '<div style="font-size:0.75rem; color:#00E5FF; margin-top:2px;">Tap to dismiss</div>' : ''}
            </div>
        `;

        toast.onclick = () => {
            SSBLogic.stopNotificationSound(); // Stop Sound
            toast.style.opacity = "0";
            toast.style.transform = "translateY(-20px)";
            setTimeout(() => toast.remove(), 500);
        };

        container.appendChild(toast);

        // Animate In
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        // Remove after 7s ONLY if not persistent
        if (!persist) {
            setTimeout(() => {
                if (toast.parentElement) { // Check if still there
                    toast.style.opacity = "0";
                    toast.style.transform = "translateY(-20px)";
                    setTimeout(() => toast.remove(), 500);
                }
            }, 7000);
        }
    },

    flashTabTitle: function (msg) {
        let originalTitle = document.title;
        let isFlashing = false;
        let flashCount = 0;

        const interval = setInterval(() => {
            document.title = isFlashing ? originalTitle : msg;
            isFlashing = !isFlashing;
            flashCount++;

            // Stop after 10 seconds (approx 20 flashes)
            if (flashCount > 20) {
                clearInterval(interval);
                document.title = originalTitle;
            }
        }, 500);

        // Stop on focus
        const stopFlashing = () => {
            clearInterval(interval);
            document.title = originalTitle;
            window.removeEventListener('focus', stopFlashing);
        };
        window.addEventListener('focus', stopFlashing);
    },

    // --- AUDIO CONTEXT UNLOCK (For Mobile) ---
    unlockAudio: function () {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().then(() => {
                console.log("AudioContext Resumed/Unlocked");
            });
        }
    },

    triggerNotification: function () {
        // Auto-disable checks
        const data = this.getSession();
        if (!data || data.wallet <= 0) {
            console.log('Skipping reminder: Empty Wallet or No Session');
            return;
        }

        const msg = (currentLang === 'hi')
            ? TRANSLATIONS['hi']['rem_msg']
            : TRANSLATIONS['en']['rem_msg'];

        const notification = new Notification("SSB Digital Break", {
            body: msg,
            icon: 'assets/icon.png',
            requireInteraction: true
        });

        notification.onclick = function () {
            window.focus();
            notification.close();
        };

        // One-time only, so we are done
        this.reminderTimeout = null;
    },

    checkHistoryStatus: function (phone) {
        // HARDCODED ADMIN/DEMO USERS (Always Paid)
        if (['8851168290', '9999999991'].includes(phone)) {
            return {
                found: true,
                data: {
                    phone: phone,
                    isPaid: true,
                    wallet: 1780,
                    kitId: 'KIT3', // Give them Family Kit features
                    name: (phone === '9999999991' ? 'Admin User' : 'Poonam Sharma'),
                    date: Date.now(),
                    allowedDevices: 5
                }
            };
        }

        const history = this.getPaidHistory();
        const entry = history.find(h => h.phone === phone);

        return { found: !!entry, data: entry };
    },

    getSlots: function (mobile) {
        if (!mobile) return [];
        let history = this.getPaidHistory();
        const entry = history.find(h => h.phone === mobile);

        if (entry && entry.slots && Array.isArray(entry.slots)) {
            return entry.slots;
        }

        // FALLBACK: If not in persistent history, check if implicit/demo logic has slots
        const status = this.checkHistoryStatus(mobile);
        if (status.found && status.data && status.data.slots) {
            return status.data.slots;
        }

        return [];
    },

    addFamilyMember: function (primaryMobile, name, newMobile, pin) {
        let history = this.getPaidHistory();
        let pkIndex = history.findIndex(h => h.phone === primaryMobile);

        // FIX: If not in history, check if it's a valid implicit session (e.g. Demo)
        if (pkIndex === -1) {
            const status = this.checkHistoryStatus(primaryMobile);
            if (status.found && status.data) {
                // Materialize this user into history
                history.push(status.data);
                pkIndex = history.length - 1; // It is now the last one
                // Save immediately so subsequent logic works
                localStorage.setItem('ssb_paid_history', JSON.stringify(history));
            } else {
                return { error: 'Primary user not found' };
            }
        }

        // Limit Check
        const entry = history[pkIndex];
        const allowed = entry.allowedDevices || 1;
        const currentSlots = entry.slots || [];

        if (currentSlots.length >= allowed) return { error: 'No slots available' };

        // Validations
        if (currentSlots.find(s => s.mobile === newMobile)) return { error: 'Mobile already in group' };

        // Prevent adding existing paid users or self
        if (this.checkHistoryStatus(newMobile).found) return { error: 'User already has active plan' };

        // Add to Slots
        const newSlot = {
            mobile: newMobile,
            name: name,
            date: Date.now(),
            type: 'MEMBER'
        };

        entry.slots = [...currentSlots, newSlot];
        history[pkIndex] = entry; // Update Primary

        // SAVE Primary
        localStorage.setItem('ssb_paid_history', JSON.stringify(history));

        // IMPORTANT: GRANT INDEPENDENT ACCESS TO NEW MEMBER
        // We create a separate PAID entry for them, effectively giving them a full kit instance
        // But we mark them as 'linked' to main account if needed (optional)

        this.addToHistory(newMobile);

        // Save PIN for new user
        if (pin) this.verifyPin(newMobile, pin);

        // We must manually add detailed data to avoid simple overwrite
        this.updateHistory(newMobile, {
            wallet: 1780,
            consumed: 0,
            deviceId: null, // Will bind on first login
            date: Date.now(),
            kitId: entry.kitId, // Inherit Kit Level or Default? SMT Logic says full access.
            allowedDevices: 1,  // Member gets 1 device for themselves
            isFamilyMember: true,
            primaryAccount: primaryMobile,
            name: name // Fix: Ensure name is saved for Admin Panel visibility
        });

        return { success: true };
    },

    markPaid: function (kitId = 'KIT1') {
        const data = this.getSession();
        const kit = SSB_KITS[kitId] || SSB_KITS['KIT1'];

        if (data) {
            data.isPaid = true;
            data.wallet = 1780;
            data.consumed = 0;
            data.deviceId = this.getDeviceId(); // Bind to this device
            data.kitId = kit.id;                // Store Kit Info
            data.allowedDevices = kit.devices;  // Store License Count

            // Init Slots if not present
            const currentSlots = data.slots || [
                { mobile: data.phone, name: 'Primary (Self)', date: Date.now(), type: 'PRIMARY' }
            ];

            data.slots = currentSlots; // Store back

            this.saveSession(data);
            this.updateHistory(data.phone, {
                wallet: 1780,
                consumed: 0,
                deviceId: data.deviceId,
                date: Date.now(),
                kitId: kit.id,
                allowedDevices: kit.devices,
                slots: currentSlots,
                name: data.name // Fix: Ensure name is saved for Admin Panel visibility
            });
        }
    },

    // Deduct Minutes
    startSession: function (minutes) {
        let data = this.getSession();
        if (!data || !data.isPaid) return false;

        // Device Lock Check
        const currentDevId = this.getDeviceId();
        if (data.deviceId && data.deviceId !== currentDevId) {
            // Credits for Partner
            const referrer = SSBLogic.getReferrer();
            // Pass the buyer's mobile (current kitId holder)
            const session = this.getSession();
            const buyerPhone = session ? session.phone : null;

            if (referrer && buyerPhone) {
                // Assuming a default kitId or that it's not relevant for this specific call
                SSBLogic.creditSale(referrer, 'KIT1', buyerPhone);
            }
            return { error: 'DEVICE_LOCK' };
        }

        if (data.wallet < minutes) return { error: 'LOW_BALANCE' };

        data.wallet -= minutes;
        data.consumed += minutes;

        this.saveSession(data);
        this.updateHistory(data.phone, {
            wallet: data.wallet,
            consumed: data.consumed
        });

        return { success: true };
    },

    initBackground: function () {
        const totalBgs = 3;
        // Simple Random 1 to 3
        const bgNum = Math.floor(Math.random() * totalBgs) + 1;

        // Preload Image to avoid flash? Just setting it.
        const imgUrl = `assets/bg/bg${bgNum}.png`;

        // Brighter / More Visible Background
        // Gradient ON TOP (0.3 opacity) + Image BELOW
        document.body.style.backgroundImage = `linear-gradient(135deg, rgba(2,11,20,0.3), rgba(5,22,38,0.4)), url('${imgUrl}')`;
        document.body.style.backgroundBlendMode = 'normal';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
    },

    // ===========================
    // FRANCHISE / REFERRAL LOGIC (Direct Sales Only)
    // ===========================

    // Capture ?ref=MOBILE from URL
    captureReferrer: function () {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref && ref.length === 10) {
            // Check if referring self (common testing mistake)
            const session = this.getSession();
            if (session && session.phone === ref) {
                alert("⚠️ You are opening your own Referral Link.\n\nTo test this, please Logout or use Incognito Mode.");
            }
            sessionStorage.setItem('ssb_referrer', ref);
        }
    },

    getReferrer: function () {
        return sessionStorage.getItem('ssb_referrer');
    },

    // Strict Direct Selling: 1 Sale = Fixed Commission
    creditSale: function (referrerMobile, kitId = 'KIT1') {
        if (!referrerMobile) return;

        let db = localStorage.getItem('ssb_partner_stats');
        db = db ? JSON.parse(db) : {};

        if (!db[referrerMobile]) {
            db[referrerMobile] = { sales: 0, earnings: 0, buyers: [] };
        }

        // Migration check for old data structure
        if (!Array.isArray(db[referrerMobile].buyers)) {
            db[referrerMobile].buyers = [];
        }

        const kit = SSB_KITS[kitId] || SSB_KITS['KIT1'];
        const payout = kit.payout;

        // Dynamic Commission
        db[referrerMobile].sales += 1;
        db[referrerMobile].earnings += payout;

        // Track Buyer Details (Auto-detected from current session)
        const session = this.getSession();
        if (session && session.phone) {
            db[referrerMobile].buyers.push({
                name: session.name || 'Unknown',
                mobile: session.phone,
                kitId: kitId,
                date: Date.now(),
                status: 'ACTIVE'
            });
        }

        localStorage.setItem('ssb_partner_stats', JSON.stringify(db));

        // -------------------------
        // SMP NETWORK OVERRIDE LOGIC
        // -------------------------
        // Check if Referrer has an Upline (Leader)
        let sellers = JSON.parse(localStorage.getItem('ssb_authorized_sellers') || '{}');
        const referrerData = sellers[referrerMobile];

        if (referrerData && referrerData.upline) {
            const leaderMobile = referrerData.upline;

            // Check if Leader is ACTIVE SMP
            const smpList = JSON.parse(localStorage.getItem('ssb_smp_list') || '{}');
            const leaderSMP = smpList[leaderMobile];

            if (leaderSMP && leaderSMP.status === 'ACTIVE') {
                // Credit Override
                if (!db[leaderMobile]) db[leaderMobile] = { sales: 0, earnings: 0, buyers: [] };

                // Add 10 Rs Override
                db[leaderMobile].earnings += 10;

                // We could track "Team Sales" separately if needed, but for now just adding earnings
                // For transparency, let's add a "Network Bonus" log if we had one.
                // For now, simple aggregation.

                localStorage.setItem('ssb_partner_stats', JSON.stringify(db));
            }
        }


        // GLOBAL SALES LOG (For Admin)
        let paidHistory = localStorage.getItem('ssb_paid_history');
        paidHistory = paidHistory ? JSON.parse(paidHistory) : [];

        paidHistory.push({
            phone: session.phone || 'Unknown',
            date: Date.now(),
            kitId: kitId,
            name: session.name || 'Unknown',
            referrer: referrerMobile
        });

        localStorage.setItem('ssb_paid_history', JSON.stringify(paidHistory));
    },

    getPartnerStats: function (partnerMobile) {
        let db = localStorage.getItem('ssb_partner_stats');
        db = db ? JSON.parse(db) : {};
        const data = db[partnerMobile] || { sales: 0, earnings: 0, buyers: [] };

        // Ensure buyers array exists
        if (!data.buyers) data.buyers = [];
        return data;
    },

    getNetworkStats: function (leaderMobile) {
        let sellers = JSON.parse(localStorage.getItem('ssb_authorized_sellers') || '{}');
        let stats = JSON.parse(localStorage.getItem('ssb_partner_stats') || '{}');
        let result = {
            members: [],
            totalSales: 0,
            totalBonus: 0
        };

        // Scan for Downline
        Object.keys(sellers).forEach(mobile => {
            const seller = sellers[mobile];
            if (seller.upline === leaderMobile) {
                // Found a team member, get their stats
                const memberStats = stats[mobile] || { sales: 0 };
                const bonus = (memberStats.sales || 0) * 10; // 10 Rs constant

                result.members.push({
                    name: seller.name,
                    mobile: mobile,
                    pin: seller.pin, // EXPOSED FOR SMP
                    sales: memberStats.sales || 0,
                    bonus: bonus,
                    joined: seller.joined
                });

                result.totalSales += (memberStats.sales || 0);
                result.totalBonus += bonus;
            }
        });

        return result;
    },

    // Seller logic
    registerSeller: function (mobile, name, city, pincode) {
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};

        sellers[mobile] = {
            name: name,
            city: city || '',
            pincode: pincode || '',
            joined: Date.now(),
            // Capture Upline from Referral Link
            upline: sessionStorage.getItem('ssb_referrer') || null,
            status: 'ACTIVE'
        };

        localStorage.setItem('ssb_authorized_sellers', JSON.stringify(sellers));

        // Also init stats if missing
        let stats = localStorage.getItem('ssb_partner_stats');
        stats = stats ? JSON.parse(stats) : {};
        if (!stats[mobile]) {
            stats[mobile] = { sales: 0, earnings: 0 };
            localStorage.setItem('ssb_partner_stats', JSON.stringify(stats));
        }
    },

    isAuthorizedSeller: function (mobile) {
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};

        // Manual Override for Admin/Testing/Demo
        if (['9211755210', '8851168290', '9999999991'].includes(mobile)) return true;

        return !!sellers[mobile];
    },

    // PIN Authentication
    verifyPin: function (mobile, pin) {
        if (!mobile || !pin) return false;

        // 1. Check Dynamic Auth PINs (Prioritize User/Admin Set PINs)
        let db = localStorage.getItem('ssb_auth_pins');
        db = db ? JSON.parse(db) : {};
        if (db[mobile]) return String(db[mobile]) === String(pin);

        // 2. Check Authorized Sellers (Fallback)
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};
        if (sellers[mobile] && sellers[mobile].pin) {
            return String(sellers[mobile].pin) === String(pin);
        }

        // 3. Hardcoded Defaults (Fallback only if no dynamic PIN set)
        const protectedNumbers = ['9818869428', '8851168290', '9999999991'];
        if (protectedNumbers.includes(mobile)) {
            return pin === '1234';
        }

        return false;
    },

    hasAuthPin: function (mobile) {
        let db = localStorage.getItem('ssb_auth_pins');
        db = db ? JSON.parse(db) : {};
        if (db[mobile]) return true;

        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};
        if (sellers[mobile] && sellers[mobile].pin) return true;

        const protectedNumbers = ['9818869428', '8851168290'];
        if (protectedNumbers.includes(mobile)) return true;

        return false;
    },

    ensureFounderStatus: function () {
        const founderMobile = '8851168290';
        const founderName = 'Poonam Sharma';

        // 1. Ensure Authorized Seller Status
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};

        if (!sellers[founderMobile] || sellers[founderMobile].status !== 'ACTIVE') {
            sellers[founderMobile] = {
                name: founderName,
                mobile: founderMobile, // Redundant but safe
                city: 'Delhi', // Default
                pincode: '110001',
                joined: Date.now(),
                upline: null, // Root
                status: 'ACTIVE',
                pin: '1234' // Founder Default PIN
            };
            localStorage.setItem('ssb_authorized_sellers', JSON.stringify(sellers));
            console.log("Founder Seller Status Restored");
        }

        // 2. Ensure SMP Status (1st Active SMP)
        let smpList = localStorage.getItem('ssb_smp_list');
        smpList = smpList ? JSON.parse(smpList) : {};

        if (!smpList[founderMobile] || smpList[founderMobile].status !== 'ACTIVE') {
            smpList[founderMobile] = {
                mobile: founderMobile,
                name: founderName,
                address: 'Founder Office',
                pincode: '110001',
                aadhar: 'XXXX',
                photo: 'images/poonam_sharma.jpg',
                date: Date.now(),
                status: 'ACTIVE',
                approvedDate: Date.now()
            };
            localStorage.setItem('ssb_smp_list', JSON.stringify(smpList));
            console.log("Founder SMP Status Restored");
        }
    },

    // NEW: Self-Healing Stats Sync (Global)
    recalculateStats: function () {
        const historyRaw = localStorage.getItem('ssb_paid_history');
        const history = historyRaw ? JSON.parse(historyRaw) : [];
        if (!history || history.length === 0) return;

        const newStats = {};
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};

        const KITS = window.SSB_KITS || {
            'KIT1': { price: 178, payout: 56 },
            'KIT2': { price: 320, payout: 130 },
            'KIT3': { price: 688, payout: 390 }
        };
        const SMP_BONUS = 10;
        let smpList = localStorage.getItem('ssb_smp_list');
        smpList = smpList ? JSON.parse(smpList) : {};

        history.forEach(item => {
            if (!item || typeof item !== 'object' || !item.referrer) return;

            const ref = item.referrer;
            const kitId = item.kitId || 'KIT1';
            const kit = KITS[kitId] || KITS['KIT1']; // Fallback to avoid crash

            // Init Referrer Stats
            if (!newStats[ref]) newStats[ref] = { sales: 0, earnings: 0, buyers: [] };

            // 1. Direct Sale
            newStats[ref].sales++;
            newStats[ref].earnings += (kit.payout || 0);

            // Track Buyer
            const buyerPhone = item.phone || item.mobile;
            if (buyerPhone && !newStats[ref].buyers.some(b => b.mobile === buyerPhone)) {
                newStats[ref].buyers.push({
                    mobile: buyerPhone,
                    name: item.name || 'Unknown',
                    date: item.date,
                    kit: kitId
                });
            }

            // 2. SMP Bonus (Passive)
            if (sellers[ref] && sellers[ref].upline) {
                const upline = sellers[ref].upline;
                if (smpList[upline] && smpList[upline].status === 'ACTIVE') {
                    if (!newStats[upline]) newStats[upline] = { sales: 0, earnings: 0, buyers: [] };
                    newStats[upline].earnings += SMP_BONUS;
                }
            }
        });

        localStorage.setItem('ssb_partner_stats', JSON.stringify(newStats));
    },

    ensureSellerIds: function () {
        let sellers = localStorage.getItem('ssb_authorized_sellers');
        sellers = sellers ? JSON.parse(sellers) : {};
        let modified = false;

        // Get all Used IDs to avoid duplicates
        const usedIds = new Set();
        Object.values(sellers).forEach(s => {
            if (s.sellerId) usedIds.add(s.sellerId);
        });

        let nextId = 1001;
        Object.keys(sellers).forEach(mobile => {
            if (!sellers[mobile].sellerId) {
                while (usedIds.has('S' + nextId)) nextId++;
                const newId = 'S' + nextId;
                sellers[mobile].sellerId = newId;
                usedIds.add(newId);
                modified = true;
            }
        });

        if (modified) {
            localStorage.setItem('ssb_authorized_sellers', JSON.stringify(sellers));
        }
    },

    ensureSMPIds: function () {
        let smpList = localStorage.getItem('ssb_smp_list');
        smpList = smpList ? JSON.parse(smpList) : {};
        let modified = false;

        // Get all Used IDs to avoid duplicates
        const usedIds = new Set();
        Object.values(smpList).forEach(s => {
            if (s.smpId) usedIds.add(s.smpId);
        });

        let nextId = 1001;
        Object.keys(smpList).forEach(mobile => {
            if (!smpList[mobile].smpId) {
                while (usedIds.has('M' + nextId)) nextId++;
                const newId = 'M' + nextId;
                smpList[mobile].smpId = newId;
                usedIds.add(newId);
                modified = true;
            }
        });

        if (modified) {
            localStorage.setItem('ssb_smp_list', JSON.stringify(smpList));
        }
    }
};

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
    SSBLogic.initBackground();
    SSBLogic.ensureFounderStatus();
    SSBLogic.ensureSellerIds(); // S-Series
    SSBLogic.ensureSMPIds();    // M-Series
    SSBLogic.recalculateStats(); // FORCE SYNC ON EVERY PAGE LOAD
    SSBLogic.captureReferrer();
});

// --- DIAGNOSTIC DEBUGGER (Temporary) ---
window.runDiagnostics = function () {
    const debugBox = document.createElement('div');
    debugBox.style = "background: #000; color: #0f0; padding: 10px; font-family: monospace; border: 1px solid #0f0; margin-top: 10px; font-size: 0.8rem; white-space: pre-wrap;";
    debugBox.id = 'ssb-debug-box';

    let log = "--- DIAGNOSTICS ---\n";
    log += "SSBLogic: " + (typeof SSBLogic !== 'undefined' ? "OK" : "MISSING") + "\n";

    const session = SSBLogic.getSession();
    log += "Session: " + (session ? "OK (" + session.phone + ")" : "NULL") + "\n";

    const accReminder = document.getElementById('acc-reminder');
    log += "acc-reminder: " + (accReminder ? "FOUND" : "MISSING") + "\n";

    const grid = document.getElementById('rem-slots-grid');
    log += "rem-slots-grid: " + (grid ? "FOUND" : "MISSING") + "\n";

    const sellerBtn = document.getElementById('seller-action-container');
    log += "Seller Button: " + (sellerBtn ? "VISIBLE" : "MISSING") + "\n";

    log += "isAuthorized: " + SSBLogic.isAuthorizedSeller(session?.phone) + "\n";
    log += "hasPin: " + SSBLogic.hasAuthPin(session?.phone) + "\n";

    debugBox.textContent = log;

    // Append to top of dashboard
    const dash = document.getElementById('view-course');
    if (dash) dash.insertBefore(debugBox, dash.firstChild);
};

// Call diagnostics after a short delay to allow renders
setTimeout(window.runDiagnostics, 2000);

// Expose Config & Logic Globally
window.SSB_CONFIG = SSB_CONFIG;
window.SSB_KITS = SSB_KITS;
window.SSBLogic = SSBLogic;
