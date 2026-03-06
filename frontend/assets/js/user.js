// assets/js/user.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect the page ensuring only authenticated users can access
    const user = await Auth.protectPage();
    if (!user) return; // Will redirect

    // Populate Profile
    document.getElementById('profile-mobile').textContent = user.mobile || 'N/A';

    // Dynamic Plan Name based on Role assigned from Checkout
    let planName = 'Standard';
    if (user.role === 'USER_178') {
        planName = 'SDP Personal (₹178)';
        const upgradeOffer = document.getElementById('upgrade-offer-178');
        if (upgradeOffer) upgradeOffer.classList.remove('hidden');
    }
    if (user.role === 'USER_580') {
        planName = 'SDP Family (₹580)';
        const familySection = document.getElementById('family-section-580');
        if (familySection) familySection.classList.remove('hidden');
    }
    document.getElementById('profile-plan').textContent = planName;

    // Save user.mobile globally for AudioDB
    window.currentUserMobile = user.mobile;

    // 2. Load Dashboard Data
    await loadDashboardData();
    if (user.role === 'USER_580' || user.role === 'SEEDER') {
        await loadFamilyMembers(user);
    }

    // 3. Bind Session Buttons
    document.querySelectorAll('.session-btn').forEach(btn => {
        btn.addEventListener('click', () => startSession(parseInt(btn.getAttribute('data-minutes'))));
    });

    // 4. Bind Early Exit
    const earlyExitBtn = document.getElementById('end-session-early-btn');
    if (earlyExitBtn) {
        earlyExitBtn.addEventListener('click', processEarlyExit);
    }

    // 4.5 Bind Family Add Form (if exists)
    const familyForm = document.getElementById('family-add-form');
    if (familyForm) {
        familyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = familyForm.querySelector('button');
            const msg = document.getElementById('family-msg');
            const fMobile = document.getElementById('new-family-mobile').value.trim();
            const fPin = document.getElementById('new-family-pin').value.trim();

            if (fMobile.length !== 10 || fPin.length !== 4) {
                msg.textContent = "Please ensure Mobile is 10 digits and PIN is 4 digits.";
                msg.style.color = "red";
                return;
            }

            btn.disabled = true;
            btn.textContent = "Adding...";
            msg.textContent = "";

            try {
                // Wait for the backend API route if it doesn't exist yet, passing it explicitly
                const res = await fetch('/api/auth/family', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('sdp_token')}`
                    },
                    body: JSON.stringify({
                        mobile: fMobile,
                        pin: fPin
                    })
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    msg.innerHTML = `<span style="color: green;">✔ Successfully added ${fMobile}!</span>`;
                    familyForm.reset();
                    await loadFamilyMembers(user);
                } else {
                    msg.textContent = data.message || "Failed to add family member.";
                    msg.style.color = "red";
                }
            } catch (e) {
                msg.textContent = "Network error. Please try again.";
                msg.style.color = "red";
            } finally {
                btn.disabled = false;
                btn.textContent = "Add Family Member";
            }
        });
    }

    async function loadFamilyMembers(user) {
        try {
            const res = await fetch('/api/auth/family', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('sdp_token')}` }
            });
            const data = await res.json();

            if (res.ok && data.success && data.data && data.data.members) {
                const members = data.data.members;
                const maxMembers = 3;

                const countMsg = document.getElementById('family-count-msg');
                if (countMsg) {
                    const remaining = maxMembers - members.length;
                    countMsg.textContent = `You can add ${remaining} more family members (out of ${maxMembers}).`;
                }

                const listContainer = document.getElementById('family-list-container');
                const listEl = document.getElementById('family-list');
                const formEl = document.getElementById('family-add-form');

                if (members.length > 0) {
                    listContainer.classList.remove('hidden');
                    listEl.innerHTML = members.map(m => `<li>${m.mobile} (Added ${new Date(m.createdAt).toLocaleDateString()})</li>`).join('');
                } else {
                    listContainer.classList.add('hidden');
                }

                if (members.length >= maxMembers && formEl) {
                    formEl.style.display = 'none';
                    if (countMsg) countMsg.textContent = `You have reached your limit of ${maxMembers} family members.`;
                } else if (formEl) {
                    formEl.style.display = 'block';
                }
            }
        } catch (e) {
            console.error("Failed to load family members", e);
        }
    }

    // 5. Initialize AudioDB UI
    if (window.AudioDB) {
        try {
            const savedAudio = await window.AudioDB.getAudio(window.currentUserMobile);
            if (savedAudio && savedAudio.file) {
                document.getElementById('custom-audio').classList.add('hidden');
                document.getElementById('saved-audio-container').classList.remove('hidden');
                document.getElementById('saved-audio-name').textContent = "🎵 " + savedAudio.name;
            }
        } catch (e) { console.warn('AudioDB load error', e); }

        const audioInput = document.getElementById('custom-audio');
        if (audioInput) {
            audioInput.addEventListener('change', async (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    try {
                        await window.AudioDB.saveAudio(e.target.files[0], window.currentUserMobile);
                        document.getElementById('custom-audio').classList.add('hidden');
                        document.getElementById('saved-audio-container').classList.remove('hidden');
                        document.getElementById('saved-audio-name').textContent = "🎵 " + e.target.files[0].name;
                    } catch (e) { console.warn('AudioDB save error', e); }
                }
            });
        }

        const removeAudioBtn = document.getElementById('remove-audio-btn');
        if (removeAudioBtn) {
            removeAudioBtn.addEventListener('click', async () => {
                try {
                    await window.AudioDB.clearAudio(window.currentUserMobile);
                    const audioInp = document.getElementById('custom-audio');
                    if (audioInp) audioInp.value = ""; // clear
                    document.getElementById('custom-audio').classList.remove('hidden');
                    document.getElementById('saved-audio-container').classList.add('hidden');
                } catch (e) { console.warn('AudioDB clear error', e); }
            });
        }
    }

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
        const history = historyData.data?.history || historyData.history || [];

        renderHistory(history);
    } catch (error) {
        showError('Failed to load dashboard data.');
    }
}

function renderHistory(history) {
    const tbody = document.getElementById('history-table-body');
    if (!history || history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 1rem;">No sessions yet.</td></tr>';
        return;
    }

    tbody.innerHTML = history.slice(0, 10).map(session => {
        const d = new Date(session.createdAt || session.date);
        return `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 0.5rem;">${d.toLocaleDateString()}</td>
            <td style="padding: 0.75rem 0.5rem;">${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding: 0.75rem 0.5rem;">${session.duration} min</td>
            <td style="padding: 0.75rem 0.5rem; color: ${session.status === 'COMPLETED' ? 'var(--success-color)' : 'var(--text-secondary)'};">
                ${session.status || 'UNKNOWN'}
            </td>
        </tr>
    `}).join('');
}

let activeSessionInterval;

async function startSession(minutes) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    try {
        // Start Alignment Ritual immediately to capture user gesture for sound
        let ritualPromise = null;
        if (window.runAlignmentRitual) {
            ritualPromise = window.runAlignmentRitual();
        }

        // Handle Custom Audio Input
        let customAudioSource = null;
        let originalFileName = null;
        let audioFileToPlay = null;

        if (window.AudioDB) {
            try {
                const savedAudio = await window.AudioDB.getAudio(window.currentUserMobile);
                if (savedAudio && savedAudio.file) {
                    audioFileToPlay = savedAudio.file;
                    originalFileName = savedAudio.name;
                }
            } catch (e) { console.warn('Audio DB Get Error', e); }
        }

        const audioInput = document.getElementById('custom-audio');
        if (!audioFileToPlay && audioInput && audioInput.files && audioInput.files.length > 0) {
            audioFileToPlay = audioInput.files[0];
            originalFileName = audioInput.files[0].name;
        }

        if (audioFileToPlay) {
            // Need to pass a stable object URL to the audio player
            customAudioSource = URL.createObjectURL(audioFileToPlay);

            // Show custom file info on the dashboard
            const audioDescText = document.getElementById('audio-desc-text');
            if (audioDescText) {
                audioDescText.innerHTML = `🎵 Playing Custom Sound: <b>${originalFileName}</b>`;
            }
        } else {
            const audioDescText = document.getElementById('audio-desc-text');
            if (audioDescText) {
                audioDescText.innerHTML = `🔊 108 Hz (Deep Bass) • 162 Hz (Perfect Fifth)`;
            }
        }

        // START AMBIENT SOUND SYNCHRONOUSLY to bypass autoplay policies
        // We pass 5 seconds delay so it fades in exactly when the visual ritual ends.
        if (window.playSessionAmbientAudio) {
            window.playSessionAmbientAudio(5, customAudioSource);
        }

        // START FULLSCREEN SYNCHRONOUSLY to bypass fullscreen policies
        try {
            const docEl = document.documentElement;
            const requestFS = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
            if (requestFS && !document.fullscreenElement && !document.webkitFullscreenElement) {
                requestFS.call(docEl);
            }
        } catch (e) { console.warn("Fullscreen request failed", e); }

        // Validation handled entirely by backend API rate limiter, JWT validation, and balance checks
        await ApiClient.post('/minutes/start-session', { duration: minutes });

        // Wait for Ritual to complete
        if (ritualPromise) {
            await ritualPromise;
        }

        // Show Premium Fullscreen UI
        const breakUI = document.getElementById('active-break-ui');
        breakUI.classList.remove('hidden');

        let timeLeft = minutes * 60;
        const timerDisplay = document.getElementById('session-timer-large');

        // Setup clearable interval
        if (activeSessionInterval) clearInterval(activeSessionInterval);

        activeSessionInterval = setInterval(async () => {
            timeLeft--;
            const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
            const s = (timeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;

            if (timeLeft <= 0) {
                endSessionUI(minutes, successDiv);
            }
        }, 1000);

    } catch (error) {
        if (window.stopSessionAmbientAudio) window.stopSessionAmbientAudio(true); // Stop pre-started audio
        showError(error.message || 'Failed to start session. Ensure sufficient balance.');
    }
}

function processEarlyExit(e) {
    const btn = e ? e.target : document.getElementById('end-session-early-btn');
    if (!btn) return;

    if (btn.getAttribute('data-confirming') !== 'true') {
        btn.setAttribute('data-confirming', 'true');
        btn.textContent = 'Are you sure? Click again to end';
        btn.style.color = '#ff6b6b';
        btn.style.borderColor = '#ff6b6b';
        btn.style.background = 'rgba(255, 107, 107, 0.1)';

        setTimeout(() => {
            if (btn && btn.getAttribute('data-confirming') === 'true') {
                btn.removeAttribute('data-confirming');
                btn.textContent = 'End Session';
                btn.style.color = '';
                btn.style.borderColor = '';
                btn.style.background = '';
            }
        }, 3000);
    } else {
        btn.removeAttribute('data-confirming');
        btn.textContent = 'End Session';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.background = '';
        endSessionUI();
    }
}

function endSessionUI(minutes = 0, successDiv = null) {
    if (activeSessionInterval) clearInterval(activeSessionInterval);

    // Stop Ambient Sound for Session
    if (window.stopSessionAmbientAudio) {
        window.stopSessionAmbientAudio();
    }

    // Hide UI and Fullscreen
    document.getElementById('active-break-ui').classList.add('hidden');
    try {
        const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
        if (exitFS && (document.fullscreenElement || document.webkitFullscreenElement)) {
            exitFS.call(document);
        }
    } catch (e) { console.warn("Fullscreen exit failed", e); }

    if (minutes > 0 && successDiv) {
        successDiv.textContent = `Successfully completed ${minutes} minute session!`;
        successDiv.classList.add('show');
    }

    // Reload Balance and History
    loadDashboardData();
}

function showError(msg) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
    setTimeout(() => errorDiv.classList.remove('show'), 5000);
}
