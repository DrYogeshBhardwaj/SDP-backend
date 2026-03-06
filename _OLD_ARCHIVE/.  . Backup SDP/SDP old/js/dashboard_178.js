/**
 * ==========================================
 * 🔒 LOCKED CODE - BY USER REQUEST (16-FEB-2026) 🔒
 * 178 User Dashboard Logic
 * Do not majorly refactor without explicit permission.
 * ==========================================
 */
class Dashboard178App {
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
        const session = store.getSession();
        if (!session) {
            window.location.href = 'login.html';
            return;
        }
        this.user = session;
        // 178 Users usually just have one CID, but loop to find active
        const activeId = session.activeIdentityId;
        if (activeId) {
            this.identity = this.user.identities.find(i => i.id === activeId);
        }

        if (!this.identity) {
            this.identity = this.user.identities.find(i => i.type === 'CID') || this.user.identities[0];
        }
    }

    loadUserData() {
        // Refresh from Store
        const freshUser = store.getUsers().find(u => u.id === this.user.id);
        if (freshUser) {
            this.user = freshUser;
            this.identity = this.user.identities.find(i => i.id === this.identity.id);
        }
    }

    updateUI() {
        document.getElementById('user-display').textContent = `${this.user.name} (${this.identity.id})`;
        document.getElementById('balance-display').textContent = this.identity.minutesBalance || 0;

        this.renderHistory();

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
        window.location.href = 'index.html';
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

    startBreak(minutes) {
        try {
            this.selectedDuration = minutes;
            this.closeModal('break-modal');

            // Calculate Frequencies (Core Logic)
            if (typeof ssbCore === 'undefined' || !ssbCore.calculateValues) {
                throw new Error("Core Audio Engine (ssbCore) not loaded. Please refresh.");
            }

            const { val1, val2 } = ssbCore.calculateValues(this.user.mobile);
            this.currentFreq1 = val1;
            this.currentFreq2 = val2;

            // Get Colors for Preview
            const { color1, color2 } = ssbCore.verifyContrast(val1, val2);
            document.getElementById('color-circle-left').style.background = color1;
            document.getElementById('color-circle-right').style.background = color2;

            document.getElementById('freq-display').textContent = `Left: ${ssbCore.getFrequencyText(val1)} | Right: ${ssbCore.getFrequencyText(val2)}`;

            const freqModal = document.getElementById('freq-modal');
            freqModal.classList.remove('hidden');
            void freqModal.offsetWidth;
            freqModal.classList.add('active');

        } catch (e) {
            console.error(e);
            alert("Error Starting Break: " + e.message);
        }
    }

    runBreak() {
        try {
            this.closeModal('freq-modal');

            // Check Balance
            if ((this.identity.minutesBalance || 0) < this.selectedDuration) {
                alert("Insufficient Balance!");
                return;
            }

            // Setup UI
            const ui = document.getElementById('active-break-ui');
            ui.classList.remove('hidden');

            // Colors
            const { color1, color2 } = ssbCore.verifyContrast(this.currentFreq1, this.currentFreq2);
            console.log(`[Break Start] Colors: ${color1}, ${color2} | Freqs: ${this.currentFreq1}, ${this.currentFreq2}`);

            ui.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

            // Show UI
            void ui.offsetWidth;
            ui.classList.add('active');

            // Force Re-Translate (because this part of DOM might be hidden/inactive before)
            if (typeof i18n !== 'undefined') i18n.updatePage();

            // Audio
            ssbCore.startAudio(this.currentFreq1, this.currentFreq2);

            // Fullscreen
            if (ui.requestFullscreen) ui.requestFullscreen().catch(e => console.log(e));

            // Timer
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
        // Removed Confirmation - Silent close as requested
        this.completeBreak();
    }

    completeBreak() {
        clearInterval(this.timer);
        ssbCore.stopAudio();

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
        window.dashboardApp = new Dashboard178App();
    } catch (e) {
        console.error("Critical Init Error:", e);
        if (window.onerror) window.onerror("Init Failed: " + e.message, "dashboard_178.js", 0);
    }
});
