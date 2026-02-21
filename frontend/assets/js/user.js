// assets/js/user.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect the page ensuring only authenticated users can access
    const user = await Auth.protectPage();
    if (!user) return; // Will redirect

    // Populate Profile
    document.getElementById('profile-mobile').textContent = user.mobile || 'N/A';
    document.getElementById('profile-plan').textContent = user.plan || 'Standard';

    // 2. Load Dashboard Data
    await loadDashboardData();

    // 3. Bind Session Buttons
    document.querySelectorAll('.session-btn').forEach(btn => {
        btn.addEventListener('click', () => startSession(parseInt(btn.getAttribute('data-minutes'))));
    });
});

async function loadDashboardData() {
    try {
        // Fetch User details for balance
        const userData = await ApiClient.get('/auth/me');
        const user = userData.data?.user || userData.user || userData.data;

        document.getElementById('minutes-balance').textContent = user.minutesBalance || 0;

        // Fetch History
        let historyData = { data: [] }; // Default to empty array
        try {
            historyData = await ApiClient.get('/minutes/history');
        } catch (e) {
            console.warn('Failed to fetch history data (backend might not supply it yet):', e);
        }
        const history = historyData.data || historyData.history || [];

        renderHistory(history);
    } catch (error) {
        showError('Failed to load dashboard data.');
    }
}

function renderHistory(history) {
    const tbody = document.getElementById('history-table-body');
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 1rem;">No sessions yet.</td></tr>';
        return;
    }

    tbody.innerHTML = history.slice(0, 10).map(session => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 0.5rem;">${new Date(session.createdAt || session.date).toLocaleDateString()}</td>
            <td style="padding: 0.75rem 0.5rem;">${session.duration} min</td>
            <td style="padding: 0.75rem 0.5rem; color: ${session.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--text-secondary)'};">
                ${session.status || 'UNKNOWN'}
            </td>
        </tr>
    `).join('');
}

async function startSession(minutes) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    try {
        // Validation handled entirely by backend API rate limiter, JWT validation, and balance checks
        await ApiClient.post('/minutes/start-session', { duration: minutes });

        // Purely visual timer logic
        document.getElementById('session-options').classList.add('hidden');
        document.getElementById('active-session').classList.remove('hidden');

        let timeLeft = minutes * 60;
        const timerDisplay = document.getElementById('session-timer');

        const interval = setInterval(async () => {
            timeLeft--;
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;

            if (timeLeft <= 0) {
                clearInterval(interval);
                timerDisplay.textContent = "00:00";

                // Backend completes immediately on start-session, no need to send complete signal
                successDiv.textContent = `Successfully completed ${minutes} minute session!`;
                successDiv.classList.add('show');

                // Reset UI state
                document.getElementById('session-options').classList.remove('hidden');
                document.getElementById('active-session').classList.add('hidden');
                loadDashboardData();
            }
        }, 1000);

    } catch (error) {
        showError(error.message || 'Failed to start session. Ensure sufficient balance.');
    }
}

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}
