class DashboardApp {
    constructor() {
        this.user = null;
        this.identity = null; // The specific sub-account (CID/SID)
        this.init();
    }

    init() {
        this.checkAuth();
        this.loadUserData();
        this.updateUI();
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
        // Find active identity from session or default
        const activeId = session.activeIdentityId;
        if (activeId) {
            this.identity = this.user.identities.find(i => i.id === activeId);
        }

        if (!this.identity) {
            // Fallback: Pick first CID
            this.identity = this.user.identities.find(i => i.type === 'CID') || this.user.identities[0];
        }
    }

    loadUserData() {
        // Refresh from Store to get latest balance
        const freshUser = store.getUsers().find(u => u.id === this.user.id);
        if (freshUser) {
            this.user = freshUser;
            this.identity = this.user.identities.find(i => i.id === this.identity.id);
        }
    }

    updateUI() {
        document.getElementById('user-display').textContent = `${this.user.name} (${this.identity.id})`;
        document.getElementById('balance-display').textContent = this.identity.minutesBalance || 0;

        // Show Upgrade/Family Section if eligible
        if (this.user.hasFamilyPlan && this.identity.id === this.user.identities[0].id) { // Only Main ID
            document.getElementById('upgrade-section').classList.remove('hidden');
        } else {
            // Show Default Content for Standard Users
            const defaultContent = document.getElementById('default-dashboard-content');
            if (defaultContent) defaultContent.classList.remove('hidden');
        }

        // Render Recent History if element exists
        this.renderHistory();
    }

    renderHistory() {
        const historyList = document.getElementById('recent-history-list');
        if (!historyList) return;

        const transactions = this.user.transactions || []; // Logic to get *this identity's* transactions ideally
        // Filter for this identity if possible, or just show last 3
        const myTx = transactions.slice(-3).reverse();

        if (myTx.length === 0) {
            historyList.innerHTML = '<li class="text-sm text-muted">No recent activity.</li>';
            return;
        }

        historyList.innerHTML = myTx.map(tx => `
            <li style="display:flex; justify-content:space-between; padding:0.5rem 0; border-bottom:1px solid #eee;">
                <span class="text-sm">${new Date(tx.date).toLocaleDateString()}</span>
                <span class="text-sm font-bold">${tx.amount > 0 ? '+' : ''}${tx.amount}m</span>
            </li>
        `).join('');
    }

    logout() {
        store.logout();
        window.location.href = 'login.html';
    }

    // --- Break Logic ---

    showBreakSelection() {
        document.getElementById('break-modal').classList.remove('hidden');
    }

    closeModal(id) {
        document.getElementById(id).classList.add('hidden');
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

            document.getElementById('freq-display').textContent = `Left: ${ssbCore.getFrequencyText(val1)} | Right: ${ssbCore.getFrequencyText(val2)}`;
            document.getElementById('freq-modal').classList.remove('hidden');
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
            ui.style.background = `linear-gradient(90deg, ${color1}, ${color2})`;

            // Audio
            ssbCore.startAudio(this.currentFreq1, this.currentFreq2);

            // Fullscreen
            if (ui.requestFullscreen) ui.requestFullscreen().catch(e => console.log(e));

            // Timer
            let seconds = this.selectedDuration * 60;
            const display = document.getElementById('timer-display');

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
            document.getElementById('active-break-ui').classList.add('hidden');
        }
    }

    endBreakEarly() {
        if (confirm("End session? Full minutes will be deducted.")) {
            this.completeBreak();
        }
    }

    completeBreak() {
        clearInterval(this.timer);
        ssbCore.stopAudio();

        if (document.fullscreenElement) document.exitFullscreen().catch(e => { });
        document.getElementById('active-break-ui').classList.add('hidden');

        // Deduct
        store.deductMinutes(this.user.id, this.selectedDuration, "Pause Session", this.identity.id);

        alert("Session Complete! Balance Updated.");
        window.location.reload(); // Refresh to update balance safely
    }
}

const dashboardApp = new DashboardApp();
