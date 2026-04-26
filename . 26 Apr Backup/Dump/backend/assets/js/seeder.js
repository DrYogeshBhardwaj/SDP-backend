// assets/js/seeder.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Protect the page ensuring only SEEDER or higher can access
    const user = await Auth.protectPage('SEEDER');
    if (!user) return; // Will redirect

    // Set referral link to default to the 580 Family Pack
    const refLink = `${window.location.origin}/public/login.html?ref=${user.mobile}&amount=580`;
    document.getElementById('referral-link').value = refLink;

    // Save user.mobile globally for AudioDB
    window.currentUserMobile = user.mobile;

    // Handle Copy
    document.getElementById('copy-link-btn').addEventListener('click', () => {
        const linkInput = document.getElementById('referral-link');
        linkInput.select();
        document.execCommand('copy');
        alert("Referral link copied to clipboard!");
    });

    // 2. Load Dashboard Data
    window.currentUserId = user.id;
    await loadSeederData();
    fetchSupportThread();
    setInterval(fetchSupportThread, 10000); // Poll every 10 seconds for new messages
    document.getElementById('payout-form').addEventListener('submit', handlePayoutRequest);

    // 4. Bind Session Buttons
    document.querySelectorAll('.session-btn').forEach(btn => {
        btn.addEventListener('click', () => startSession(parseInt(btn.getAttribute('data-minutes'))));
    });

    // 5. Bind Early Exit
    const earlyExitBtn = document.getElementById('end-session-early-btn');
    if (earlyExitBtn) {
        earlyExitBtn.addEventListener('click', processEarlyExit);
    }

    // 6. Initialize AudioDB UI
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

    // 7. Bind Edit Profile Form
    const profileImgInput = document.getElementById('edit-profile-img');
    const profileImgPreview = document.getElementById('edit-profile-img-preview');
    if (profileImgInput) {
        profileImgInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    profileImgPreview.src = ev.target.result;
                }
                reader.readAsDataURL(e.target.files[0]);
            }
        });
    }

    const editProfileForm = document.getElementById('edit-profile-form');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-save-profile');
            const msg = document.getElementById('profile-msg');
            const nameField = document.getElementById('edit-profile-name').value.trim();
            const originalText = btn.textContent;

            btn.disabled = true;
            btn.textContent = 'Saving...';
            msg.textContent = '';

            try {
                let profileImageBase64 = undefined;
                if (profileImgInput.files && profileImgInput.files[0]) {
                    profileImageBase64 = profileImgPreview.src;
                }

                const res = await ApiClient.put('/auth/profile', {
                    name: nameField || undefined,
                    profile_photo: profileImageBase64
                });

                msg.innerHTML = '<span style="color: green;">✔ Profile updated!</span>';

                // Refresh Top display name
                if (res.data && res.data.name) {
                    const userNameEl = document.getElementById('user-name-display');
                    if (userNameEl) userNameEl.textContent = res.data.name;
                }
            } catch (err) {
                msg.innerHTML = `<span style="color: red;">${err.message || 'Failed to update'}</span>`;
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
                setTimeout(() => { if (msg.textContent.includes('updated')) msg.textContent = ''; }, 3000);
            }
        });
    }
});

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

            // START AMBIENT SOUND SYNCHRONOUSLY to bypass autoplay policies
            if (window.playSessionAmbientAudio) {
                window.playSessionAmbientAudio(5, customAudioSource);
            }
        } else {
            if (window.ssbCore && window.currentUserMobile) {
                const vals = window.ssbCore.calculateValues(window.currentUserMobile);
                const styledVals = window.ssbCore.verifyContrast(vals.val1, vals.val2);

                const breakUI = document.getElementById('active-break-ui');
                if (breakUI) {
                    breakUI.style.background = `linear-gradient(135deg, ${styledVals.color1} 0%, ${styledVals.color2} 100%)`;
                }

                const audioDescText = document.getElementById('audio-desc-text');
                if (audioDescText) {
                    audioDescText.innerHTML = `🔊 ${window.ssbCore.getFrequencyText(styledVals.val1)} (Mobank) • ${window.ssbCore.getFrequencyText(styledVals.val2)} (Yogank)`;
                }

                try {
                    await window.ssbCore.startAudio(styledVals.val1, styledVals.val2);
                } catch (e) {
                    console.warn('[SSB CORE] Audio failed, using fallback:', e);
                    if (window.playSessionAmbientAudio) {
                        window.playSessionAmbientAudio(5);
                    }
                }
            } else {
                const audioDescText = document.getElementById('audio-desc-text');
                if (audioDescText) {
                    audioDescText.innerHTML = `🔊 108 Hz (Deep Bass) • 162 Hz (Perfect Fifth)`;
                }
                if (window.playSessionAmbientAudio) {
                    window.playSessionAmbientAudio(5);
                }
            }
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
    
    // Stop SSB Audio
    if (window.ssbCore) {
        window.ssbCore.stopAudio();
    }

    // Hide UI and Fullscreen
    const breakUI = document.getElementById('active-break-ui');
    if (breakUI) {
        breakUI.classList.add('hidden');
        breakUI.style.background = ''; // reset custom color
    }
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

    // Reload Dashboard Data
    loadSeederData();
}

async function loadSeederData() {
    try {
        // Fetch User details for wallet & bonus
        const userData = await ApiClient.get('/auth/me');
        const user = userData.data?.user || userData.user || userData.data;

        document.getElementById('wallet-balance').textContent = `₹${user.walletBalance || 0}`;
        document.getElementById('total-bonus').textContent = `₹${user.totalBonus || 0}`;
        
        const minutesBalanceEl = document.getElementById('minutes-balance');
        if (minutesBalanceEl) minutesBalanceEl.textContent = user.minutesBalance || 0;

        // Optional rank/status purely from backend
        if (user.status) {
            document.getElementById('rank-status').textContent = user.status;
        }

        // Populate Edit Profile fields
        const editNameInput = document.getElementById('edit-profile-name');
        if (editNameInput && user.name) editNameInput.value = user.name;

        const editUpiInput = document.getElementById('edit-profile-upi');
        if (editUpiInput && user.upi_id) editUpiInput.value = user.upi_id;

        const editImgPreview = document.getElementById('edit-profile-img-preview');
        if (editImgPreview && user.profile_photo) {
            editImgPreview.src = user.profile_photo;
        }

        // Fetch Extended Network Stats (level1, level2 counts)
        const networkData = await ApiClient.get('/referral/network').catch(() => ({}));
        const network = networkData.data || networkData || {};

        document.getElementById('level1-count').textContent = network.directCount || network.level1Count || 0;
        document.getElementById('level2-count').textContent = network.indirectCount || network.level2Count || 0;

        // Fetch Direct Team List (Level 1 & 2)
        const teamData = await ApiClient.get('/referral/team').catch(() => ({}));
        const team = teamData.data?.team || teamData.team || [];
        const teamLevel2 = teamData.data?.teamLevel2 || teamData.teamLevel2 || [];

        renderTeam(team, 'team-table-body');
        renderTeam(teamLevel2, 'team-level2-table-body');
    } catch (error) {
        showError('Failed to load seeder data.');
    }
}

function renderTeam(team, tableId = 'team-table-body') {
    const tbody = document.getElementById(tableId);
    if (!tbody) return;
    
    if (!team || team.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="padding: 1rem;">No referrals yet. Share your link!</td></tr>';
        return;
    }

    tbody.innerHTML = team.map(member => `
        <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem 0.5rem;">${maskMobile(member.mobile)}</td>
            <td style="padding: 0.75rem 0.5rem;">${member.pincode || 'N/A'}</td>
            <td style="padding: 0.75rem 0.5rem;">${new Date(member.createdAt).toLocaleDateString()}</td>
            <td style="padding: 0.75rem 0.5rem; color: ${member.hasPurchasedPlan ? 'var(--success-color)' : 'var(--text-secondary)'};">
                ${member.hasPurchasedPlan ? 'Active' : 'Pending'}
            </td>
            <td style="padding: 0.75rem 0.5rem; font-weight: bold; color: ${member.amountGained > 0 ? 'var(--success-color)' : 'inherit'};">
                ₹${member.amountGained || 0}
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
        await ApiClient.post('/finance/request-payout', { amount });
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

// Support Feature
async function loadSupportThread() {
    try {
        const adminResp = await ApiClient.get('/messages/null'); // Hacky workaround, controller will replace null with Admin id
        // Wait, controller tries to parse targetUserId. Wait, we should just let the backend route handle it or pass a dummy UUID. Let's pass 'admin' and fix the backend route if needed, or just let 'req.params.userId' be invalid but backend handles it?
        // Actually, if we hit /messages/admin, the backend targetUserId = 'admin'.
        // Wait, in message.controller.js we wrote: if targetUserId is given, it looks up the id.
        // Let's implement /messages/admin endpoint to fetch the admin thread.
    } catch (err) { }
}

const pf = document.getElementById('support-form');
if (pf) {
    pf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msg = document.getElementById('support-message').value;
        const submitBtn = pf.querySelector('button');
        submitBtn.disabled = true;
        try {
            await ApiClient.post('/messages', { content: msg }); // Omitting receiverId gets mapped to Admin
            document.getElementById('support-message').value = '';
            document.getElementById('support-status').innerHTML = '<span style="color:green">Message sent successfully!</span>';
            setTimeout(() => document.getElementById('support-status').innerHTML = '', 3000);
            await fetchSupportThread();
        } catch (err) {
            document.getElementById('support-status').innerHTML = `<span style="color:red">${err.message || 'Failed to send'}</span>`;
        } finally {
            submitBtn.disabled = false;
        }
    });
}

async function fetchSupportThread() {
    try {
        const threadDiv = document.getElementById('support-thread');
        if (!threadDiv) return;

        const res = await ApiClient.get('/messages/thread');
        const messages = res.data?.messages || res.messages || [];

        const unreadCount = messages.filter(m => m.receiverId === window.currentUserId && m.status === 'UNREAD').length;
        const badge = document.getElementById('unread-messages-badge');
        if (badge) {
            if (unreadCount > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = `${unreadCount} New`;
            } else {
                badge.style.display = 'none';
            }
        }

        if (messages.length === 0) {
            threadDiv.innerHTML = '<p class="text-center text-sm text-secondary">No messages yet. Send a message to start.</p>';
            return;
        }

        threadDiv.innerHTML = messages.reverse().map(m => {
            const isMe = m.sender?.id === window.currentUserId; // Need to ensure currentUserId is set

            // Auto mark-as-read
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
        threadDiv.scrollTop = threadDiv.scrollHeight;
    } catch (e) {
        console.error('Failed to fetch thread', e);
    }
}
