/**
 * ==========================================
 * 🔒 LOCKED CODE - BY USER REQUEST (16-FEB-2026) 🔒
 * Basic User Dashboard Logic
 * Do not majorly refactor without explicit permission.
 * ==========================================
 */
class DashboardBasicApp {
    constructor() {
        this.user = null;
        this.identity = null;
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.updateUI();

        // Init i18n
        if (typeof i18n !== 'undefined' && i18n.updatePage) {
            i18n.updatePage();
        }
    }

    checkAuth() {
        const sessionStr = localStorage.getItem('ssb_session');
        if (!sessionStr) {
            window.location.href = '../public/login.html';
            return;
        }
        this.user = JSON.parse(sessionStr);
        // Default identity if missing
        if (!this.user.identities) this.user.identities = [];
        this.identity = this.user.identities[0] || { minutesBalance: 0, walletBalance: 0 };
    }

    async loadUserData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api.php?action=me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const res = await response.json();

            if (response.ok && res.success) {
                this.user = res.data.user || res.data;
                this.identity = this.user; // In Basic, user object contains the balances
                localStorage.setItem('ssb_session', JSON.stringify(this.user));
                this.updateUI();
            }
        } catch (err) {
            console.error("Failed to sync user data:", err);
        }
    }

    updateUI() {
        const userDisplay = document.getElementById('user-display') || document.getElementById('user-name-display');
        if (userDisplay) userDisplay.textContent = this.user.name || 'User';

        const mobileEl = document.getElementById('mobile-display');
        if (mobileEl) mobileEl.textContent = this.user.mobile || '';

        const balanceEl = document.getElementById('balance-display') || document.getElementById('minutes-balance');
        if (balanceEl) balanceEl.textContent = this.user.minutesBalance || 0;

        const walletEl = document.getElementById('wallet-cash');
        if (walletEl) walletEl.textContent = this.user.walletCash || 0;

        this.loadHistory();

        this.checkPartnerStatus(); // Check if we should show Upgrade option

        // New Features: Date, Time, Quotes, Broadcast
        this.updateDateTime();
        setInterval(() => this.updateDateTime(), 1000); // Live Time
        this.loadDailyContent();
    }

    updateDateTime() {
        const now = new Date();
        const dateOptions = { day: '2-digit', month: 'short', year: 'numeric' };
        const timeOptions = { hour: '2-digit', minute: '2-digit', hour12: true };

        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');

        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-GB', dateOptions); // DD MMM YYYY
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US', timeOptions);
    }

    async loadDailyContent() {
        // 1. Rotating Quotes
        const quotes = [
            "A quiet mind is able to hear intuition over fear.",
            "Growth is painful. Change is painful. But nothing is as painful as staying stuck.",
            "Your potential is endless. Go do what you were created to do.",
            "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            "Discipline is the bridge between goals and accomplishment.",
            "Do something today that your future self will thank you for.",
            "Focus on the step in front of you, not the whole staircase."
        ];
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const quoteIndex = dayOfYear % quotes.length;
        const quoteEl = document.getElementById('daily-quote');
        if (quoteEl) quoteEl.textContent = `"${quotes[quoteIndex]}"`;

        // 2. Admin Announcements (Personalized Priority Logic)
        try {
            // Simplified: Handled as separate fetch for robustness
            const token = localStorage.getItem('token');
            const response = await fetch('/api.php?action=me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // We reuse me action for basic stats/announcements if needed, 
            // but for now let's just keep the me sync.
        } catch (e) {
            console.warn("Failed to load daily content", e);
        }
    }

    async loadHistory() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api.php?action=history', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const res = await response.json();
            
            const historyBody = document.getElementById('history-table-body');
            if (response.ok && res.data && res.data.length > 0) {
                historyBody.innerHTML = res.data.map(session => `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 0.75rem 0.5rem;">${new Date(session.createdAt).toLocaleDateString()}</td>
                        <td style="padding: 0.75rem 0.5rem;">${new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style="padding: 0.75rem 0.5rem;">${session.duration} min</td>
                        <td style="padding: 0.75rem 0.5rem;"><span class="badge ${session.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}">${session.status}</span></td>
                    </tr>
                `).join('');
            } else if (historyBody) {
                historyBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 1rem;">No sessions yet.</td></tr>';
            }
        } catch (err) {
            console.error("History load error:", err);
        }
    }

    renderHistory() {
        const historyList = document.getElementById('recent-history-list');
        if (!historyList) return;

        // Simplify: Get transactions for this specific identity if possible
        // Store.js doesn't easily link txn to identity ID in all cases, but we can try filtering
        // Or just show latest user transactions
        const transactions = store.getAllTransactions();
        const myTx = transactions
            .filter(t => t.userId === this.user.id && (!t.identityId || t.identityId === this.identity.id)) // Optional identityId check if we add it
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        if (myTx.length === 0) {
            historyList.innerHTML = '<li class="text-sm text-muted">No recent activity.</li>';
            return;
        }

        historyList.innerHTML = myTx.map(tx => {
            const dateObj = new Date(tx.timestamp || tx.date); // Handle legacy 'date' field
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); // 16 Feb 2026

            let amountDisplay = '';
            let amountClass = '';

            // Logic: Is it Money (PURCHASE) or Minutes (SESSION)?
            if (tx.type === 'PURCHASE') {
                amountDisplay = `₹${tx.amount}`;
                amountClass = 'text-success'; // Money spent? Actually usually displayed as positive record.
            } else if (tx.type === 'DEBIT' || tx.type === 'SESSION') {
                // Usage
                amountDisplay = `-${tx.amount}m`;
                amountClass = 'text-danger'; // Red for deduction
            } else {
                // Credit / Bonus
                amountDisplay = `+${tx.amount}m`;
                amountClass = 'text-success';
            }

            return `
            <li style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #eee;">
                <span class="text-sm">${dateStr}</span>
                <span class="text-sm font-bold ${amountClass}">
                    ${amountDisplay}
                </span>
            </li>
        `}).join('');
    }

    logout() {
        store.logout();
        window.location.href = '/';
    }

    // --- Break Logic ---

    showBreakSelection() {
        const modal = document.getElementById('break-modal');
        modal.classList.remove('hidden');
        // Force Reflow
        void modal.offsetWidth;
        modal.classList.add('active');
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300); // Wait for transition
    }

    // --- Settings & Sound Logic ---
    openSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('active');
    }

    toggleAudioInput() {
        const source = document.querySelector('input[name="soundSource"]:checked').value;
        const container = document.getElementById('local-file-container');

        // Save Preference Immediately
        localStorage.setItem('audioPref', source);

        if (source === 'local') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }

    startBreak(minutes) {
        try {
            this.selectedDuration = minutes;
            this.closeModal('break-modal');

            // Calculate Frequencies (Core Logic)
            if (typeof ssbCore === 'undefined' || !ssbCore.calculateValues) {
                console.error("ssbCore missing");
                alert("System Audio Engine Loading... Please try again in a moment.");
                return;
            }

            // Mobile is the key for Frequencies
            const mobileKey = this.user.mobile || '9999999999';
            const { val1, val2 } = ssbCore.calculateValues(mobileKey);
            this.currentFreq1 = val1;
            this.currentFreq2 = val2;

            // Get Colors for Preview
            const { color1, color2 } = ssbCore.verifyContrast(val1, val2);

            const leftCircle = document.getElementById('color-circle-left');
            const rightCircle = document.getElementById('color-circle-right');

            if (leftCircle) leftCircle.style.background = color1;
            if (rightCircle) rightCircle.style.background = color2;

            // Show Frequencies
            const f1 = ssbCore.getFrequencyText(val1);
            const f2 = ssbCore.getFrequencyText(val2);

            const leftDisplay = document.getElementById('freq-display-left');
            const rightDisplay = document.getElementById('freq-display-right');

            // Update with animation class if possible, or just text
            if (leftDisplay) leftDisplay.innerText = `${f1} Hz`;
            if (rightDisplay) rightDisplay.innerText = `${f2} Hz`;

            // Reset UI Error
            const audioErr = document.getElementById('audio-file-error');
            if (audioErr) audioErr.classList.add('hidden');

            const freqModal = document.getElementById('freq-modal');
            freqModal.classList.remove('hidden');
            // Force Reflow for transition
            void freqModal.offsetWidth;
            freqModal.classList.add('active');
            // Force Reflow for transition
            void freqModal.offsetWidth;
            freqModal.classList.add('active');

        } catch (e) {
            console.error(e);
            alert("Error Starting Break: " + e.message);
        }
    }

    runBreak() {
        try {
            let soundSource = localStorage.getItem('audioPref') || 'system';
            let localAudioUrl = null;

            if (soundSource === 'local') {
                const fileInput = document.getElementById('local-audio-file');
                if (!fileInput.files || !fileInput.files[0]) {
                    // Fallback to System automatically if file is missing (Better UX)
                    console.warn("Local file missing. Falling back to System Audio.");
                    soundSource = 'system';
                } else {
                    localAudioUrl = URL.createObjectURL(fileInput.files[0]);
                }
            }


            this.closeModal('freq-modal');

            if ((this.identity.minutesBalance || 0) < this.selectedDuration) {
                alert("Insufficient Balance!");
                return;
            }

            // Setup UI
            const ui = document.getElementById('active-break-ui');
            ui.classList.remove('hidden');

            // Colors
            const { color1, color2 } = ssbCore.verifyContrast(this.currentFreq1, this.currentFreq2);
            ui.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

            // Show UI
            void ui.offsetWidth;
            ui.classList.add('active');

            // Force Re-Translate
            if (typeof i18n !== 'undefined') i18n.updatePage();

            // Audio Logic
            if (soundSource === 'system') {
                ssbCore.startAudio(this.currentFreq1, this.currentFreq2);
            } else {
                // Local File Playback
                this.localAudio = new Audio(localAudioUrl);
                this.localAudio.loop = true;
                this.localAudio.play().catch(e => console.error("Local Play Error:", e));
            }

            // Fullscreen
            if (ui.requestFullscreen) ui.requestFullscreen().catch(e => console.log(e));

            // Timer Logic
            let seconds = this.selectedDuration * 60;
            const display = document.getElementById('timer-display');

            // Initial Display
            const m = Math.floor(seconds / 60).toString().padStart(2, '0');
            const s = (seconds % 60).toString().padStart(2, '0');
            display.textContent = `${m}:${s}`;

            this.timer = setInterval(() => {
                seconds--;
                const m = Math.floor(seconds / 60).toString().padStart(2, '0');
                const s = (seconds % 60).toString().padStart(2, '0');
                display.textContent = `${m}:${s}`;

                if (seconds <= 0) {
                    this.completeBreak();
                }
            }, 1000);
        } catch (e) {
            console.error(e);
            alert("Error Running Break: " + e.message);
            document.getElementById('active-break-ui').classList.remove('active');
            document.getElementById('active-break-ui').classList.add('hidden');
        }
    }

    endBreakEarly() {
        this.completeBreak();
    }

    completeBreak() {
        clearInterval(this.timer);

        // Stop System Audio
        if (ssbCore && ssbCore.stopAudio) ssbCore.stopAudio();

        // Stop Local Audio
        if (this.localAudio) {
            this.localAudio.pause();
            this.localAudio.currentTime = 0;
            // Revoke URL to free memory if needed, though browser handles usually
            // but good practice if we stored the URL string. 
            // Here we don't persist the simple URL string, but we can clear the object
            this.localAudio = null;
        }

        if (document.fullscreenElement) document.exitFullscreen().catch(e => { });

        const ui = document.getElementById('active-break-ui');
        ui.classList.remove('active');
        setTimeout(() => {
            ui.classList.add('hidden');
            // Reload after animation to update balance/history
            window.location.reload();
        }, 500);

        // Deduct
        store.deductMinutes(this.user.id, this.selectedDuration, "Pause Session", this.identity.id);

        alert(i18n.t('break.complete') || "Message not found");
    }

    // --- Partner Logic ---
    checkPartnerStatus() {
        if (this.user.hasFamilyPlan) {
            const section = document.getElementById('partner-section');
            if (section) section.classList.remove('hidden');
        }
    }

    activatePartnerMode() {
        if (!this.user.hasFamilyPlan) return;

        // Show Modal
        const modal = document.getElementById('partner-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth; // Trigger reflow

        // Pre-fill Name
        const nameInput = document.getElementById('partner-name');
        if (nameInput && this.user.name) {
            nameInput.value = this.user.name;
        }
    }

    // --- Form Helpers ---
    async handlePincodeInput(input) {
        const val = input.value.replace(/[^0-9]/g, '');
        input.value = val;

        if (val.length === 6) {
            const msg = document.getElementById('pincodeMsg');
            msg.style.display = 'block';
            msg.classList.remove('hidden');
            msg.textContent = "Fetching details...";

            try {
                const response = await fetch(`https://api.postalpincode.in/pincode/${val}`);
                const data = await response.json();

                if (data && data[0] && data[0].Status === 'Success') {
                    const details = data[0].PostOffice[0];
                    document.getElementById('partner-city').value = details.District;
                    document.getElementById('partner-state').value = details.State;
                    msg.textContent = "Location found!";
                    setTimeout(() => msg.classList.add('hidden'), 2000);
                } else {
                    msg.textContent = "Invalid Pincode";
                    document.getElementById('partner-city').value = "";
                    document.getElementById('partner-state').value = "";
                }
            } catch (e) {
                msg.textContent = "Could not fetch details.";
                console.error(e);
            }
        }
    }

    showTerms(e) {
        e.preventDefault();
        const modal = document.getElementById('terms-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('active');
    }

    acceptTerms() {
        document.getElementById('partner-terms').checked = true;
        this.closeModal('terms-modal');
    }

    async handlePartnerSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('partner-name').value;
        const upi = document.getElementById('partner-upi').value;
        const pincode = document.getElementById('partner-pincode').value;
        const city = document.getElementById('partner-city').value;
        const state = document.getElementById('partner-state').value;
        const terms = document.getElementById('partner-terms').checked;
        const fileInput = document.getElementById('partner-img');

        if (!terms) {
            alert("Please read Terms & Conditions carefully and check this box.");
            return;
        }

        if (!name || !upi || !pincode || !city || !state) {
            alert("Please fill all fields.");
            return;
        }

        // Address Object
        const fullAddress = { pincode, city, state };

        let profileImageBase64 = null;
        if (fileInput.files && fileInput.files[0]) {
            try {
                profileImageBase64 = await this.processImage(fileInput.files[0]);
            } catch (err) {
                alert("Image Error: " + err.message);
                return;
            }
        } else {
            // Default Logo as per user request
            profileImageBase64 = 'assets/logo.png';
        }

        try {
            // Create SID Identity for this user
            const mobileSuffix = this.user.mobile.slice(-4);
            const newSid = 'S' + mobileSuffix + Math.floor(Math.random() * 100);

            const newIdentity = {
                id: newSid,
                type: 'SID',
                walletBalance: 0,
                minutesBalance: 0,
                units: [],
                image: profileImageBase64
            };

            // Initialize Root Unit 
            if (store.generateSCode) {
                newIdentity.units.push({
                    sCode: store.generateSCode(null),
                    parentSCode: null,
                    createdAt: new Date().toISOString()
                });
            }

            // Update User
            const users = store.getUsers();
            const userIdx = users.findIndex(u => u.id === this.user.id);
            if (userIdx !== -1) {
                const user = users[userIdx];

                // Add Identity
                if (!user.identities) user.identities = [];
                user.identities.push(newIdentity);

                // Update Role & Family Slots
                user.role = 'SEEDER';
                user.familySlots = 3;

                // Save Updated Details
                user.name = name;
                user.address = fullAddress;
                user.upiId = upi;
                user.profileImage = profileImageBase64;

                store.saveUsers(users);

                alert(`Partner Mode Activated!\nYour Partner ID: ${newSid}\n\nPlease login again with your new Seeder ID.`);
                this.logout();
            } else {
                throw new Error("User record not found to update.");
            }

        } catch (err) {
            console.error(err);
            alert("Activation Failed: " + err.message);
        }
    }

    processImage(file) {
        return new Promise((resolve, reject) => {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                reject(new Error("Image too large. Max 2MB."));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 300;

                    if (width > height) {
                        if (width > maxDim) {
                            height *= maxDim / width;
                            width = maxDim;
                        }
                    } else {
                        if (height > maxDim) {
                            width *= maxDim / height;
                            height = maxDim;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                };
                img.onerror = () => reject(new Error("Invalid image logic."));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("File read error."));
            reader.readAsDataURL(file);
        });
    }

    // Alarm
    setAlarm() {
        const timeInput = document.getElementById('alarm-time').value;
        if (!timeInput) return alert("Please pick a time.");

        const [h, m] = timeInput.split(':');
        const now = new Date();
        const alarmDate = new Date();
        alarmDate.setHours(h, m, 0, 0);

        if (alarmDate < now) {
            alarmDate.setDate(alarmDate.getDate() + 1); // Next day
        }

        const ms = alarmDate - now;
        setTimeout(() => {
            alert(i18n.t('alarm.alert') || "Time for a break!");

            // Generated Beep (Reliable)
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                const ctx = new AudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
                osc.frequency.setValueAtTime(440, ctx.currentTime + 0.5); // A4

                gain.gain.setValueAtTime(0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);

                osc.start();
                osc.stop(ctx.currentTime + 1);
            } catch (e) {
                console.error("Alarm Audio Failed:", e);
            }
        }, ms);

        alert(i18n.t('alarm.msg.set') || "Alarm Set!");
    }

}

// Initialize safely
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboardApp = new DashboardBasicApp();
    } catch (e) {
        console.error("Critical Init Error:", e);
        if (window.onerror) window.onerror("Init Failed: " + e.message, "dashboard-basic.js", 0);
    }
});
