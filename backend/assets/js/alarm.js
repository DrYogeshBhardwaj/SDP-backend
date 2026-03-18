// assets/js/alarm.js

document.addEventListener('DOMContentLoaded', () => {
    const alarmForm = document.getElementById('alarm-form');
    if (!alarmForm) return;

    const timeInput = document.getElementById('alarm-time');
    const msgInput = document.getElementById('alarm-message');
    const durInput = document.getElementById('alarm-duration');
    const setBtn = document.getElementById('btn-set-alarm');
    const clearBtn = document.getElementById('btn-clear-alarm');
    const statusDiv = document.getElementById('alarm-status');

    let alarmCheckInterval;

    // Helper: format time gracefully
    function formatTime(timeVal) {
        if (!timeVal) return '';
        let [hour, min] = timeVal.split(':');
        let h = parseInt(hour, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${min} ${ampm}`;
    }

    // Load existing alarm
    function loadAlarm() {
        const saved = localStorage.getItem('sdp_alarm');
        if (saved) {
            const alarm = JSON.parse(saved);
            timeInput.value = alarm.time;
            msgInput.value = alarm.message;
            durInput.value = alarm.duration;

            // Backwards compatibility/defensive defaults
            if (!alarm.duration) alarm.duration = "5";

            if (alarm.active) {
                statusDiv.textContent = `Alarm active for ${formatTime(alarm.time)}.`;
                statusDiv.style.color = "var(--success-color)";
                clearBtn.classList.remove('hidden');
                setBtn.textContent = 'Update Alarm';
                startAlarmChecker(alarm);
            } else {
                statusDiv.textContent = 'Alarm is currently off.';
                statusDiv.style.color = "var(--text-secondary)";
                clearBtn.classList.add('hidden');
                setBtn.textContent = 'Set Alarm';
            }
        }
    }

    function startAlarmChecker(alarm) {
        if (alarmCheckInterval) clearInterval(alarmCheckInterval);

        // Request notification permission if not yet granted
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        alarmCheckInterval = setInterval(() => {
            const now = new Date();
            const h = now.getHours().toString().padStart(2, '0');
            const m = now.getMinutes().toString().padStart(2, '0');
            const currentTime = `${h}:${m}`;
            const todayDate = now.toDateString();

            if (currentTime === alarm.time && alarm.lastTriggered !== todayDate) {
                // Mark triggered immediately to prevent loop
                alarm.lastTriggered = todayDate;
                localStorage.setItem('sdp_alarm', JSON.stringify(alarm));

                // Trigger it!
                triggerAlarm(alarm);
            }
        }, 30000); // Check every 30 seconds
    }

    // Sound + Modal + Browser Notification
    function triggerAlarm(alarm) {
        playBell();

        if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Digital Wellness Alarm", {
                body: alarm.message + `\nClick to start your ${alarm.duration}-minute session.`,
                icon: '/public/favicon.ico' // fallback gracefully if missing
            });
            notif.onclick = () => {
                window.focus();
                showAlarmModal(alarm);
                notif.close();
            };
        }

        showAlarmModal(alarm);
    }

    function showAlarmModal(alarm) {
        let modal = document.getElementById('alarm-trigger-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'alarm-trigger-modal';
            modal.innerHTML = `
                <div style="position: fixed; top:0; left:0; width:100vw; height:100vh; background: rgba(0,0,0,0.85); z-index: 100000; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(5px);">
                    <div style="background: var(--surface-color); color: var(--text-primary); padding: var(--spacing-xl); border-radius: var(--border-radius); text-align: center; max-width: 450px; width: 90%; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                        <h2 style="color: var(--primary-color); margin-bottom: 0.5rem;">⏰ Mindful Alarm</h2>
                        <h4 style="color: var(--text-secondary); margin-bottom: var(--spacing-md);">${alarm.duration} Minute Pause</h4>
                        <p style="font-size: 1.25rem; margin: var(--spacing-md) 0; font-weight: 500;" id="alarm-modal-msg"></p>
                        <div style="display:flex; gap: var(--spacing-md); justify-content: center; margin-top: 2rem; flex-wrap: wrap;">
                            <button id="alarm-start-btn" class="btn btn-primary" style="flex:1; min-width: 140px;">Start Now</button>
                            <button id="alarm-dismiss-btn" class="btn btn-secondary" style="flex:1; min-width: 140px;">Dismiss</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        document.getElementById('alarm-modal-msg').textContent = `"${alarm.message}"`;
        modal.style.display = 'flex';

        document.getElementById('alarm-dismiss-btn').onclick = () => {
            modal.style.display = 'none';
        };

        document.getElementById('alarm-start-btn').onclick = () => {
            modal.style.display = 'none';
            if (window.startSession) {
                // Ensure audio API compatibility by using user gesture here via a tiny 1ms timeout wrapper
                setTimeout(() => window.startSession(parseInt(alarm.duration)), 10);
            } else {
                alert("Please go to the main dashboard to start your session.");
            }
        };
    }

    function playBell() {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        try {
            const ctx = new AudioContext();
            
            // First chime (C5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime);
            
            gain1.gain.setValueAtTime(0, ctx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
            
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 1.0);

            // Second chime (E5 - Ascending major third for positive feel)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3);
            
            gain2.gain.setValueAtTime(0, ctx.currentTime + 0.3);
            gain2.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.35);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(ctx.currentTime + 0.3);
            osc2.stop(ctx.currentTime + 1.5);

        } catch (e) {
            console.warn("Could not play alarm bell", e);
        }
    }

    // Event Listeners for UI
    alarmForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const alarm = {
            time: timeInput.value,
            message: msgInput.value,
            duration: durInput.value,
            active: true,
            lastTriggered: null
        };
        localStorage.setItem('sdp_alarm', JSON.stringify(alarm));

        // Request visual notification permission
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        loadAlarm();

        // Visual feedback
        statusDiv.textContent = "Alarm saved successfully!";
        setTimeout(() => loadAlarm(), 2000); // restore original message
    });

    clearBtn.addEventListener('click', () => {
        const saved = localStorage.getItem('sdp_alarm');
        if (saved) {
            const alarm = JSON.parse(saved);
            alarm.active = false;
            localStorage.setItem('sdp_alarm', JSON.stringify(alarm));
        }
        if (alarmCheckInterval) clearInterval(alarmCheckInterval);
        loadAlarm();
    });

    // Run on boot
    loadAlarm();
});
