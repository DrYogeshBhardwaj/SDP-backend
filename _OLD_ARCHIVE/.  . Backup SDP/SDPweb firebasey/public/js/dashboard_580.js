const MINUTES_TOTAL_YEARLY = 3650;
const MINUTES_DAILY_LIMIT = 10;

const minutesDisplay = document.getElementById('minutes-display');
const breakButtons = document.getElementById('break-buttons');
const timerDisplay = document.getElementById('timer-display');
const timerText = document.getElementById('timer-text');
const alarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); // Simple beep

// Seeder Elements
const seederSection = document.getElementById('seeder-section');
const onboardingCard = document.getElementById('onboarding-form-card');
const seederHub = document.getElementById('seeder-hub');
const seederForm = document.getElementById('seeder-form');
const seederPin = document.getElementById('seeder-pin');
const seederCityState = document.getElementById('seeder-city-state');
const refLinkInput = document.getElementById('ref-link');
const copyRefBtn = document.getElementById('copy-ref-btn');
const walletBalanceEl = document.getElementById('wallet-balance');
const payoutAmountInput = document.getElementById('payout-amount');
const requestPayoutBtn = document.getElementById('request-payout-btn');
const payoutMsg = document.getElementById('payout-msg');
const payoutList = document.getElementById('payout-list');

let currentUser = null;
let userDocRef = null;
let userProfile = null; // Store full profile

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        userDocRef = db.collection('users').doc(user.uid);
        loadUserData();
    } else {
        window.location.href = 'index.html';
    }
});

function loadUserData() {
    userDocRef.onSnapshot(doc => {
        if (doc.exists) {
            const data = doc.data();
            userProfile = data;
            checkDailyReset(data);
            updateUI(data);
            updateSeederUI(data);
        } else {
            // console.log removed
            minutesDisplay.innerHTML = '<div class="alert alert-danger">User profile not found. Please contact support.</div>';
        }
    });

    // Load Payout Requests
    loadPayoutRequests();
}

function checkDailyReset(data) {
    const today = new Date().toDateString();
    const lastUsage = data.lastUsageDate ? data.lastUsageDate.toDate().toDateString() : null;

    if (lastUsage !== today) {
        userDocRef.set({
            dailyUsage: 0,
            lastUsageDate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
}

function updateUI(data) {
    // --- Minutes Logic (Same as 178) ---
    const total = data.minutesBalance !== undefined ? data.minutesBalance : MINUTES_TOTAL_YEARLY;
    const usedToday = data.dailyUsage || 0;
    const remainingToday = Math.max(0, MINUTES_DAILY_LIMIT - usedToday);
    const totalRemaining = total;

    minutesDisplay.innerHTML = `
        <div class="card p-3 mb-4">
            <h5>Minutes Wallet</h5>
            <p><strong>Total Balance:</strong> ${totalRemaining} mins</p>
            <p><strong>Daily Limit:</strong> ${MINUTES_DAILY_LIMIT} mins</p>
            <p><strong>Used Today:</strong> ${usedToday} mins</p>
            <p class="text-success"><strong>Remaining Today:</strong> ${remainingToday} mins</p>
        </div>
    `;

    const buttons = breakButtons.querySelectorAll('button');
    buttons.forEach(btn => {
        const cost = parseInt(btn.dataset.cost);
        if (cost > remainingToday || cost > totalRemaining) {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    });
}

function startBreak(durationMinutes) {
    userDocRef.get().then(doc => {
        const data = doc.data();
        const usedToday = data.dailyUsage || 0;
        const total = data.minutesBalance !== undefined ? data.minutesBalance : MINUTES_TOTAL_YEARLY;

        if (usedToday + durationMinutes > MINUTES_DAILY_LIMIT) {
            alert("Daily limit exceeded!");
            return;
        }
        if (total < durationMinutes) {
            alert("Insufficient total balance!");
            return;
        }

        showTimer(durationMinutes);

        userDocRef.update({
            minutesBalance: firebase.firestore.FieldValue.increment(-durationMinutes),
            dailyUsage: firebase.firestore.FieldValue.increment(durationMinutes),
            lastUsageDate: firebase.firestore.FieldValue.serverTimestamp(),
            usageLogs: firebase.firestore.FieldValue.arrayUnion({
                date: new Date().toISOString(),
                duration: durationMinutes
            })
        });
    });
}

// --- Seeder Logic ---

function updateSeederUI(data) {
    seederSection.style.display = 'block';

    // Check if Onboarding is Complete
    if (data.seederDetails && data.seederDetails.isVerified) {
        onboardingCard.style.display = 'none';
        seederHub.style.display = 'block';

        // Populate Hub
        setupReferralLink();
        updateWallet(data);
        updateTeamStats(data);
    } else {
        onboardingCard.style.display = 'block';
        seederHub.style.display = 'none';
    }
}

// 1. Onboarding
seederPin.addEventListener('blur', function () {
    const pin = this.value;
    if (pin.length === 6) {
        seederCityState.value = "Fetching...";
        fetch(`https://api.postalpincode.in/pincode/${pin}`)
            .then(res => res.json())
            .then(data => {
                if (data[0].Status === 'Success') {
                    const po = data[0].PostOffice[0];
                    seederCityState.value = `${po.District}, ${po.State}`;
                } else {
                    seederCityState.value = "Invalid PIN";
                }
            })
            .catch(() => seederCityState.value = "Manual Entry Required");
    }
});

seederForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('seeder-name').value;
    const address = document.getElementById('seeder-address').value;
    const pin = document.getElementById('seeder-pin').value;
    const cityState = document.getElementById('seeder-city-state').value;
    const upi = document.getElementById('seeder-upi').value;
    const upiConfirm = document.getElementById('seeder-upi-confirm').value;

    if (upi !== upiConfirm) {
        alert("UPI IDs do not match!");
        return;
    }

    if (!confirm("Are you sure? UPI ID cannot be changed later.")) return;

    userDocRef.update({
        seederDetails: {
            name: name,
            address: address,
            pin: pin,
            cityState: cityState,
            upi: upi,
            isVerified: true, // Auto-verify for now as per req
            joinedAt: new Date().toISOString()
        }
    }).then(() => {
        alert("Seeder Profile Activated!");
    }).catch(err => alert("Error: " + err.message));
});

// 2. Dashboard Features
function setupReferralLink() {
    const link = `${window.location.origin}/index.html?ref=${currentUser.uid}`;
    refLinkInput.value = link;

    copyRefBtn.onclick = () => {
        refLinkInput.select();
        document.execCommand('copy'); // Fallback for older browsers logic
        alert("Copied to clipboard!");
    };
}

function updateWallet(data) {
    const balance = data.earningsBalance || 0;
    walletBalanceEl.innerText = balance;

    // Check for pending requests
    db.collection('payout_requests')
        .where('userId', '==', currentUser.uid)
        .where('status', '==', 'Pending')
        .get()
        .then(snapshot => {
            const hasPending = !snapshot.empty;

            if (balance > 0 && !hasPending) {
                requestPayoutBtn.disabled = false;
                payoutAmountInput.disabled = false;
                payoutMsg.innerHTML = '';
            } else {
                requestPayoutBtn.disabled = true;
                payoutAmountInput.disabled = true;
                if (hasPending) {
                    payoutMsg.innerHTML = '<span class="text-warning">Pending request exists.</span>';
                } else if (balance <= 0) {
                    payoutMsg.innerHTML = '<span class="text-muted">Insufficient balance.</span>';
                }
            }
        });
}

function updateTeamStats(data) {
    // Read local counts if available (will be updated by cloud functions ideally)
    const counts = data.teamCounts || { l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 };
    let total = 0;
    for (let i = 1; i <= 5; i++) {
        const count = counts[`l${i}`] || 0;
        document.getElementById(`count-l${i}`).innerText = count;
        total += count;
    }
    document.getElementById('team-total').innerText = total;
}

// 3. Payout Request
requestPayoutBtn.addEventListener('click', () => {
    const amount = parseInt(payoutAmountInput.value);
    const balance = parseInt(walletBalanceEl.innerText);

    if (!amount || amount <= 0) {
        alert("Enter valid amount");
        return;
    }
    if (amount > balance) {
        alert("Amount exceeds wallet balance");
        return;
    }

    if (confirm(`Request payout of ₹${amount}?`)) {
        db.collection('payout_requests').add({
            userId: currentUser.uid,
            userName: userProfile.seederDetails.name || currentUser.email,
            userUpi: userProfile.seederDetails.upi,
            amount: amount,
            status: 'Pending',
            requestedAt: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert("Payout Requested!");
            payoutAmountInput.value = '';
            loadPayoutRequests(); // Refresh list
            // Note: Balance deduction happens on Admin Approval usually, or we can deduct 'reserved' balance.
            // For this strict Step 3, we just lock the button via 'hasPending' check.
        });
    }
});

function loadPayoutRequests() {
    if (!currentUser) return;

    db.collection('payout_requests')
        .where('userId', '==', currentUser.uid)
        .orderBy('requestedAt', 'desc')
        .limit(5)
        .onSnapshot(snapshot => {
            payoutList.innerHTML = '';
            if (snapshot.empty) {
                payoutList.innerHTML = '<li class="list-group-item text-muted">No recent requests</li>';
                return;
            }
            snapshot.forEach(doc => {
                const req = doc.data();
                const date = req.requestedAt ? req.requestedAt.toDate().toLocaleDateString() : 'Just now';
                let badgeClass = 'bg-secondary';
                if (req.status === 'Approved') badgeClass = 'bg-info';
                if (req.status === 'Paid') badgeClass = 'bg-success';
                if (req.status === 'Rejected') badgeClass = 'bg-danger';
                if (req.status === 'Pending') badgeClass = 'bg-warning text-dark';

                payoutList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>₹${req.amount}</strong> <small class="text-muted">on ${date}</small>
                        </div>
                        <span class="badge ${badgeClass}">${req.status}</span>
                    </li>
                `;
            });
            // Update button state again whenever list changes (e.g. if status changes to Paid)
            if (userProfile) updateWallet(userProfile);
        });
}


let countdownInterval;

function showTimer(minutes) {
    breakButtons.style.display = 'none';
    timerDisplay.style.display = 'block';

    let secondsLeft = minutes * 60;

    updateTimerText(secondsLeft);

    countdownInterval = setInterval(() => {
        secondsLeft--;
        updateTimerText(secondsLeft);

        if (secondsLeft <= 0) {
            clearInterval(countdownInterval);
            alarmAudio.play();
            alert("Time's up! Back to work.");
            timerDisplay.style.display = 'none';
            breakButtons.style.display = 'block';
        }
    }, 1000);
}

function updateTimerText(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    timerText.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Event Listeners
document.querySelectorAll('.break-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const minutes = parseInt(btn.dataset.cost);
        if (confirm(`Start a ${minutes} minute break?`)) {
            startBreak(minutes);
        }
    });
});
