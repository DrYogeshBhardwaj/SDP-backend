class SeederApp {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        const session = store.getSession();
        // Seeder/Admin access only
        if (!session || (session.role !== 'SEEDER' && session.role !== 'ADMIN')) {
            window.location.href = 'login.html';
            return;
        }
        this.user = store.getById(session.id); // Refresh
        this.render();
    }

    render() {
        const identity = this.user.identities.find(i => i.type === 'SID') || this.user.identities[0];

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
        // Link (Clean Join Flow) - Robust for Local & Server
        // Replaces 'seeder.html' with 'join_580.html' in the current path
        const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
        const link = `${basePath}/join_580.html?ref=${identity.id}`;
        document.getElementById('ref-link').value = link;

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
    }

    renderStats() {
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

    logout() {
        store.logout();
        window.location.href = 'login.html';
    }
}

const seederApp = new SeederApp();
