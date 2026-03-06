const MINUTES_TOTAL_YEARLY = 3650;
const MINUTES_DAILY_LIMIT = 10;

const minutesDisplay = document.getElementById('minutes-display');
const breakButtons = document.getElementById('break-buttons');
const timerDisplay = document.getElementById('timer-display');
const timerText = document.getElementById('timer-text');
const alarmAudio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'); // Simple beep

let currentUser = null;
let userDocRef = null;

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
            checkDailyReset(data);
            updateUI(data);
        } else {
            // console.log removed
            minutesDisplay.innerHTML = '<div class="alert alert-danger">User profile not found. Please contact support.</div>';
        }
    });
}

function checkDailyReset(data) {
    const today = new Date().toDateString();
    const lastUsage = data.lastUsageDate ? data.lastUsageDate.toDate().toDateString() : null;

    if (lastUsage !== today) {
        // Reset daily usage if new day
        userDocRef.set({
            dailyUsage: 0,
            lastUsageDate: firebase.firestore.FieldValue.serverTimestamp() // Update to now
            // Don't change minutesBalance here, strictly decrement on use
        }, { merge: true });
    }
}

function updateUI(data) {
    const total = data.minutesBalance !== undefined ? data.minutesBalance : MINUTES_TOTAL_YEARLY;
    const usedToday = data.dailyUsage || 0;
    const remainingToday = Math.max(0, MINUTES_DAILY_LIMIT - usedToday);
    const totalRemaining = total; // Assuming total decrements on use

    minutesDisplay.innerHTML = `
        <div class="card p-3 mb-4">
            <h5>Minutes Wallet</h5>
            <p><strong>Total Balance:</strong> ${totalRemaining} mins</p>
            <p><strong>Daily Limit:</strong> ${MINUTES_DAILY_LIMIT} mins</p>
            <p><strong>Used Today:</strong> ${usedToday} mins</p>
            <p class="text-success"><strong>Remaining Today:</strong> ${remainingToday} mins</p>
        </div>
    `;

    // Disable buttons if not enough minutes
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
    // 1. Check if feasible locally (double check)
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

        // 2. Start Timer UI
        showTimer(durationMinutes);

        // 3. Update Firestore
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
