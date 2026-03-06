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
        const link = `${window.location.origin}/index.html?ref=${identity.id}`;
        document.getElementById('ref-link').value = link;

        // Activity
        const list = document.getElementById('activity-list');
        if (identity.transactions && identity.transactions.length > 0) {
            list.innerHTML = identity.transactions.slice(-10).reverse().map(t => `
                <li class="p-1 border-b border-gray-100 flex justify-between">
                    <span>${t.desc || t.source}</span>
                    <span class="${t.type === 'CREDIT' ? 'text-success' : 'text-danger'} font-bold">
                        ${t.type === 'CREDIT' ? '+' : '-'}₹${t.amount}
                    </span>
                </li>
            `).join('');
        } else {
            list.innerHTML = '<li class="p-1">No recent activity.</li>';
        }

        this.renderFeedback();

        // Motivation
        const motivation = store.getMotivation();
        const motBox = document.getElementById('motivation-box');
        if (motBox) motBox.textContent = motivation;
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
        navigator.clipboard.writeText(input.value);
        alert("Link Copied!");
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
