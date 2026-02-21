// assets/js/seeder.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect the page ensuring only SEEDER or higher can access
    const user = await Auth.protectPage('SEEDER');
    if (!user) return; // Will redirect

    // Set referral link
    const refLink = `${window.location.origin}/public/register.html?ref=${user.mobile}`;
    document.getElementById('referral-link').value = refLink;

    // Handle Copy
    document.getElementById('copy-link-btn').addEventListener('click', () => {
        const linkInput = document.getElementById('referral-link');
        linkInput.select();
        document.execCommand('copy');
        alert("Referral link copied to clipboard!");
    });

    // 2. Load Dashboard Data
    await loadSeederData();

    // 3. Bind Payout Form
    document.getElementById('payout-form').addEventListener('submit', handlePayoutRequest);
});

async function loadSeederData() {
    try {
        // Fetch User details for wallet & bonus
        const userData = await ApiClient.get('/auth/me');
        const user = userData.data?.user || userData.user || userData.data;

        document.getElementById('wallet-balance').textContent = `₹${user.walletBalance || 0}`;
        document.getElementById('total-bonus').textContent = `₹${user.totalBonus || 0}`;
        // Optional rank/status purely from backend
        if (user.status) {
            document.getElementById('rank-status').textContent = user.status;
        }

        // Fetch Extended Network Stats (level1, level2 counts)
        const networkData = await ApiClient.get('/referral/network').catch(() => ({}));
        const network = networkData.data || networkData || {};

        document.getElementById('level1-count').textContent = network.directCount || network.level1Count || 0;
        document.getElementById('level2-count').textContent = network.indirectCount || network.level2Count || 0;

        // Fetch Direct Team List (Level 1)
        const teamData = await ApiClient.get('/referral/team').catch(() => ({}));
        const team = teamData.data || teamData.team || [];

        renderTeam(team);
    } catch (error) {
        showError('Failed to load seeder data.');
    }
}

function renderTeam(team) {
    const tbody = document.getElementById('team-table-body');
    if (!team || team.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 1rem;">No direct referrals yet. Share your link!</td></tr>';
        return;
    }

    tbody.innerHTML = team.map(member => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 0.5rem;">${maskMobile(member.mobile)}</td>
            <td style="padding: 0.75rem 0.5rem;">${new Date(member.createdAt).toLocaleDateString()}</td>
            <td style="padding: 0.75rem 0.5rem; color: ${member.hasPurchasedPlan ? 'var(--success-color)' : 'var(--text-secondary)'};">
                ${member.hasPurchasedPlan ? 'Active' : 'Pending'}
            </td>
        </tr>
    `).join('');
}

function maskMobile(mobile) {
    if (!mobile || mobile.length < 10) return mobile;
    return mobile.substring(0, 2) + '******' + mobile.substring(8);
}

async function handlePayoutRequest(e) {
    e.preventDefault();
    const amount = Number(document.getElementById('payout-amount').value);
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    const submitBtn = document.getElementById('payout-btn');

    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    // Strict frontend validation rule
    if (amount < 200) {
        showError("Minimum payout request is ₹200.");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        await ApiClient.post('/finance/payout/request', { amount });
        successDiv.textContent = `₹${amount} payout requested successfully! Pending admin approval.`;
        successDiv.classList.add('show');
        document.getElementById('payout-amount').value = '';

        // Refresh wallet balance from server immediately
        await loadSeederData();
    } catch (error) {
        showError(error.message || 'Failed to request payout.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Withdraw Funds';
    }
}

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}
