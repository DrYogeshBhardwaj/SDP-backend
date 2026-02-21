// assets/js/admin.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect the page ensuring only ADMIN can access
    const user = await Auth.protectPage('ADMIN');
    if (!user) return;

    // Setup Tab Navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update buttons
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            e.target.classList.remove('btn-secondary');
            e.target.classList.add('btn-primary');

            // Show target section
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Load data based on selected tab
            loadDataForSection(targetId);
        });
    });

    // Handle Announcement submit
    document.getElementById('announcement-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = document.getElementById('announcement-text').value;
        try {
            await ApiClient.post('/admin/announcements', { message: text });
            document.getElementById('announcement-text').value = '';
            showSuccess('Announcement published!');
            loadAnnouncements();
        } catch (err) {
            showError('Failed to publish announcement.');
        }
    });

    // Initial Load
    loadDataForSection('users-section');
});

function loadDataForSection(sectionId) {
    switch (sectionId) {
        case 'users-section': loadUsers(); break;
        case 'payouts-section': loadPayouts(); break;
        case 'ledger-section': loadLedger(); break;
        case 'announcements-section': loadAnnouncements(); break;
        // export section has static buttons triggering window.open
    }
}

async function loadUsers() {
    try {
        const res = await ApiClient.get('/admin/users');
        const users = res.data || res.users || [];
        const tbody = document.getElementById('users-table-body');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.mobile}</td>
                <td>${u.role}</td>
                <td><span style="color: ${u.status === 'ACTIVE' ? 'var(--success-color)' : 'var(--text-secondary)'}">${u.status || 'UNVERIFIED'}</span></td>
                <td>₹${u.walletBalance || 0}</td>
                <td>
                    ${u.status !== 'SUSPENDED' ?
                `<button class="action-btn" style="background: var(--danger-color);" onclick="updateUserStatus('${u.id}', 'SUSPENDED')">Suspend</button>` :
                `<button class="action-btn" style="background: var(--success-color);" onclick="updateUserStatus('${u.id}', 'ACTIVE')">Activate</button>`
            }
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load users.');
    }
}

// Ensure global access for inline onclick handlers
window.updateUserStatus = async function (userId, status) {
    try {
        await ApiClient.put(`/admin/users/${userId}/status`, { status });
        showSuccess('User status updated');
        loadUsers();
    } catch (err) {
        showError('Action failed.');
    }
};

async function loadPayouts() {
    try {
        const res = await ApiClient.get('/finance/payout/admin/list?status=PENDING');
        const payouts = res.data || res.payouts || [];
        const tbody = document.getElementById('payouts-table-body');

        if (payouts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">No pending payouts.</td></tr>';
            return;
        }

        tbody.innerHTML = payouts.map(p => `
            <tr>
                <td>${p.user?.mobile || 'Unknown'}</td>
                <td>₹${p.amount}</td>
                <td>${new Date(p.createdAt).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" style="background: var(--success-color);" onclick="processPayout('${p.id}', 'APPROVED')">Approve</button>
                    <button class="action-btn" style="background: var(--danger-color);" onclick="processPayout('${p.id}', 'REJECTED')">Reject</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load payouts.');
    }
}

window.processPayout = async function (payoutId, action) {
    if (!confirm(`Are you sure you want to ${action} this payout?`)) return;
    try {
        await ApiClient.post(`/finance/payout/admin/${payoutId}/process`, { action });
        showSuccess(`Payout ${action.toLowerCase()} successfully`);
        loadPayouts();
    } catch (err) {
        showError('Failed to process payout.');
    }
};

async function loadLedger() {
    try {
        const res = await ApiClient.get('/admin/expense/ledger');
        const records = res.data?.records || res.records || [];
        const total = res.data?.totalLiability || res.totalLiability || 0;

        document.getElementById('ledger-total').textContent = `₹${total}`;

        const tbody = document.getElementById('ledger-table-body');
        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center">Ledger is empty.</td></tr>';
            return;
        }

        tbody.innerHTML = records.map(r => `
            <tr>
                <td>${new Date(r.createdAt).toLocaleDateString()}</td>
                <td>${r.type}</td>
                <td>₹${r.amount}</td>
                <td>${r.description || '-'}</td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load ledger.');
    }
}

async function loadAnnouncements() {
    try {
        const res = await ApiClient.get('/admin/announcements');
        const data = res.data || res.announcements || [];
        const tbody = document.getElementById('announcements-table-body');

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No announcements published.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(a => `
            <tr>
                <td>${new Date(a.createdAt).toLocaleDateString()}</td>
                <td>${a.message}</td>
                <td><span style="color: var(--success-color)">Active</span></td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load announcements.');
    }
}

window.triggerExport = function (type) {
    // Rely on the auth cookie implicitly passed when opening identical origin 
    // or handled by backend auth middleware logic if structured for GET.
    window.open(`${CONFIG.API_BASE_URL}/admin/export/${type}`, '_blank');
};

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}
function showSuccess(msg) {
    const successDiv = document.getElementById('success-message');
    successDiv.textContent = msg;
    successDiv.classList.add('show');
    setTimeout(() => successDiv.classList.remove('show'), 4000);
}
