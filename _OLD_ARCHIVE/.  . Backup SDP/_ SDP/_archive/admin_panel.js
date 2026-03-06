// DOM Elements
const payoutsTableBody = document.getElementById('payouts-table-body');
const usersTableBody = document.getElementById('users-table-body');
const roleFilter = document.getElementById('role-filter');

// Modals
const payoutModal = new bootstrap.Modal(document.getElementById('payoutModal'));
const userModal = new bootstrap.Modal(document.getElementById('userModal'));

let currentPayoutId = null;
let currentPayoutUserId = null;
let currentPayoutAmount = 0;
let currentUserInModal = null;

// Auth Check
auth.onAuthStateChanged(user => {
    if (user) {
        // Double check admin role
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().role === 'admin') {
                loadPayouts();
                loadUsers();
            } else {
                window.location.href = 'index.html';
            }
        });
    } else {
        window.location.href = 'index.html';
    }
});

// --- Payout Logic ---

function loadPayouts() {
    payoutsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    db.collection('payout_requests')
        .orderBy('requestedAt', 'desc')
        .limit(50)
        .get()
        .then(snapshot => {
            payoutsTableBody.innerHTML = '';
            if (snapshot.empty) {
                payoutsTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No requests found</td></tr>';
                return;
            }

            snapshot.forEach(doc => {
                const req = doc.data();
                const reqId = doc.id;
                const date = req.requestedAt ? req.requestedAt.toDate().toLocaleString() : 'N/A';

                let badgeClass = 'bg-secondary';
                if (req.status === 'Approved') badgeClass = 'bg-info';
                if (req.status === 'Paid') badgeClass = 'bg-success';
                if (req.status === 'Rejected') badgeClass = 'bg-danger';
                if (req.status === 'Pending') badgeClass = 'bg-warning text-dark';

                // Disable action button if already paid/rejected final states? 
                // User said "Once Paid, request becomes read-only forever".
                const isReadOnly = (req.status === 'Paid');
                const actionBtn = isReadOnly
                    ? `<span class="text-muted">Closed</span>`
                    : `<button class="btn btn-sm btn-primary" onclick="openPayoutModal('${reqId}', '${req.userId}', ${req.amount}, '${req.userUpi}', '${req.userName}')">Manage</button>`;

                payoutsTableBody.innerHTML += `
                    <tr>
                        <td>${date}</td>
                        <td>${req.userName}<br><small class="text-muted">${req.userId.substring(0, 6)}...</small></td>
                        <td><span class="text-info">${req.userUpi}</span></td>
                        <td>₹${req.amount}</td>
                        <td><span class="badge ${badgeClass}">${req.status}</span></td>
                        <td>${actionBtn}</td>
                    </tr>
                `;
            });
        });
}

window.openPayoutModal = function (reqId, userId, amount, upi, name) {
    currentPayoutId = reqId;
    currentPayoutUserId = userId;
    currentPayoutAmount = amount;

    document.getElementById('modal-payout-user').innerText = name;
    document.getElementById('modal-payout-amount').innerText = amount;
    document.getElementById('modal-payout-upi').innerText = upi;
    document.getElementById('modal-payout-remark').value = '';

    payoutModal.show();
};

document.getElementById('modal-payout-confirm-btn').addEventListener('click', () => {
    const status = document.getElementById('modal-payout-action').value;
    const remark = document.getElementById('modal-payout-remark').value;

    if (!currentPayoutId) return;

    if (!confirm(`Confirm marking this request as ${status}?`)) return;

    const batch = db.batch();
    const reqRef = db.collection('payout_requests').doc(currentPayoutId);

    // Update Request
    batch.update(reqRef, {
        status: status,
        adminRemark: remark,
        adminActionAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // If Paid, Deduct Wallet
    if (status === 'Paid') {
        const userRef = db.collection('users').doc(currentPayoutUserId);
        batch.update(userRef, {
            earningsBalance: firebase.firestore.FieldValue.increment(-currentPayoutAmount)
        });
    }

    batch.commit().then(() => {
        alert("Status Updated Successfully!");
        payoutModal.hide();
        loadPayouts();
    }).catch(err => alert("Error: " + err.message));
});


// --- User Management Logic ---

window.loadUsers = function () {
    const role = roleFilter.value;
    usersTableBody.innerHTML = '<tr><td colspan="6" class="text-center">Loading...</td></tr>';

    let query = db.collection('users').orderBy('createdAt', 'desc').limit(50);

    if (role !== 'all') {
        query = query.where('role', '==', role);
    }

    query.get().then(snapshot => {
        usersTableBody.innerHTML = '';
        if (snapshot.empty) {
            usersTableBody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
            return;
        }

        snapshot.forEach(doc => {
            const u = doc.data();
            const date = u.createdAt ? u.createdAt.toDate().toLocaleDateString() : 'N/A';
            const name = (u.seederDetails && u.seederDetails.name) ? u.seederDetails.name : (u.email || 'No Email');
            const wallet = u.earningsBalance || 0;
            const isBlocked = u.isBlocked || false;

            const blockBtn = isBlocked
                ? `<button class="btn btn-sm btn-success" onclick="toggleBlock('${doc.id}', false)">Unblock</button>`
                : `<button class="btn btn-sm btn-danger" onclick="toggleBlock('${doc.id}', true)">Block</button>`;

            const detailBtn = (u.role === 'buyer580')
                ? `<button class="btn btn-sm btn-info" onclick="viewUserDetails('${doc.id}')">View</button>`
                : '';

            usersTableBody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${name}</td>
                    <td>${u.role}</td>
                    <td>₹${wallet}</td>
                    <td>${isBlocked ? '<span class="badge bg-danger">BLOCKED</span>' : '<span class="badge bg-success">Active</span>'}</td>
                    <td>
                        ${blockBtn}
                        ${detailBtn}
                    </td>
                </tr>
            `;
        });
    }).catch(err => {
        // console.log removed
        usersTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    });
};

window.toggleBlock = function (uid, shouldBlock) {
    if (!confirm(`Are you sure you want to ${shouldBlock ? 'BLOCK' : 'UNBLOCK'} this user?`)) return;

    db.collection('users').doc(uid).update({
        isBlocked: shouldBlock
    }).then(() => {
        loadUsers(); // Refresh
    }).catch(err => alert("Error: " + err.message));
};

window.viewUserDetails = function (uid) {
    currentUserInModal = uid;
    const content = document.getElementById('user-details-content');
    content.innerHTML = 'Loading...';
    userModal.show();

    db.collection('users').doc(uid).get().then(doc => {
        if (!doc.exists) return;
        const data = doc.data();
        const s = data.seederDetails || {};
        const team = data.teamCounts || {};

        document.getElementById('admin-edit-upi').value = s.upi || '';

        content.innerHTML = `
            <p><strong>Name:</strong> ${s.name || 'N/A'}</p>
            <p><strong>Address:</strong> ${s.address || 'N/A'}</p>
            <p><strong>PIN/City:</strong> ${s.pin || ''} ${s.cityState || ''}</p>
            <p><strong>Earnings Balance:</strong> ₹${data.earningsBalance || 0}</p>
            <p><strong>Team Size:</strong> ${team.l1 || 0} (L1) / ${team.l2 || 0} (L2)</p>
            <div class="alert alert-secondary">
                <strong>Raw UPI:</strong> ${s.upi || 'None'}
            </div>
        `;
    });
};

document.getElementById('admin-save-upi-btn').addEventListener('click', () => {
    const newUpi = document.getElementById('admin-edit-upi').value;
    if (!currentUserInModal) return;

    db.collection('users').doc(currentUserInModal).update({
        'seederDetails.upi': newUpi
    }).then(() => {
        alert("UPI Updated");
        viewUserDetails(currentUserInModal); // Refresh modal
    });
});
