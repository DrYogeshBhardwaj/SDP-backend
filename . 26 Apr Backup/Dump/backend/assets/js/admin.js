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
    fetchSystemAlerts();
    loadDataForSection('users-section');
    setInterval(fetchSystemAlerts, 60000); // Update badges every minute
});

async function fetchSystemAlerts() {
    try {
        const res = await ApiClient.get('/admin/system/stats');
        const stats = res.data || res.stats || {};

        const payoutNav = document.querySelector('[data-target="payouts-section"]');
        if (payoutNav) {
            payoutNav.innerHTML = `Payouts 💰 ${stats.pending_payout_count > 0 ? `<span style="background:red;color:white;border-radius:50%;padding:2px 6px;font-size:0.75rem;margin-left:4px;">${stats.pending_payout_count}</span>` : ''}`;
        }
        const supportNav = document.querySelector('[data-target="support-section"]');
        if (supportNav) {
            supportNav.innerHTML = `Feedback/Support 💬 ${stats.unread_messages_count > 0 ? `<span style="background:red;color:white;border-radius:50%;padding:2px 6px;font-size:0.75rem;margin-left:4px;">${stats.unread_messages_count}</span>` : ''}`;
        }
    } catch (e) {
        // fail silently for background polling
    }
}

function loadDataForSection(sectionId) {
    switch (sectionId) {
        case 'users-section': loadUsers(); break;
        case 'payouts-section': loadPayouts(); break;
        case 'ledger-section': loadLedger(); break;
        case 'support-section': loadInbox(); break;
        case 'trash-section': loadTrashedUsers(); break;
        // export section has static buttons triggering window.open
    }
}

async function loadInbox() {
    try {
        const tbody = document.querySelector('#support-section tbody');
        if (!tbody) return;

        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Loading messages...</td></tr>';
        const res = await ApiClient.get('/messages/admin/inbox');
        const inbox = res.data?.inbox || res.inbox || [];

        if (inbox.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center italic opacity-50">No support tickets found.</td></tr>';
            return;
        }

        tbody.innerHTML = inbox.map(c => `
            <tr>
                <td>
                    <b>${c.user?.mobile || 'Unknown'}</b><br>
                    <small>${c.user?.name || ''}</small>
                </td>
                <td>
                    ${c.unreadCount > 0 ? `<span style="background:red;color:white;border-radius:4px;padding:2px 4px;font-size:0.75rem;">${c.unreadCount} New</span><br>` : ''}
                    <small style="color:var(--text-secondary)">${c.lastMessage?.substring(0, 40) || ''}...</small>
                </td>
                <td>
                    <button class="action-btn" style="background: var(--primary-color);" onclick="replyToUser('${c.user?.id}', '${c.user?.mobile}')">Chat / Reply</button>
                </td>
            </tr>
        `).join('');

        // also update system alerts since we read the inbox
        fetchSystemAlerts();
    } catch (err) {
        showError('Failed to load support inbox.');
    }
}

window.closeChatModal = function () {
    const modal = document.getElementById('chat-modal');
    if (modal) modal.style.display = 'none';
    clearInterval(window.chatPollInterval);
    loadInbox();
};

window.replyToUser = async function (userId, mobile) {
    const modal = document.getElementById('chat-modal');
    if (!modal) return;

    document.getElementById('chat-modal-mobile').textContent = mobile;
    document.getElementById('chat-modal-userid').value = userId;
    modal.style.display = 'flex';

    await fetchAdminChat(userId);

    // Auto-refresh chat while modal is open
    if (window.chatPollInterval) clearInterval(window.chatPollInterval);
    window.chatPollInterval = setInterval(() => fetchAdminChat(userId), 5000);
};

async function fetchAdminChat(userId) {
    try {
        const res = await ApiClient.get(`/messages/${userId}`);
        const messages = res.data?.messages || res.messages || [];
        const msgContainer = document.getElementById('chat-modal-messages');

        if (messages.length === 0) {
            msgContainer.innerHTML = '<p class="text-center text-sm text-secondary">No messages yet.</p>';
            return;
        }

        msgContainer.innerHTML = messages.reverse().map(m => {
            // In admin context, senderId == adminId means it's 'me'. We can check by role rather than ID.
            const isMe = m.sender?.role === 'ADMIN';

            // Auto-read
            if (!isMe && m.status === 'UNREAD') {
                ApiClient.put(`/messages/${m.id}/read`).catch(console.warn);
            }

            return `
                <div style="margin-bottom: 8px; text-align: ${isMe ? 'right' : 'left'};">
                    <span style="display:inline-block; padding: 6px 10px; border-radius: 8px; background: ${isMe ? 'var(--primary-color)' : '#e2e8f0'}; color: ${isMe ? 'white' : 'black'}; text-align: left; max-width: 80%;">
                        ${m.content}
                    </span>
                    <div style="font-size: 0.7rem; color: gray; margin-top: 2px;">
                        ${new Date(m.createdAt).toLocaleString()} ${m.status === 'READ' && isMe ? '✓✓' : ''}
                    </div>
                </div>
            `;
        }).join('');
        msgContainer.scrollTop = msgContainer.scrollHeight;
    } catch (err) {
        console.error('Failed to load chat', err);
    }
}

// Attach event listener once to form
document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-modal-form');
    if (chatForm) {
        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('chat-modal-input');
            const userId = document.getElementById('chat-modal-userid').value;
            const text = input.value.trim();
            if (!text || !userId) return;

            input.disabled = true;
            try {
                await ApiClient.post('/messages', { receiverId: userId, content: text });
                input.value = '';
                await fetchAdminChat(userId);
            } catch (err) {
                showError('Failed to send message.');
            } finally {
                input.disabled = false;
                input.focus();
            }
        });
    }
});

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
                    <div style="display:flex; gap:0.5rem; flex-wrap:wrap">
                        ${u.status !== 'BLOCKED' && u.status !== 'SUSPENDED' ?
                `<button class="action-btn" style="background: var(--danger-color);" onclick="updateUserStatus('${u.id}', 'BLOCKED')">Suspend</button>` :
                `<button class="action-btn" style="background: var(--success-color);" onclick="updateUserStatus('${u.id}', 'ACTIVE')">Activate</button>`
            }
                        <button class="action-btn" style="background: #3b82f6;" onclick="editUser('${u.id}', '${u.name || ''}')">Edit</button>
                        <button class="action-btn" style="background: #eab308; color:#000;" onclick="resetPin('${u.id}')">Reset PIN</button>
                        <button class="action-btn" style="background: var(--accent);" onclick="viewUserDetails('${u.id}')">Info</button>
                        <button class="action-btn" style="background: #1e293b;" onclick="trashUser('${u.id}')">Trash</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load users.');
    }
}

window.closeUserDetailsModal = function () {
    const modal = document.getElementById('user-details-modal');
    if (modal) modal.style.display = 'none';
};

window.viewUserDetails = async function (userId) {
    try {
        const modal = document.getElementById('user-details-modal');
        if (!modal) return;
        
        // Show modal with loading state
        document.getElementById('detail-mobile').textContent = "Loading...";
        document.getElementById('detail-ledger-body').innerHTML = '<tr><td colspan="4" class="text-center italic opacity-50">Loading ledger...</td></tr>';
        modal.style.display = 'flex';

        const res = await ApiClient.get(`/admin/users/${userId}/details`);
        const details = res.data || res.details; // Ensure compatibility with successResponse structure

        if (!details) throw new Error("No data returned");

        // Populate basic mapping
        document.getElementById('detail-mobile').textContent = details.info.mobile + (details.info.name ? ` (${details.info.name})` : '');
        document.getElementById('detail-role').textContent = details.info.role;
        document.getElementById('detail-status').textContent = details.info.status;
        document.getElementById('detail-wallet').textContent = details.wallet;
        document.getElementById('detail-l1').textContent = details.network.level1;
        document.getElementById('detail-l2').textContent = details.network.level2;

        // Populate Ledger
        const tbody = document.getElementById('detail-ledger-body');
        if (details.recentBonuses && details.recentBonuses.length > 0) {
            tbody.innerHTML = details.recentBonuses.map(b => `
                <tr>
                    <td class="text-sm">${new Date(b.date).toLocaleDateString()}</td>
                    <td class="text-sm font-bold">${b.type}</td>
                    <td class="text-sm text-secondary">${b.sourceMobile}</td>
                    <td class="text-sm font-bold text-success">₹${b.amount}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center italic opacity-50">No bonuses found</td></tr>';
        }

    } catch (err) {
        console.error("View Details Error:", err);
        showError('Failed to fetch user details.');
        closeUserDetailsModal();
    }
};

// Ensure global access for inline onclick handlers
window.updateUserStatus = async function (userId, status) {
    try {
        const route = status === 'SUSPENDED' || status === 'BLOCKED' ? `/admin/users/${userId}/block` : `/admin/users/${userId}/unblock`;
        await ApiClient.post(route, {});
        showSuccess('User status updated');
        loadUsers();
    } catch (err) {
        showError('Action failed.');
    }
};

window.resetPin = async function (userId) {
    if (!confirm('Are you sure you want to reset this users PIN to 1234?')) return;
    try {
        await ApiClient.post(`/admin/users/${userId}/reset-pin`, {});
        showSuccess('PIN successfully reset to 1234');
    } catch (err) {
        showError('Failed to reset PIN.');
    }
};

window.editUser = async function (userId, currentName) {
    const newName = prompt('Enter new name for the user:', currentName || '');
    if (newName === null) return;
    try {
        await ApiClient.put(`/admin/users/${userId}`, { name: newName });
        showSuccess('User updated successfully.');
        loadUsers();
    } catch (err) {
        showError('Failed to update user.');
    }
};

window.trashUser = async function (userId) {
    if (!confirm('Are you sure you want to move this user to Trash? They will lose access immediately.')) return;
    try {
        await ApiClient.delete(`/admin/users/${userId}/trash`);
        showSuccess('User moved to trash successfully.');
        loadUsers();
    } catch (err) {
        showError('Failed to trash user.');
    }
};

async function loadTrashedUsers() {
    try {
        const res = await ApiClient.get('/admin/users/trash');
        const users = res.data || res.users || [];
        const tbody = document.querySelector('#trash-section tbody');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-center italic opacity-50">Trash is empty.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(u => `
            <tr>
                <td><span style="color:var(--danger-color)">${u.mobile}</span></td>
                <td>${u.role}</td>
                <td>
                    <button class="action-btn" style="background: var(--success-color);" onclick="restoreUser('${u.id}')">Restore</button>
                    <button class="action-btn" style="background: var(--danger-color);" onclick="purgeUser('${u.id}')">Purge</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showError('Failed to load trashed users.');
    }
}

window.restoreUser = async function (userId) {
    if (!confirm('Are you sure you want to RESTORE this user? They will regain access.')) return;
    try {
        await ApiClient.post(`/admin/users/${userId}/restore`);
        showSuccess('User restored successfully.');
        loadTrashedUsers();
        loadUsers();
    } catch (err) {
        showError(err.message || 'Failed to restore user.');
    }
};

window.purgeUser = async function (userId) {
    if (!confirm('WARNING: Are you sure you want to PERMANENTLY PURGE this user? This action cannot be undone and will delete all their data.')) return;
    if (!confirm('FINAL WARNING: Type OK to proceed.') && prompt('Type PURGE to confirm') !== 'PURGE') return;
    try {
        await ApiClient.delete(`/admin/users/${userId}/purge`);
        showSuccess('User permanently deleted.');
        loadTrashedUsers();
    } catch (err) {
        showError(err.message || 'Failed to purge user.');
    }
};

async function loadPayouts() {
    try {
        const res = await ApiClient.get('/admin/finance/payouts');
        const payouts = res.data || res.payouts || [];
        const tbody = document.getElementById('payouts-table-body');

        if (payouts.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No pending payouts.</td></tr>';
            return;
        }

        tbody.innerHTML = payouts.map(p => `
            <tr>
                <td>
                    ${p.user?.mobile || 'Unknown'}<br>
                    <small style="color:var(--text-secondary)">${p.user?.name || ''}</small>
                </td>
                <td><strong style="color:var(--primary-color)">${p.user?.upi_id || 'Not Provided'}</strong></td>
                <td>₹${p.amount}</td>
                <td>${new Date(p.requested_at || p.createdAt || Date.now()).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn" style="background: var(--success-color);" onclick="processPayout('${p.id}', 'approve')">Approve</button>
                    <button class="action-btn" style="background: var(--danger-color);" onclick="processPayout('${p.id}', 'reject')">Reject</button>
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
        let body = {};
        if (action === 'reject') {
            const remarks = prompt('Reason for rejection:');
            if (remarks === null) return; // User cancelled
            body.remarks = remarks || 'Rejected by Admin';
        } else {
            // optional remarks for approval
            body.remarks = 'Approved and Paid out successfully';
        }
        await ApiClient.post(`/admin/finance/payouts/${payoutId}/${action}`, body);
        showSuccess(`Payout ${action}d successfully`);
        loadPayouts();
    } catch (err) {
        showError(err.message || 'Failed to process payout.');
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
