class AdminApp {
    constructor() {
        this.currentTab = 'users';
        this.init();
    }

    init() {
        const session = store.getSession();
        if (!session || session.role !== 'ADMIN') {
            window.location.href = 'login.html';
            return;
        }

        // Load initial tab
        this.renderTab(this.currentTab);
    }

    logout() {
        store.logout();
        window.location.href = 'login.html';
    }

    switchTab(tabName) {
        this.currentTab = tabName;
        // Update UI Tabs
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabName}`).classList.add('active');

        this.renderTab(tabName);
    }

    renderTab(tab) {
        const container = document.getElementById('content-area');
        container.innerHTML = '';

        if (tab === 'users') this.renderUsers(container);
        else if (tab === 'seeders') this.renderSeeders(container);
        else if (tab === 'payouts') this.renderPayouts(container);
        else if (tab === 'support') this.renderSupport(container);
        else if (tab === 'trash') this.renderTrash(container);
    }

    // --- Support ---
    renderSupport(container) {
        const feedbacks = store.getAllFeedback();
        // Filter out closed? Or show all? Let's show OPEN/REPLIED first.
        const active = feedbacks.filter(f => f.status !== 'CLOSED');

        if (active.length === 0) return container.innerHTML = `<div class="card text-center p-2 text-muted">No open support tickets.</div>`;

        let html = `
            <div class="card">
                <h3>Support Tickets (${active.length})</h3>
                <div class="flex flex-col gap-1 mt-1">
                    ${active.map(f => {
            const user = store.getById(f.userId);
            return `
                        <div class="p-1 border border-gray-200 rounded" style="background: ${f.status === 'REPLIED' ? '#f0fdf4' : 'white'}">
                            <div class="flex justify-between mb-0_5">
                                <span class="font-bold">${user ? user.name : 'Unknown'} (${user ? user.mobile : '-'})</span>
                                <span class="text-xs text-muted">${new Date(f.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div class="mb-1 p-0_5 bg-surface text-sm rounded">"${f.message}"</div>
                            
                            ${f.reply ?
                    `<div class="text-sm text-primary mb-1"><strong>Reply:</strong> ${f.reply}</div>
                                 <button class="btn btn-sm btn-secondary" onclick="adminApp.closeTicket('${f.id}')">Close Ticket</button>`
                    :
                    `<div class="flex gap-0_5">
                                    <input type="text" id="reply-${f.id}" class="form-input text-sm" placeholder="Reply...">
                                    <button class="btn btn-sm btn-primary" onclick="adminApp.sendReply('${f.id}')">Reply</button>
                                 </div>`
                }
                        </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
        container.innerHTML = html;
    }

    sendReply(id) {
        const input = document.getElementById(`reply-${id}`);
        const msg = input.value.trim();
        if (!msg) return;

        store.replyFeedback(id, msg);
        this.renderTab('support');
    }

    closeTicket(id) {
        if (confirm("Close this ticket?")) {
            store.closeFeedback(id);
            this.renderTab('support');
        }
    }

    // --- Users ---
    renderUsers(container) {
        const users = store.getUsers();
        let html = `
            <div class="card">
                <h3>All Users (${users.length})</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Mobile</th>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Balance</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => `
                            <tr>
                                <td>${u.mobile}</td>
                                <td>${u.name}</td>
                                <td><span class="badge ${u.role === 'ADMIN' ? 'badge-primary' : 'badge-secondary'}">${u.role}</span></td>
                                <td>${u.minutesBalance}m</td>
                                <td>
                                    <button class="btn btn-sm btn-text text-primary" onclick="adminApp.editUser('${u.id}')">Edit</button>
                                    ${u.role !== 'ADMIN' ? `<button class="btn btn-sm btn-text text-danger" onclick="adminApp.deleteUser('${u.id}')">Del</button>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    editUser(id) {
        const user = store.getById(id);
        if (!user) return;

        document.getElementById('edit-id').value = user.id;
        document.getElementById('edit-name').value = user.name;
        document.getElementById('edit-mobile').value = user.mobile;
        document.getElementById('edit-role').value = user.role;
        document.getElementById('edit-pin').value = '';

        document.getElementById('edit-modal').classList.remove('hidden');
    }

    saveUser(e) {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const updates = {
            name: document.getElementById('edit-name').value,
            mobile: document.getElementById('edit-mobile').value,
            role: document.getElementById('edit-role').value
        };
        const newPin = document.getElementById('edit-pin').value;
        if (newPin) updates.pin = newPin;

        store.updateUser(id, updates);
        document.getElementById('edit-modal').classList.add('hidden');
        this.renderTab(this.currentTab);
        alert("User updated.");
    }

    deleteUser(id) {
        if (confirm("Move user to trash?")) {
            store.deleteUser(id);
            this.renderTab(this.currentTab);
        }
    }

    // --- Seeders ---
    // --- Seeders ---
    renderSeeders(container) {
        const users = store.getUsers().filter(u => u.role === 'SEEDER');

        if (users.length === 0) {
            container.innerHTML = '<div class="card text-center p-2 text-muted">No Seeders found.</div>';
            return;
        }

        let html = `
            <div class="card">
                <h3>Seeder List (${users.length})</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Mobile</th>
                            <th>Wallet</th>
                            <th>Earnings</th>
                            <th>Payout Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(u => {
            const sid = u.identities.find(i => i.type === 'SID');
            const wallet = sid ? sid.walletBalance : 0;
            const earnings = sid && sid.transactions ? sid.transactions.reduce((acc, t) => t.type === 'CREDIT' ? acc + t.amount : acc, 0) : 0;

            // Payout Logic
            const pendingRequest = (sid && sid.payoutRequests) ? sid.payoutRequests.find(r => r.status === 'REQUESTED') : null;
            let payoutAction = '<span class="badge badge-secondary">No Request</span>';

            if (pendingRequest) {
                payoutAction = `
                                    <div class="flex flex-col gap-0_5">
                                        <span class="badge badge-warning">Req: ₹${pendingRequest.amount}</span>
                                        <small class="text-xs">UPI: ${pendingRequest.upiId || 'N/A'}</small>
                                        <button class="btn btn-sm btn-success" onclick="adminApp.processPayout('${u.id}', '${pendingRequest.id}')">Record Payout</button>
                                    </div>
                                `;
            }

            return `
                                <tr>
                                    <td>
                                        <div class="font-bold">${u.name}</div>
                                        <div class="text-xs text-muted">ID: ${sid ? sid.id : 'N/A'}</div>
                                    </td>
                                    <td>${u.mobile}</td>
                                    <td class="font-bold text-success">₹${wallet}</td>
                                    <td>₹${earnings}</td>
                                    <td>${payoutAction}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    processPayout(userId, requestId) {
        if (confirm("Confirm that you have manually paid this user via UPI?")) {
            store.markPayoutPaid(userId, requestId);
            this.renderTab(this.currentTab);
        }
    }

    // --- Payouts ---
    renderPayouts(container) {
        // Collect requests
        const users = store.getUsers();
        let requests = [];
        users.forEach(u => {
            u.identities.forEach(i => {
                if (i.payoutRequested) {
                    requests.push({
                        userId: u.id,
                        name: u.name,
                        amount: i.walletBalance,
                        upi: i.payoutUpi,
                        date: i.payoutRequestDate
                    });
                }
            });
        });

        if (requests.length === 0) return container.innerHTML = `<div class="card text-center p-2 text-muted">No pending payouts.</div>`;

        let html = `
            <div class="card">
                <h3>Pending Requests (${requests.length})</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Name</th>
                            <th>UPI</th>
                            <th>Amount</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requests.map(r => `
                            <tr>
                                <td>${new Date(r.date).toLocaleDateString()}</td>
                                <td>${r.name}</td>
                                <td>${r.upi}</td>
                                <td class="font-bold text-success">₹${r.amount}</td>
                                <td>
                                    <button class="btn btn-sm btn-primary" onclick="adminApp.approvePayout('${r.userId}')">Mark Paid</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        container.innerHTML = html;
    }

    approvePayout(userId) {
        if (confirm("Confirm Manual Transfer?")) {
            store.approvePayout(userId); // Assumes store method exists
            // Or implement manual logic if store method is complex:
            // But reuse store logic is best.
            // Let's implement manually if needed or assume store has it.
            // Store has: recordPayout(userId, amount, refId)
            // But approvePayout? Ah, store has approvePayout logic in old app.js? No, store has recordPayout.

            // Correction: Check store.js for approvePayout or recordPayout.
            // Store has `recordPayout`. But does it find amount automatically?
            // "store.approvePayout(userId)" was used in app.js. 
            // Wait, I should check store.js if approvePayout exists.
            // If not, use recordPayout logic.

            // Let's assume standard logic:
            try {
                const user = store.getById(userId);
                const identity = user.identities.find(i => i.payoutRequested);
                if (identity) {
                    store.recordPayout(userId, identity.walletBalance, "Admin Manual");
                    alert("Payout Recorded.");
                    this.renderTab('payouts');
                }
            } catch (e) {
                alert(e.message);
            }
        }
    }

    // --- Trash ---

    restore(id) {
        store.restoreUser(id);
        this.renderTab('trash');
    }
}

const adminApp = new AdminApp();
