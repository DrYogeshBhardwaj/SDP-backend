/**
 * SINAANK Admin - Testing Tools Logic
 * Handles manual creation of test users and payments for physical testing.
 */
document.addEventListener('DOMContentLoaded', () => {
    const createBtn = document.getElementById('create-test-user-btn');
    const payBtn = document.getElementById('create-test-pay-btn');
    const logsEl = document.getElementById('testing-logs');

    function addLog(msg, type = 'info') {
        const time = new Date().toLocaleTimeString();
        const color = type === 'error' ? '#f87171' : (type === 'success' ? '#34d399' : '#94a3b8');
        const entry = document.createElement('div');
        entry.style.marginBottom = '4px';
        entry.innerHTML = `<span style="opacity:0.5">[${time}]</span> <span style="color:${color}">${msg}</span>`;
        logsEl.prepend(entry);
    }

    if (createBtn) {
        createBtn.onclick = async () => {
            const name = document.getElementById('test-user-name').value;
            const mobile = document.getElementById('test-user-mobile').value;
            const sponsorId = document.getElementById('test-user-sponsor').value;

            if (!mobile) return alert("Mobile required");

            createBtn.disabled = true;
            createBtn.innerText = "Creating...";

            try {
                const res = await ApiClient.post('/admin/test/user', { name, mobile, sponsorId });
                if (res.success) {
                    addLog(`User ${mobile} created successfully! SID: ${res.data.referral_code}`, 'success');
                    // Sync mobile to payment field for convenience
                    document.getElementById('test-pay-mobile').value = mobile;
                } else {
                    addLog(`Error: ${res.message}`, 'error');
                }
            } catch (err) {
                addLog(`Request failed: ${err.message}`, 'error');
            } finally {
                createBtn.disabled = false;
                createBtn.innerText = "CREATE USER";
            }
        };
    }

    if (payBtn) {
        payBtn.onclick = async () => {
            const mobile = document.getElementById('test-pay-mobile').value;
            const plan = document.getElementById('test-pay-plan').value;

            if (!mobile) return alert("Mobile required");

            payBtn.disabled = true;
            payBtn.innerText = "Processing...";

            try {
                const res = await ApiClient.post('/admin/test/payment', { mobile, plan });
                if (res.success) {
                    addLog(`Payment for ${mobile} (${plan}) processed!`, 'success');
                } else {
                    addLog(`Error: ${res.message}`, 'error');
                }
            } catch (err) {
                addLog(`Request failed: ${err.message}`, 'error');
            } finally {
                payBtn.disabled = false;
                payBtn.innerText = "ADD PAYMENT ENTRY";
            }
        };
    }
});
