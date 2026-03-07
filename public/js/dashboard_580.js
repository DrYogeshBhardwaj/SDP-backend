/**
 * ==========================================
 * 🔒 LOCKED CODE - BY USER REQUEST (16-FEB-2026) 🔒
 * 178 User Dashboard Logic
 * Do not majorly refactor without explicit permission.
 * ==========================================
 */
class Dashboard580App {
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
        document.getElementById('user-display').textContent = this.user.name || 'User';

        const mobileEl = document.getElementById('mobile-display');
        if (mobileEl) mobileEl.textContent = this.user.mobile || '';

        document.getElementById('balance-display').textContent = this.identity.minutesBalance || 0;

        this.renderHistory();
        this.renderHistory();
        this.checkPartnerStatus();
        this.checkSeederStatus(); // New Priority Check

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

    loadDailyContent() {
        // 1. Rotating Quotes (Based on Day of Year to ensure "Daily" rotation)
        const quotes = [
            "A quiet mind is able to hear intuition over fear.",
            "Growth is painful. Change is painful. But nothing is as painful as staying stuck.",
            "Your potential is endless. Go do what you were created to do.",
            "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            "Discipline is the bridge between goals and accomplishment.",
            "Do something today that your future self will thank you for.",
            "Focus on the step in front of you, not the whole staircase."
        ];
        // Simple hash of date to pick a quote
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const quoteIndex = dayOfYear % quotes.length;

        const quoteEl = document.getElementById('daily-quote');
        if (quoteEl) quoteEl.textContent = `"${quotes[quoteIndex]}"`;

        // 2. Admin Broadcast (Mocked for now, can be read from store/localStorage)
        // For demonstration, let's look for a localStorage key or store value
        const broadcastMsg = localStorage.getItem('ssb_admin_broadcast');
        const broadcastEl = document.getElementById('admin-broadcast');
        const broadcastTextEl = document.getElementById('broadcast-text');

        if (broadcastMsg && broadcastEl && broadcastTextEl) {
            broadcastTextEl.textContent = broadcastMsg;
            broadcastEl.classList.remove('hidden');
        } else if (broadcastEl) {
            // Optional: Hardcode a test message if user wants to see it immediately? 
            // "on so and so date not payment due to bank holiday etc." - User example
            // Leaving it empty/hidden unless set.
            broadcastEl.classList.add('hidden');
        }
    }

    checkSeederStatus() {
        // Allow SEEDER, partner, OR ADMIN (for testing/super-view)
        if (this.user.role === 'SEEDER' || this.user.isSeeder || this.user.role.includes('ADMIN')) {
            const section = document.getElementById('seeder-section');
            if (section) section.classList.remove('hidden');

            const sidebarStruct = document.getElementById('sidebar-income-structure');
            if (sidebarStruct) sidebarStruct.classList.remove('hidden');

            // Toggle Sections: Hide Intro, Show Chat
            const intro = document.getElementById('how-sdp-works');
            if (intro) intro.classList.add('hidden');

            const chat = document.getElementById('seeder-chat-section');
            if (chat) {
                chat.classList.remove('hidden');
                this.renderFeedback(); // Load messages
            }

            // Hide Partner Section if showing Seeder (Redundant) -> MOVED: We Show Both for 580
            // const partnerSection = document.getElementById('partner-section');
            // if (partnerSection) partnerSection.classList.add('hidden');

            this.renderSeederStats();
        }

        // Check Family Status (For 580 Buyers AND Seeders)
        if (this.user.hasFamilyPlan || this.user.role === 'SEEDER' || this.user.isSeeder) {
            const familySection = document.getElementById('family-section');
            if (familySection) familySection.classList.remove('hidden');
            this.renderFamilySlots();
        }
    }

    renderFamilySlots() {
        const container = document.getElementById('family-slots-container');
        if (!container) return;

        // Ensure family members array exists
        const members = this.user.familyMembers || [];
        const maxSlots = 3;
        let html = '';

        for (let i = 0; i < maxSlots; i++) {
            const member = members[i];
            if (member) {
                // Occupied Slot
                html += `
                <div class="p-3 bg-blue-50 rounded shadow-sm border border-blue-100 flex flex-col items-center relative">
                    <div class="text-2xl mb-1">👤</div>
                    <div class="font-bold text-sm text-slate-700">${member.name}</div>
                    <div class="text-xs text-muted">${member.mobile}</div>
                    <span class="absolute top-1 right-1 text-xs text-green-600">✔ Active</span>
                </div>
                `;
            } else {
                // Empty Slot
                html += `
                <div class="p-3 bg-white rounded shadow-sm border border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition"
                    onclick="dashboardApp.addFamilyMember()">
                    <div class="text-2xl mb-1 text-gray-400">➕</div>
                    <div class="font-bold text-sm text-primary">Add Member</div>
                    <div class="text-xs text-muted">Free License</div>
                </div>
                `;
            }
        }
        container.innerHTML = html;
    }

    addFamilyMember() {
        const modal = document.getElementById('family-modal');
        modal.classList.remove('hidden');
        void modal.offsetWidth;
        modal.classList.add('active');

        // Reset Form
        document.getElementById('family-mobile').value = '';
        document.getElementById('family-pin').value = '';
    }

    handleFamilySubmit(e) {
        e.preventDefault();

        const mobile = document.getElementById('family-mobile').value.trim();
        const pin = document.getElementById('family-pin').value.trim();

        if (mobile.length !== 10 || isNaN(mobile)) {
            alert("Please enter a valid 10-digit mobile number.");
            return;
        }

        if (pin.length < 4) {
            alert("PIN must be at least 4 digits.");
            return;
        }

        try {
            // Call Store to add member (Name will auto-default)
            store.addFamilyMember(this.user.id, { mobile, pin });

            this.closeModal('family-modal');

            // Refresh User Data
            this.user = store.getUser(this.user.mobile);
            this.renderFamilySlots();

            alert(`Success! Family member added.`);
        } catch (e) {
            alert(e.message);
        }
    }

    sendFeedback(e) {
        e.preventDefault();
        const msgInput = document.getElementById('feedback-msg');
        const msg = msgInput.value.trim();
        if (!msg) return;

        try {
            store.submitFeedback(this.user.id, msg);
            msgInput.value = '';
            this.renderFeedback();
        } catch (e) {
            alert(e.message);
        }
    }

    renderFeedback() {
        const historyContainer = document.getElementById('feedback-history');
        if (!historyContainer) return;

        const feedbacks = store.getFeedback(this.user.id);
        if (feedbacks.length === 0) {
            historyContainer.innerHTML = '<div class="text-muted italic text-center py-2">No messages yet.</div>';
            return;
        }

        historyContainer.innerHTML = feedbacks.map(f => `
            <div class="mb-0_5">
                <div class="text-right"><span class="badge badge-secondary inline-block px-2 py-1 rounded bg-slate-100">${f.message}</span></div>
                ${f.reply ? `<div class="text-left mt-0_5"><span class="badge badge-primary inline-block px-2 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Admin: ${f.reply}</span></div>` : '<div class="text-[10px] text-muted text-right pr-1">Sent</div>'}
            </div>
        `).join('');
    }

    renderSeederStats() {
        // 1. Wallet
        const identity = this.user.identities.find(i => i.type === 'SID') || this.user.identities[0];
        document.getElementById('wallet-display-seeder').textContent = `₹${identity.walletBalance || 0}`;

        // 2. Link
        const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const link = `${basePath}/join_580.html?ref=${identity.id}`;
        document.getElementById('ref-link').value = link;

        // 3. Network Stats
        const stats = store.getSeederNetworkStats(this.user.id);
        const container = document.getElementById('depth-stats');
        if (!container || !stats) return;

        let html = '';
        const labels = ["Direct", "Level 2", "Level 3", "Level 4", "Level 5"];
        const depths = [1, 2, 3, 4, 5];

        depths.forEach((d, i) => {
            const s = stats[`depth${d}`];
            html += `
                <div class="flex justify-between items-center py-0_5 ${i < 4 ? 'border-b border-gray-100' : ''}">
                    <span class="text-muted">${labels[i]}</span>
                    <div class="text-right">
                        <div class="font-bold text-primary">₹${s.amount}</div>
                        <div class="text-[10px] text-muted">${s.count} Sales</div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;

        // 4. Check for Pending Payouts
        const payouts = store.getSeederPayoutHistory(this.user.id) || [];
        const pending = payouts.find(p => p.status === 'REQUESTED');
        const btn = document.getElementById('request-payout-btn');
        if (btn) {
            if (pending) {
                btn.disabled = true;
                btn.innerHTML = '<span>Request Sent ⏳</span>';
                btn.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                btn.disabled = false;
                btn.innerHTML = '<span>✨ Request Payout</span>';
                btn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }

    requestPayout() {
        try {
            store.requestPayout(this.user.id);
            alert("Payout Requested! Admin will verify.");
            this.updateUI(); // Refresh wallet
        } catch (e) {
            alert(e.message);
        }
    }

    copyLink() {
        const input = document.getElementById('ref-link');
        input.select();
        input.setSelectionRange(0, 99999);

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(input.value).then(() => {
                alert("Link Copied!");
            }).catch(err => {
                console.error('Async: Could not copy', err);
                document.execCommand('copy');
                alert("Link Copied!");
            });
        } else {
            document.execCommand('copy');
            alert("Link Copied!");
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
            const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); // 19 Feb 2026

            let amountDisplay = '';
            let amountClass = '';

            // LOGIC: Distinguish Money (₹) vs Minutes (m)
            // 1. Rewards (Commissions) - Money Credit
            if (tx.type === 'CREDIT' && (tx.desc === 'Seeder Reward' || tx.source)) {
                amountDisplay = `+₹${tx.amount}`;
                amountClass = 'text-success font-bold'; // Green
            }
            // 2. Payouts (Money Debit) -> "Received Amount" (No minus)
            else if (tx.type === 'DEBIT' && tx.status === 'PAID') {
                amountDisplay = `₹${tx.amount}`;
                amountClass = 'text-primary font-bold'; // Blue (Received)
            }
            // 3. Purchases (Buying Kits) - Money Debit (Expense)
            else if (tx.type === 'PURCHASE') {
                amountDisplay = `-₹${tx.amount}`;
                amountClass = 'text-danger font-bold'; // Red (Paid)
            }
            // 4. Minutes Usage (Session) - Minutes Debit
            else if (tx.type === 'DEBIT' || tx.type === 'SESSION') {
                amountDisplay = `-${tx.amount}m`;
                amountClass = 'text-danger'; // Red for deduction
            }
            // 5. Minutes Bonuses - Minutes Credit
            else {
                amountDisplay = `+${tx.amount}m`;
                amountClass = 'text-success';
            }

            return `
            <li class="flex justify-between items-center py-2 border-b border-gray-100">
                <span class="text-sm text-slate-600">${dateStr}</span>
                <span class="text-sm ${amountClass}">
                    ${amountDisplay}
                </span>
            </li>
            `;
        }).join('');
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
                throw new Error("Core Audio Engine (ssbCore) not loaded. Please refresh.");
            }

            const { val1, val2 } = ssbCore.calculateValues(this.user.mobile);
            this.currentFreq1 = val1;
            this.currentFreq2 = val2;

            // Get Colors for Preview
            const { color1, color2 } = ssbCore.verifyContrast(val1, val2);
            document.getElementById('color-circle-left').style.background = color1;
            document.getElementById('color-circle-right').style.background = color2;

            // Show Frequencies
            const f1 = ssbCore.getFrequencyText(val1);
            const f2 = ssbCore.getFrequencyText(val2);
            document.getElementById('freq-display-left').textContent = `${f1} (L)`;
            document.getElementById('freq-display-right').textContent = `${f2} (R)`;

            // No Reset of UI - Respect Sidebar Selection
            document.getElementById('audio-file-error').classList.add('hidden');

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

            // Success - Hide Error
            document.getElementById('audio-file-error').classList.add('hidden');

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
            console.error("Run Break Error:", e);
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
    // --- Partner Logic ---
    checkPartnerStatus() {
        if (this.user.hasFamilyPlan) {
            const section = document.getElementById('partner-section');
            if (section) section.classList.remove('hidden');
        }
    }

    activatePartnerMode() {
        if (!this.user.hasFamilyPlan) return;

        // Redirect to dedicated Seeder Application Page
        window.location.href = 'seeder_form.html';
    }

    // --- Form Helpers ---
    async handlePincodeInput(input) {
        const val = input.value.replace(/[^0-9]/g, '');
        input.value = val;

        if (val.length === 6) {
            const msg = document.getElementById('pincodeMsg');
            msg.style.display = 'block'; // Was hidden via class
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
                image: profileImageBase64 // Store specific image for this identity
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
                user.name = name; // Update main name if changed
                user.address = fullAddress; // Store structured address
                user.upiId = upi;
                user.profileImage = profileImageBase64; // Also save to main profile for fallback

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
                    // Resize to max 300x300 for storage efficiency
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
                    resolve(canvas.toDataURL('image/jpeg', 0.8)); // Compress
                };
                img.onerror = () => reject(new Error("Invalid image logic."));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error("File read error."));
            reader.readAsDataURL(file);
        });
    }

    // Helper for preview
    previewImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.getElementById('preview-img');
                const icon = document.getElementById('upload-icon');
                img.src = e.target.result;
                img.style.display = 'block';
                icon.style.display = 'none';
            }
            reader.readAsDataURL(input.files[0]);
        }
    }
}


// Initialize safely
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.dashboardApp = new Dashboard580App();
    } catch (e) {
        console.error("Critical Init Error:", e);
        if (window.onerror) window.onerror("Init Failed: " + e.message, "dashboard_580.js", 0);
    }
});
