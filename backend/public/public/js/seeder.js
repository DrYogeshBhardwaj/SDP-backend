class SeederApp {
    constructor() {
        this.user = null;
        this.init();
    }

    async init() {
        try {
            const res = await fetch(CONFIG.API_BASE_URL + '/auth/me', { credentials: 'include' });
            if (!res.ok) {
                window.location.href = 'login.html';
                return;
            }
            const data = await res.json();
            this.user = data.data ? data.data.user : data.user;

            // Seeder/Admin access only
            if (!this.user || (this.user.role !== 'SEEDER' && !this.user.role.includes('ADMIN'))) {
                window.location.href = 'login.html';
                return;
            }

            // Bind fallback identities for previous UI rendering logic
            this.user.identities = [{
                type: 'SID',
                walletBalance: this.user.walletBalance || 0,
                transactions: []
            }];

            if (!this.user.mobile) {
                this.user.mobile = '1234567890';
            }

            this.bindEvents();
            this.render();
            this.loadLiveData();
            this.loadFamilyMembers();
        } catch (e) {
            console.error("Auth Error:", e);
            window.location.href = 'login.html';
        }
    }

    async loadLiveData() {
        try {
            const token = localStorage.getItem('sdp_token');
            const netRes = await fetch(CONFIG.API_BASE_URL + '/seeder/network-tree', {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            if (netRes.ok) {
                const netData = await netRes.json();
                this.networkTree = netData.data;
                this.renderStats();
            }
        } catch (e) { console.error("Error loading network tree:", e); }
    }

    bindEvents() {
        // Bind Session Buttons
        document.querySelectorAll('.session-btn').forEach(btn => {
            btn.addEventListener('click', () => this.startSession(parseInt(btn.getAttribute('data-minutes'))));
        });

        // Bind Early Exit
        const earlyExitBtn = document.getElementById('end-session-early-btn');
        if (earlyExitBtn) {
            earlyExitBtn.addEventListener('click', () => this.processEarlyExit());
        }

        // Bind Family Add Form
        const familyForm = document.getElementById('family-add-form');
        if (familyForm) {
            familyForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = familyForm.querySelector('button');
                const msg = document.getElementById('family-msg');
                const fMobile = document.getElementById('new-family-mobile').value.trim();
                const fPin = document.getElementById('new-family-pin').value.trim();

                if (fMobile.length !== 10 || fPin.length !== 4) {
                    msg.textContent = "Please ensure Mobile is 10 digits and PIN is 4 digits.";
                    msg.style.color = "red";
                    return;
                }

                btn.disabled = true;
                btn.textContent = "Adding...";
                msg.textContent = "";

                try {
                    const token = localStorage.getItem('sdp_token');
                    const res = await fetch(CONFIG.API_BASE_URL + '/auth/family', {
                        method: 'POST',
                        credentials: 'include',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            mobile: fMobile,
                            pin: fPin
                        })
                    });

                    const data = await res.json();
                    if (res.ok && data.success) {
                        msg.innerHTML = `<span style="color: green;">✔ Successfully added ${fMobile}!</span>`;
                        familyForm.reset();
                        this.loadFamilyMembers();
                    } else {
                        msg.textContent = data.message || "Failed to add family member.";
                        msg.style.color = "red";
                    }
                } catch (err) {
                    msg.textContent = "Network error. Please try again.";
                    msg.style.color = "red";
                } finally {
                    btn.disabled = false;
                    btn.textContent = "Add Family Member";
                }
            });
        }
    }

    async loadFamilyMembers() {
        try {
            const token = localStorage.getItem('sdp_token');
            const res = await fetch(CONFIG.API_BASE_URL + '/auth/family', {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });
            const data = await res.json();

            if (res.ok && data.data && data.data.members) {
                const members = data.data.members;
                const maxMembers = 3;

                const countMsg = document.getElementById('family-count-msg');
                if (countMsg) {
                    const remaining = maxMembers - members.length;
                    countMsg.textContent = `You can add ${remaining} more family members (out of ${maxMembers}).`;
                }

                const listContainer = document.getElementById('family-list-container');
                const listEl = document.getElementById('family-list');
                const formEl = document.getElementById('family-add-form');

                if (members.length > 0) {
                    listContainer.classList.remove('hidden');
                    listEl.innerHTML = members.map(m => `<li>${m.mobile} (Added ${new Date(m.createdAt).toLocaleDateString()})</li>`).join('');
                } else {
                    listContainer.classList.add('hidden');
                }

                if (members.length >= maxMembers && formEl) {
                    formEl.style.display = 'none';
                    if (countMsg) countMsg.textContent = `You have reached your limit of ${maxMembers} family members.`;
                } else if (formEl) {
                    formEl.style.display = 'block';
                }
            }
        } catch (e) {
            console.error("Failed to load family members", e);
        }
    }

    render() {
        // Fallback safely so identity is never entirely undefined
        const identity = this.user.identities.find(i => i.type === 'SID') || this.user.identities[0] || { walletBalance: 0, transactions: [] };

        // Profile
        const imgEl = document.getElementById('seeder-img');
        if (imgEl) {
            imgEl.src = identity.image || this.user.profileImage || 'assets/logo.png';
        }
        document.getElementById('seeder-name').textContent = this.user.name || 'Seeder';
        document.getElementById('seeder-upi').textContent = this.user.upiId || 'Not Set';

        // Wallet
        document.getElementById('wallet-display').textContent = `₹${identity.walletBalance || 0}`;

        // Link
        // Link (Clean Join Flow)
        // Redirecting properly to the clean universal checkout box
        const basePath = window.location.origin;
        const refCode = this.user.referral_code || this.user.mobile || 'SDP-REF';
        const link = `${basePath}/invite.html?amount=580&mode=purchase&ref=${refCode}`;

        const refLinkEl = document.getElementById('ref-link');
        if (refLinkEl) {
            refLinkEl.value = link;
        }

        // Activity
        const list = document.getElementById('activity-list');
        if (identity.transactions && identity.transactions.length > 0) {
            list.innerHTML = identity.transactions.slice(-10).reverse().map(tx => {
                const dateObj = new Date(tx.timestamp || tx.date);
                const dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

                let amountDisplay = '';
                let amountClass = '';

                // LOGIC: Distinguish Money (₹) vs Minutes (m)
                // 1. Rewards (Commissions) - Money Credit
                if (tx.type === 'CREDIT' && (tx.desc === 'Seeder Reward' || tx.source)) {
                    amountDisplay = `+₹${tx.amount}`;
                    amountClass = 'text-success font-bold';
                }
                // 2. Payouts (Money Debit) -> "Received Amount" (No minus)
                else if (tx.type === 'DEBIT' && tx.status === 'PAID') {
                    amountDisplay = `₹${tx.amount}`;
                    amountClass = 'text-primary font-bold';
                }
                // 3. Purchases (Buying Kits) - Money Debit (Expense)
                else if (tx.type === 'PURCHASE') {
                    amountDisplay = `-₹${tx.amount}`;
                    amountClass = 'text-danger font-bold';
                }
                // 4. Minutes Usage (Session) - Minutes Debit
                else if (tx.type === 'DEBIT' || tx.type === 'SESSION') {
                    amountDisplay = `-${tx.amount}m`;
                    amountClass = 'text-danger';
                }
                // 5. Minutes Bonuses - Minutes Credit
                else {
                    amountDisplay = `+${tx.amount}m`;
                    amountClass = 'text-success';
                }

                return `
                <li class="p-1 border-b border-gray-100 flex justify-between items-center">
                    <div>
                        <span class="block text-sm text-slate-700">${tx.desc || tx.source || 'Transaction'}</span>
                        <span class="text-[10px] text-muted">${dateStr}</span>
                    </div>
                    <span class="${amountClass}">
                        ${amountDisplay}
                    </span>
                </li>
                `;
            }).join('');
        } else {
            list.innerHTML = '<li class="p-1 text-muted italic">No recent activity.</li>';
        }

        this.renderFeedback();

        // Motivation
        const motivation = store.getMotivation();
        const motBox = document.getElementById('motivation-box');
        if (motBox) motBox.textContent = motivation;

        this.renderStats();
        this.renderHistory();
    }

    renderStats() {
        const container = document.getElementById('network-tree-container');
        if (!container) return;

        if (!this.networkTree) {
            container.innerHTML = `
                <h3 class="text-sm font-bold text-slate-700 mb-1">🌳 My Network Team</h3>
                <div class="text-xs text-slate-600 italic">No team data available.</div>
            `;
            return;
        }

        const stats = this.networkTree.stats;
        const level1 = this.networkTree.level1 || [];
        const level2 = this.networkTree.level2 || [];

        let html = `
            <div class="flex justify-between items-center mb-2 pb-1 border-b border-gray-100">
                <h3 class="text-sm font-bold text-slate-700">🌳 My Network Team</h3>
                <div class="text-right">
                    <span class="text-[10px] text-muted block">Total Network Earned</span>
                    <span class="text-sm font-bold text-green-600">₹${stats.totalEarned}</span>
                </div>
            </div>
            
            <div class="mb-2">
                <div class="flex justify-between items-center mb-1 bg-green-50 p-1 rounded">
                    <span class="text-xs font-bold text-green-800">Level 1 (Direct)</span>
                    <span class="text-xs font-bold text-green-700">₹${stats.totalEarnedDirect} (${level1.length} members)</span>
                </div>
                <div class="space-y-1 pl-2 border-l-2 border-green-200">
        `;

        if (level1.length === 0) {
            html += `<div class="text-[10px] text-muted italic">No direct members yet.</div>`;
        } else {
            level1.forEach(m => {
                const displayName = (m.name && m.name.toLowerCase() !== 'member') ? m.name : m.mobile;
                html += `
                    <div class="flex flex-col mb-1 pb-1 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                        <span class="text-[11px] font-semibold text-slate-700">🙎‍♂️ ${displayName} <span class="text-[9px] text-muted font-normal ml-1">Joined ${new Date(m.createdAt).toLocaleDateString()}</span></span>
                        <span class="text-[10px] text-muted ml-4 font-mono">${m.mobile} <span class="ml-1 badge badge-primary text-[8px] px-1 py-0! leading-none" style="padding:0 4px !important;">${m.role.replace('USER_', 'Kit ')}</span></span>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-1 bg-blue-50 p-1 rounded">
                    <span class="text-xs font-bold text-blue-800">Level 2 (Indirect)</span>
                    <span class="text-xs font-bold text-blue-700">₹${stats.totalEarnedIndirect} (${level2.length} members)</span>
                </div>
                <div class="space-y-1 pl-2 border-l-2 border-blue-200">
        `;

        if (level2.length === 0) {
            html += `<div class="text-[10px] text-muted italic">No indirect members yet.</div>`;
        } else {
            level2.forEach(m => {
                const displayName = (m.name && m.name.toLowerCase() !== 'member') ? m.name : m.mobile;
                html += `
                    <div class="flex flex-col mb-1 pb-1 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                        <span class="text-[11px] font-semibold text-slate-700">🙎‍♂️ ${displayName} <span class="text-[9px] text-muted font-normal ml-1">Joined ${new Date(m.createdAt).toLocaleDateString()}</span></span>
                        <span class="text-[10px] text-muted ml-4 font-mono pl-1">${m.mobile}</span>
                    </div>
                `;
            });
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    renderHistory() {
        const tbody = document.getElementById('history-table-body');
        if (!tbody) return;

        let txns = [];
        try {
            txns = JSON.parse(localStorage.getItem('ssb_transactions') || '[]');
        } catch (e) { }

        const history = txns.filter(t => t.userId === this.user.id && (t.type === 'SESSION' || (t.desc && t.desc.includes('Session'))));

        if (!history || history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-1 text-muted italic">No sessions yet.</td></tr>';
            return;
        }

        tbody.innerHTML = history.slice(-10).reverse().map(session => {
            const d = new Date(session.timestamp || session.date);
            return `
            <tr class="border-b border-gray-100">
                <td class="py-0_5">${d.toLocaleDateString('en-GB')}</td>
                <td class="py-0_5">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td class="py-0_5">${session.duration || parseInt(session.amount) || '0'} min</td>
                <td class="py-0_5 text-right font-bold text-success">COMPLETED</td>
            </tr>
        `}).join('');
    }

    async startSession(minutes) {
        const errorDiv = document.getElementById('error-message');
        const successDiv = document.getElementById('success-message');
        if (errorDiv) errorDiv.classList.add('hidden');
        if (successDiv) successDiv.classList.add('hidden');

        try {
            const success = store.deductMinutes(this.user.id, minutes, `Started ${minutes} min session`);
            if (!success) {
                this.showError('Sufficient minute balance not available.');
                return;
            }

            let ritualPromise = null;
            if (window.runAlignmentRitual) ritualPromise = window.runAlignmentRitual();

            if (window.playSessionAmbientAudio) window.playSessionAmbientAudio(5);

            try {
                const docEl = document.documentElement;
                const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
                if (requestFS && !document.fullscreenElement && !document.webkitFullscreenElement) {
                    requestFS.call(docEl);
                }
            } catch (e) { }

            store.addTransaction({
                userId: this.user.id,
                type: 'SESSION',
                amount: minutes,
                duration: minutes,
                desc: `Session - ${minutes} min`
            });

            if (ritualPromise) await ritualPromise;

            const breakUI = document.getElementById('active-break-ui');
            if (breakUI) breakUI.classList.remove('hidden');

            let timeLeft = minutes * 60;
            const timerDisplay = document.getElementById('session-timer-large');

            if (this.activeSessionInterval) clearInterval(this.activeSessionInterval);

            this.activeSessionInterval = setInterval(async () => {
                timeLeft--;
                const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                const s = (timeLeft % 60).toString().padStart(2, '0');
                if (timerDisplay) timerDisplay.textContent = `${m}:${s}`;

                if (timeLeft <= 0) this.endSessionUI(minutes, successDiv);
            }, 1000);

        } catch (error) {
            if (window.stopSessionAmbientAudio) window.stopSessionAmbientAudio(true);
            this.showError(error.message || 'Failed to start session.');
        }
    }

    processEarlyExit() {
        if (confirm("Are you sure you want to end your session early? The time has already been deducted.")) {
            this.endSessionUI();
        }
    }

    endSessionUI(minutes = 0, successDiv = null) {
        if (this.activeSessionInterval) clearInterval(this.activeSessionInterval);
        if (window.stopSessionAmbientAudio) window.stopSessionAmbientAudio();

        const breakUI = document.getElementById('active-break-ui');
        if (breakUI) breakUI.classList.add('hidden');

        try {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement)) {
                exitFS.call(document);
            }
        } catch (e) { }

        if (minutes > 0 && successDiv) {
            successDiv.textContent = `Successfully completed ${minutes} minute session!`;
            successDiv.classList.remove('hidden');
            setTimeout(() => successDiv.classList.add('hidden'), 5000);
        }

        this.user = store.getById(this.user.id);
        this.render();
    }

    showError(msg) {
        const errorDiv = document.getElementById('error-message');
        if (errorDiv) {
            errorDiv.textContent = msg;
            errorDiv.classList.remove('hidden');
            setTimeout(() => errorDiv.classList.add('hidden'), 5000);
        }
    }

    requestPayout() {
        try {
            store.requestPayout(this.user.id);
            alert("Payout Requested! Admin will verify.");
            window.location.reload();
        } catch (e) {
            alert(e.message);
        }
    }

    copyLink() {
        const input = document.getElementById('ref-link');
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices

        // 1. Try Modern API
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(input.value).then(() => {
                alert("Link Copied: " + input.value);
            }).catch(err => {
                console.error('Async: Could not copy text: ', err);
                this.fallbackCopy(input);
            });
        } else {
            // 2. Fallback
            this.fallbackCopy(input);
        }
    }

    fallbackCopy(input) {
        try {
            document.execCommand('copy');
            alert("Link Copied: " + input.value);
        } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            prompt("Copy this link manually:", input.value);
        }
    }

    editUpi() {
        const newUpi = prompt("Enter new UPI ID:", this.user.upiId);
        if (newUpi && newUpi.trim() !== "") {
            this.user.upiId = newUpi.trim();
            store.saveUser(this.user); // Helper needed or full save
            // Store.js usually has saveUsers. Let's do full save for safety
            const users = store.getUsers();
            const idx = users.findIndex(u => u.id === this.user.id);
            if (idx !== -1) {
                users[idx] = this.user;
                store.saveUsers(users);
                this.render();
            }
        }
    }

    // --- Feedback / Support ---
    sendFeedback(e) {
        e.preventDefault();
        const msgInput = document.getElementById('feedback-msg');
        const msg = msgInput.value.trim();
        if (!msg) return;

        try {
            store.submitFeedback(this.user.id, msg);
            msgInput.value = '';
            this.renderFeedback();
            // alert("Message sent!"); 
        } catch (e) {
            alert(e.message);
        }
    }

    renderFeedback() {
        const historyContainer = document.getElementById('feedback-history');
        if (!historyContainer) return;

        const feedbacks = store.getFeedback(this.user.id);
        if (feedbacks.length === 0) {
            historyContainer.innerHTML = '<div class="text-muted italic">No messages yet.</div>';
            return;
        }

        historyContainer.innerHTML = feedbacks.map(f => `
            <div class="mb-0_5">
                <div class="text-right"><span class="badge badge-secondary">${f.message}</span></div>
                ${f.reply ? `<div class="text-left mt-0_5"><span class="badge badge-primary">Admin: ${f.reply}</span></div>` : '<div class="text-xs text-muted text-right">Sent</div>'}
            </div>
        `).join('');
    }

    async logout() {
        try {
            await fetch(CONFIG.API_BASE_URL + '/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (e) { }
        window.location.href = 'login.html';
    }
}

const seederApp = new SeederApp();
