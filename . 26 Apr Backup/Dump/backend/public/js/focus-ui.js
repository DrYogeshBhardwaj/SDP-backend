/**
 * SINAANK Universal Focus UI Controller v2.0 (Production Lock)
 * ─────────────────────────────────────────────────────────────
 * Manages the immersive, distraction-free Focus Mode across all therapy modules.
 *
 * Session Rules (Production Locked):
 *  - Balance < 2 minutes → block start, redirect to topup.html
 *  - Module switch       → resume same session (no new reservation)
 *  - 60-minute cap       → auto-stop with TIMEOUT status
 *  - Heartbeat: every 30s ping to keep session alive
 *
 * API:
 *  FocusUIController.setup({ module: 'SDB', minMinutes: 2 })
 */

window.FocusUIController = {
    config: {
        instructionTime: 3000,
        textGrey: 'rgba(154, 154, 154, 0.65)',
        saturation: 40,
        lightness: 6,
        pingFrequency: 30000  // 30 seconds
    },

    // Translation helper
    _t(key, fallback) {
        if (window.smtI18n && window.smtI18n.t) {
            return window.smtI18n.t(key);
        }
        return fallback;
    },

    sessionId: null,
    pingInterval: null,
    moduleId: null,
    sidInfoTimeout: null,

    // ───────────────────────────────────────────
    // BACKEND SESSION START
    // ───────────────────────────────────────────
    async startSession(moduleId) {
        try {
            const res = await ApiClient.post('/minutes/start', { module: moduleId.toUpperCase() });

            if (res && res.success) {
                this.sessionId = res.data.sessionId;
                this.startPing();

                return true;
            }

            // Explicit balance failure
            if (res && (res.status === 403 || (res.error && res.error.toLowerCase().includes('insufficient')))) {
                this._blockBalance();
                return false;
            }

        } catch (e) {
            const status = e.response?.status || e.status;
            if (status === 403) {
                this._blockBalance();
            } else {
                this._showError('Could not start session. Please check your connection and try again.');
            }
            return false;
        }

        return false;
    },

    _blockBalance() {
        this.showNoMinutesModal();
    },

    showNoMinutesModal() {
        this._injectGuardStyles();
        let overlay = document.getElementById('no-minutes-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'no-minutes-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="guard-modal">
                <div class="guard-icon">⏱️</div>
                <h3 class="guard-title">${this._t('focus.no_mins_title', 'No Minutes Available')}</h3>
                <p class="guard-body">${this._t('focus.no_mins_body', 'Please add minutes to your balance to start therapy.')}</p>
                <div class="guard-btn-group">
                    <a href="/dashboard/dashboard.html?topup=1&return=therapy" class="guard-btn-topup">${this._t('focus.btn_topup', 'Top-up Now')}</a>
                    <button class="guard-btn-cancel" onclick="document.getElementById('no-minutes-overlay').classList.remove('visible')">${this._t('focus.btn_cancel', 'Cancel')}</button>
                </div>
            </div>
        `;
        setTimeout(() => overlay.classList.add('visible'), 50);
    },

    /**
     * Resumes any suspended audio context to bypass browser autoplay blocks.
     * Must be called inside a user gesture (button click).
     */
    async _unlockAudioContext() {
        if (window.AudioEngine && window.AudioEngine.ctx) {
            if (window.AudioEngine.ctx.state === 'suspended') {

                await window.AudioEngine.ctx.resume();
            }
        }
    },

    /**
     * Aggressive Unlocker: Runs at the exact moment of click.
     * Unlocks both Web Audio and Web Speech.
     */
    async _unlockAudioAndSense() {
        // 1. Resume existing contexts
        await this._unlockAudioContext();
        
        // 2. Pre-create/Resume engine contexts if they exist
        const engines = ['SDSEngine', 'SDBEngine', 'SDEEngine', 'SDMEngine', 'SDDEngine', 'SDPEngine'];
        for (const name of engines) {
            const eng = window[name];
            if (eng && eng.audioCtx) {
                if (eng.audioCtx.state === 'suspended') await eng.audioCtx.resume();
            }
        }

        // 3. Kickstart SpeechSynth
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
            // Silent utter to "wake up" the engine on mobile Safari/Chrome
            const utter = new SpeechSynthesisUtterance(" ");
            utter.volume = 0;
            window.speechSynthesis.speak(utter);
        }

        // 4. Create a dummy buffer to unlock Web Audio pipeline
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
            if (ctx.state === 'suspended') await ctx.resume();
        } catch(e) {}

        // 5. Kickstart MP3 (User Step 3)
        try {
            const kickstart = new Audio("/assets/audio/common/therapy_start.mp3");
            kickstart.crossOrigin = "anonymous";
            kickstart.volume = 1.0; 

            // --- FINAL AUDIO BOOST FIX ---
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(kickstart);
            const gainNode = ctx.createGain();
            const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

            gainNode.gain.value = 2.5; // BOOST
            if (panner) panner.pan.value = 0; // Center

            source.connect(gainNode);
            if (panner) {
                gainNode.connect(panner);
                panner.connect(ctx.destination);
            } else {
                gainNode.connect(ctx.destination);
            }
            // ------------------------------

            await kickstart.play();

        } catch(e) {
            console.warn("[FocusUI] MP3 Kickstart failed:", e);
        }
    },

    _injectGuardStyles() {
        if (document.getElementById('focus-guard-styles')) return;
        const style = document.createElement('style');
        style.id = 'focus-guard-styles';
        style.textContent = `
            #no-minutes-overlay {
                position: fixed; inset: 0; background: rgba(0,0,0,0.85);
                backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
                z-index: 10000; display: flex; align-items: center; justify-content: center;
                opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
            }
            #no-minutes-overlay.visible { opacity: 1; pointer-events: auto; }
            .guard-modal {
                background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02));
                border: 1px solid rgba(255,255,255,0.1); border-radius: 24px;
                padding: 3rem 2rem; width: 90%; max-width: 400px; text-align: center;
                box-shadow: 0 20px 50px rgba(0,0,0,0.5);
            }
            .guard-icon { font-size: 3rem; margin-bottom: 1.5rem; }
            .guard-title { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; color: #fff; }
            .guard-body { font-size: 1rem; color: rgba(255,255,255,0.6); margin-bottom: 2rem; line-height: 1.6; }
            .guard-btn-group { display: flex; flex-direction: column; gap: 1rem; }
            .guard-btn-topup {
                background: linear-gradient(135deg, #3b82f6, #2563eb);
                color: white; border: none; padding: 1rem; border-radius: 12px;
                font-weight: 700; text-decoration: none; font-size: 1rem;
                transition: transform 0.2s;
            }
            .guard-btn-topup:active { transform: scale(0.98); }
            .guard-btn-cancel {
                background: transparent; border: none; color: rgba(255,255,255,0.4);
                padding: 0.5rem; font-size: 0.9rem; cursor: pointer;
            }

            /* SID Info Window Styles */
            #sid-info-overlay {
                position: fixed; inset: 0; z-index: 15000;
                background: rgba(1, 8, 16, 0.95);
                backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                display: flex; align-items: center; justify-content: center;
                opacity: 0; pointer-events: none; transition: opacity 1.2s ease;
            }
            #sid-info-overlay.visible { opacity: 1; pointer-events: auto; }
            .sid-card {
                text-align: center; width: 90%; max-width: 450px;
                animation: sidEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            @keyframes sidEntrance {
                from { opacity: 0; transform: translateY(20px) scale(0.98); }
                to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .sid-label { font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; color: var(--muted); margin-bottom: 0.5rem; }
            .sid-value { font-size: 2rem; font-weight: 800; color: #fff; margin-bottom: 2.5rem; letter-spacing: -0.02em; }
            .sid-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 2rem; }
            .sid-item { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1.5rem 1rem; }
            .sid-item .val { font-size: 1.1rem; font-weight: 700; color: var(--cyan); display: block; margin-bottom: 0.25rem; }
            .sid-item .lbl { font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
            
            /* Start Gate Styles */
            #start-gate-overlay {
                position: fixed; inset: 0; z-index: 14000;
                background: var(--bg); display: flex; align-items: center; justify-content: center;
                opacity: 0; pointer-events: none; transition: opacity 0.4s ease;
            }
            #start-gate-overlay.visible { opacity: 1; pointer-events: auto; }
            .gate-card { width: 90%; max-width: 400px; text-align: center; }
            .gate-btn {
                width: 100%; padding: 1.25rem; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);
                background: rgba(255,255,255,0.05); color: #fff; font-size: 1rem; font-weight: 600;
                cursor: pointer; transition: all 0.2s; margin-bottom: 1rem;
            }
            .gate-btn:hover { background: rgba(0, 209, 255, 0.1); border-color: var(--cyan); }
            .gate-btn.primary { background: linear-gradient(135deg, #00d1ff, #0078a0); color: #000; border: none; }

            /* Step 3 Manual Start Button */
            #sid-start-trigger {
                margin-top: 3rem; opacity: 0; pointer-events: none;
                transform: translateY(10px); transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            }
            #sid-start-trigger.reveal { opacity: 1; pointer-events: auto; transform: translateY(0); }
            .sid-start-btn {
                background: linear-gradient(135deg, #00ff8c, #00a85e);
                color: #000; border: none; padding: 1.2rem 3rem; border-radius: 50px;
                font-weight: 800; font-size: 1.1rem; cursor: pointer;
                box-shadow: 0 10px 30px rgba(0,255,140,0.2); transition: transform 0.2s;
            }
            .sid-start-btn:active { transform: scale(0.96); }
        `;
        document.head.appendChild(style);
    },

    _showError(msg) {
        alert(msg);
    },

    // ───────────────────────────────────────────
    // HEARTBEAT PING
    // ───────────────────────────────────────────
    startPing() {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(async () => {
            if (!this.sessionId) return;
            try {
                const res = await ApiClient.post('/minutes/ping', { sessionId: this.sessionId });
                if (res && res.success && res.data && res.data.timeout) {
                    this.handleAutoStop('Session completed (60 min limit reached)');
                }
            } catch (e) {
                console.warn('[FocusUI] Ping failed:', e.message);
            }
        }, this.config.pingFrequency);
    },

    // ───────────────────────────────────────────
    // AUTO STOP (60 MIN TIMEOUT)
    // ───────────────────────────────────────────
    async handleAutoStop(message) {
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = null;

        // Stop all active engines
        ['SDB', 'SDM', 'SDD', 'SDE', 'SDP', 'SDS'].forEach(m => {
            const engine = window[m + 'Engine'];
            if (engine && engine.isPlaying && engine.stop) engine.stop();
        });

        if (document.fullscreenElement) {
            try { await document.exitFullscreen(); } catch (e) {}
        }

        alert(message);
        window.location.href = '/dashboard/therapy.html';
    },

    // ───────────────────────────────────────────
    // END SESSION
    // ───────────────────────────────────────────
    async endSession() {
        if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null; }
        if (window.PersonalStartEngine) window.PersonalStartEngine.stop();
        if (!this.sessionId) return;

        try {
            await ApiClient.post('/minutes/end', { sessionId: this.sessionId });
        } catch (e) {
            console.error('[FocusUI] End session failed:', e);
        } finally {
            this.sessionId = null;
        }
    },

    // SID COLOR (fetched from persistent profile)
    // ───────────────────────────────────────────
    generateSIDColor() {
        try {
            const id = window.SDP_THEME;
            return id ? id.colors.bg : '#000';
        } catch (e) {
            return '#000';
        }
    },

    // ───────────────────────────────────────────
    // MAIN SETUP ENTRY (Unified Flow v3)
    // ───────────────────────────────────────────
    async setup(options = {}) {
        const moduleId = (options.module || 'sdp').toLowerCase();
        this.moduleId = moduleId;

        // ── 0. Check Theme Ready (Strict Gate) ──
        if (!window.SDP_THEME) {

            await this._waitForTheme();
        }

        // ── 1. Audio Gesture Unlock (Critical for Sound) ──
        await this._unlockAudioContext();

        const setupEl = document.getElementById('setup-screen');
        if (setupEl) { 
            setupEl.classList.add('hiding'); 
            setTimeout(() => setupEl.classList.add('hidden'), 800); 
        }

        // ── 2. Handle Start Flow (New vs Continue) ──
        const isNew = (options.isNew !== undefined) ? options.isNew : true;

        if (isNew) {
            // New Session: Mandatory sequence
            this._showSIDInfoWindow(true);

            try {
                if (window.PersonalStartEngine) {

                    await PersonalStartEngine.playIntroMp3(this.moduleId);
                    
                    // ── Natural Hindi SID Announcement ──
                    await PersonalStartEngine.announceSID(window.SDP_THEME);
                    
                    // Reveal the manual start trigger
                    const trigger = document.getElementById('sid-start-trigger');
                    if (trigger) trigger.classList.add('reveal');
                    
                    // ── MANDATORY BLOCK: Wait for Manual Click ──
                    await new Promise((resolve) => {
                        const btn = document.getElementById('sid-start-btn');
                        if (btn) {
                            btn.onclick = async () => {

                                await this._unlockAudioAndSense(); 
                                resolve();
                            };
                        } else resolve(); 
                    });
                } else {
                    console.warn("[FocusUI] PersonalStartEngine MISSING. Bypassing intro block.");
                    this._revealStartBypass();
                }
            } catch (err) {
                console.error("[FocusUI] Personal Engine CRASHED. Bypassing for demo safety:", err);
                this._revealStartBypass();
            }

            await this._hideSIDInfoWindow();
        } else {
            // Continue Session: 2s Confirmation
            this._showSIDInfoWindow(false);

            await new Promise(r => setTimeout(r, 2000));
            await this._hideSIDInfoWindow();
        }

        // ── 3. Final Step: Launch Therapy ──
        this._launchTherapyVisuals(options, isNew);
    },

    /**
     * URGENT BYPASS: Forces the start trigger to appear even if the engine crashes.
     */
    _revealStartBypass() {
        const trigger = document.getElementById('sid-start-trigger');
        if (trigger) {
            trigger.classList.add('reveal');
            const btn = document.getElementById('sid-start-btn');
            if (btn) btn.onclick = () => this._unlockAudioAndSense();
        }
    },

    /**
     * Internal helper to launch visuals and engine after gates pass
     */
    async _launchTherapyVisuals(options, isNew) {
        const sidColor = this.generateSIDColor();
        let focusRoot = document.getElementById('focus-root');
        if (!focusRoot) {
            focusRoot = document.createElement('div');
            focusRoot.id = 'focus-root';
            document.body.appendChild(focusRoot);
        } else {
            focusRoot.innerHTML = '';
        }

        const orb = document.createElement('div');
        orb.className = 'focus-orb';
        focusRoot.appendChild(orb);

        const instrEl = document.createElement('div');
        instrEl.className = 'focus-instruction';
        instrEl.textContent = options.startText || this._t('focus.relax', 'Relax. Breathe naturally.');
        focusRoot.appendChild(instrEl);

        this._injectEndButton();
        this._injectVolumeControl();
        this._injectMusicToggle();

        const setupEl = document.getElementById('setup-screen');
        if (setupEl) { setupEl.classList.add('hidden'); }

        focusRoot.style.background = sidColor;
        focusRoot.classList.add('visible');
        setTimeout(() => { if (instrEl) instrEl.style.opacity = '0'; }, 3000);

        // Start Specialized Engine (Sound Start)
        const engineMap = {
            sdp: () => window.SDPEngine?.start(isNew),
            sdb: () => window.SDBEngine?.start(),
            sde: () => window.SDEEngine?.start(),
            sdm: () => window.SDMEngine?.start(options.mode || 'normal'),
            sds: () => window.SDSEngine?.startFlow(),
            sdd: () => window.SDDEngine?.start(options.mode || 'sitting'),
        };
        
        const engineFn = engineMap[this.moduleId];
        if (engineFn) {
            try {
                await engineFn();
                this._resumeAllAudio();
            } catch (e) { console.error('[FocusUI] Engine sound error:', e); }
        }

        document.addEventListener('fullscreenchange', () => {
            setTimeout(() => this._resumeAllAudio(), 200);
        }, { once: false });

        window.onbeforeunload = () => { this.endSession(); };
        await this.startSession(this.moduleId);
    },

    /**
     * Polls for window.SDP_THEME before proceeding
     */
    _waitForTheme() {
        return new Promise((resolve) => {
            if (window.SDP_THEME) return resolve();
            const timer = setInterval(() => {
                if (window.SDP_THEME) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(timer); resolve(); }, 5000);
        });
    },

    // ───────────────────────────────────────────
    // START GATE (REMOVED - INTEGRATED INTO LANDING)
    // ───────────────────────────────────────────

    // ───────────────────────────────────────────
    // SID INFO WINDOW (STEP 3)
    // ───────────────────────────────────────────
    _showSIDInfoWindow(isPermanent) {
        this._injectGuardStyles();
        let overlay = document.getElementById('sid-info-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sid-info-overlay';
            document.body.appendChild(overlay);
        }

        const id = window.SDP_THEME;
        if (!id) return;

        overlay.innerHTML = `
            <div class="sid-card">
                <div class="sid-label">${this._t('focus.sid_label', 'Your SINAANK ID')}</div>
                <div class="sid-value">${id.sid}</div>
                
                <div class="sid-grid">
                    <div class="sid-item">
                        <span class="lbl">${this._t('focus.color_label', 'Screen Color')}</span>
                        <span class="val" style="font-size: 1.1rem; margin-top: 0.6rem;">${id.color1Name} • ${id.color2Name}</span>
                    </div>
                    <div class="sid-item">
                        <span class="lbl">${this._t('focus.sound_label', 'Unique Sound')}</span>
                        <span class="val" style="font-size: 0.9rem; margin-top: 0.6rem; line-height: 1.8;">
                            ${this._t('focus.left', 'Left')}: ${id.frequencies.left} Hz<br>
                            ${this._t('focus.right', 'Right')}: ${id.frequencies.right} Hz
                        </span>
                    </div>
                </div>

                <div id="sid-start-trigger">
                    <button class="sid-start-btn" id="sid-start-btn">${this._t('focus.sid_start', 'Start Therapy')}</button>
                </div>
            </div>
        `;

        overlay.classList.add('visible');
    },

    /**
     * Smoothly fades out the SID information window
     */
    _hideSIDInfoWindow() {
        return new Promise((resolve) => {
            const overlay = document.getElementById('sid-info-overlay');
            if (overlay) {
                overlay.classList.remove('visible');
                // Decision: 1200ms smooth fade as requested
                setTimeout(resolve, 1200);
            } else {
                resolve();
            }
        });
    },

    // ── Resume all engine audio contexts (Chrome fullscreen bug fix) ──
    _resumeAllAudio() {
        const engines = ['SDSEngine', 'SDBEngine', 'SDEEngine', 'SDMEngine', 'SDDEngine', 'SDPEngine'];
        engines.forEach(name => {
            const eng = window[name];
            if (eng && eng.audioCtx && eng.audioCtx.state === 'suspended') {
                eng.audioCtx.resume().then(() => {

                }).catch(e => {});
            }
        });
    },

    // ───────────────────────────────────────────
    // FREQUENCY DISPLAY (SDB / SDE)
    // ───────────────────────────────────────────
    _showFrequency(container, data) {
        if (!data) return;
        const freqLabel = document.createElement('div');
        Object.assign(freqLabel.style, {
            color: this.config.textGrey,
            fontSize: '0.75rem', fontWeight: '400',
            letterSpacing: '2px', textAlign: 'center', lineHeight: '1.8'
        });
        if (data.l && data.r) {
            freqLabel.innerHTML = `L ${data.l} Hz<br>R ${data.r} Hz`;
        } else if (data.l || data.r) {
            freqLabel.textContent = `${data.l || data.r} Hz`;
        }
        container.appendChild(freqLabel);
    },

    // ───────────────────────────────────────────
    // END BUTTON
    // ───────────────────────────────────────────
    _injectEndButton() {
        const existing = document.getElementById('focus-end-btn-container');
        if (existing) existing.remove();

        const btnContainer = document.createElement('div');
        btnContainer.id = 'focus-end-btn-container';
        Object.assign(btnContainer.style, {
            position: 'fixed', bottom: '4rem', width: '100%',
            textAlign: 'center', zIndex: '3000'
        });

        const stopBtn = document.createElement('button');
        stopBtn.textContent = 'END';
        Object.assign(stopBtn.style, {
            background: 'transparent', border: 'none',
            color: 'rgba(154, 154, 154, 0.35)',
            fontSize: '0.7rem', letterSpacing: '3px',
            textTransform: 'uppercase', cursor: 'pointer',
            outline: 'none', padding: '10px'
        });

        stopBtn.onclick = async () => {
            if (!window.confirm('End Focus Session?')) return;
            if (window.PersonalStartEngine) window.PersonalStartEngine.stop();

            ['SDB', 'SDM', 'SDD', 'SDE', 'SDP', 'SDS'].forEach(m => {
                const engine = window[m + 'Engine'];
                if (engine && engine.stop) engine.stop();
            });

            await this.endSession();
            if (document.fullscreenElement) {
                try { await document.exitFullscreen(); } catch (e) { }
            }
            setTimeout(() => { window.location.href = '/dashboard/therapy.html'; }, 300);
        };

        btnContainer.appendChild(stopBtn);
        document.body.appendChild(btnContainer);
    },

    // ───────────────────────────────────────────
    // SID INFO GUARD STYLES
    // ───────────────────────────────────────────
    _injectGuardStyles() {
        if (document.getElementById('sid-guard-css')) return;
        const style = document.createElement('style');
        style.id = 'sid-guard-css';
        style.textContent = `
            #sid-info-overlay {
                position: fixed; inset: 0; z-index: 10000;
                background: rgba(1, 8, 16, 0.95);
                display: none; align-items: center; justify-content: center;
                -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
                opacity: 0; transition: opacity 0.6s ease-in-out;
            }
            #sid-info-overlay.visible { display: flex; opacity: 1; }
            .sid-card {
                width: 90%; max-width: 400px; padding: 2.5rem;
                background: rgba(10, 22, 40, 0.8);
                border: 1px solid rgba(0, 209, 255, 0.15);
                border-radius: 36px; text-align: center;
                animation: sidEntrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            @keyframes sidEntrance {
                from { opacity: 0; transform: translateY(30px) scale(0.95); }
                to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .sid-label { font-size: 0.65rem; letter-spacing: 0.25em; color: #00d1ff; opacity: 0.7; margin-bottom: 0.75rem; }
            .sid-value { font-size: 1.8rem; font-weight: 800; color: #fff; margin-bottom: 2rem; }
            .sid-grid { display: grid; grid-template-columns: 1fr; gap: 1.25rem; margin-bottom: 2.5rem; text-align: center; }
            .sid-item { padding: 1.25rem; background: rgba(0, 209, 255, 0.04); border-radius: 20px; border: 1px solid rgba(0,209,255,0.12); }
            .sid-item .val { display: block; font-weight: 700; color: #fff; }
            .sid-item .lbl { display: block; font-size: 0.7rem; color: #00d1ff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; }
            
            #sid-start-trigger { 
                opacity: 0; pointer-events: none; transition: opacity 0.5s ease; 
                margin-top: 1rem;
            }
            #sid-start-trigger.reveal { opacity: 1; pointer-events: all; }
            .sid-start-btn {
                background: linear-gradient(135deg, #00d1ff, #0078a0);
                color: #000; font-weight: 800; border: none; border-radius: 99px;
                padding: 1.1rem 2rem; cursor: pointer; font-size: 1rem; transition: all 0.2s;
                box-shadow: 0 10px 30px rgba(0,209,255,0.2);
                width: 100%;
            }
            .sid-start-btn:hover { box-shadow: 0 15px 40px rgba(0, 209, 255, 0.4); transform: translateY(-2px); }
        `;
        document.head.appendChild(style);
    },

    _injectVolumeControl() {
        if (document.getElementById('focus-volume-container')) return;
        const root = document.getElementById('focus-root');
        if (!root) return;

        const container = document.createElement('div');
        container.id = 'focus-volume-container';
        container.innerHTML = `
            <span class="volume-icon">🔊</span>
            <input type="range" id="focus-volume-slider" min="0" max="1" step="0.01" value="0.5">
        `;
        root.appendChild(container);

        const slider = document.getElementById('focus-volume-slider');
        slider.oninput = (e) => {
            const val = parseFloat(e.target.value);
            const engine = window[this.moduleId.toUpperCase() + 'Engine'];
            if (engine && engine.setVolume) {
                engine.setVolume(val);
            }
        };
    },

    _injectMusicToggle() {
        if (document.getElementById('focus-music-toggle')) return;
        const root = document.getElementById('focus-root');
        if (!root) return;

        const btn = document.createElement('div');
        btn.id = 'focus-music-toggle';
        btn.innerHTML = `
            <span class="music-icon">🎵</span>
            <span>Music Mode</span>
        `;
        root.appendChild(btn);

        btn.onclick = () => {
            const engine = window[this.moduleId.toUpperCase() + 'Engine'];
            if (engine && engine.toggleMusic) {
                const isActive = btn.classList.toggle('active');
                engine.toggleMusic(isActive);

            }
        };
    },

    injectEndButton() { this._injectEndButton(); },
    generateDNAColor() { return this.generateSIDColor(); }
};

// FocusUIController v2.0 Finalized.

