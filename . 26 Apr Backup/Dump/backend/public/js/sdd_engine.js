/**
 * SINAANK SDD (Digital Digestion) Engine
 * Handles Digestion Cues, Zen Pings, and Heartbeat
 */
window.SDDEngine = {
    isPlaying: false,
    mode: 'sitting',
    heartbeatInterval: null,
    cueTimeout: null,
    masterGain: null,
    pulseInterval: null,
    walkingCtx: null,

    async start(mode = 'sitting') {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.mode = mode;

        try {
            if (this.mode === 'sitting') {
                this.runZenPingLoop();
            } else {
                this.startWalkingAudio();
            }
            this.startDemoPulse();
            
            return { moduleId: 'sdd', startText: 'Focus on your digestion.', metadata: { mode } };
        } catch (err) {
            console.error("SDD Start Error:", err);
            this.stop();
        }
    },

    setVolume(value) {
        if (this.masterGain && (this.walkingCtx || this.zenCtx)) {
            const vol = Math.max(0, Math.min(1, value));
            // Boosted scale (0.8 max)
            const targetGain = vol * 0.8; 
            const ctx = (this.walkingCtx || this.zenCtx);
            this.masterGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.1);
        }
    },

    runZenPingLoop() {
        if (!this.isPlaying) return;
        this.playZenPing();
        const randomDelay = (70 + Math.floor(Math.random() * 51)) * 1000;
        this.cueTimeout = setTimeout(() => this.runZenPingLoop(), randomDelay);
    },

    playZenPing() {
        if (!this.zenCtx) this.zenCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (!this.masterGain) {
            this.masterGain = this.zenCtx.createGain();
            this.masterGain.gain.setValueAtTime(0.4, this.zenCtx.currentTime);

            // --- FINAL AUDIO BOOST FIX ---
            this.boostGain = this.zenCtx.createGain();
            this.boostGain.gain.value = 2.5; // Speaker boost
            this.masterGain.connect(this.boostGain);
            this.boostGain.connect(this.zenCtx.destination);
            // ------------------------------
        }
        
        const osc = this.zenCtx.createOscillator();
        const g = this.zenCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.zenCtx.currentTime);
        g.gain.setValueAtTime(0, this.zenCtx.currentTime);
        g.gain.linearRampToValueAtTime(0.05, this.zenCtx.currentTime + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, this.zenCtx.currentTime + 2.0);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start();
        osc.stop(this.zenCtx.currentTime + 2.5);
    },

    startWalkingAudio() {
        const id = window.SDP_THEME || (window.ThemeEngine ? ThemeEngine.generateIdentity(null) : null);
        const frequencies = id ? id.frequencies : { left: 200, right: 207 };

        this.walkingCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.walkingCtx.createGain();
        this.masterGain.gain.setValueAtTime(0, this.walkingCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.4, this.walkingCtx.currentTime + 3);

        // --- FINAL AUDIO BOOST FIX ---
        this.walkingBoost = this.walkingCtx.createGain();
        this.walkingBoost.gain.value = 2.5; 
        this.masterGain.connect(this.walkingBoost);
        this.walkingBoost.connect(this.walkingCtx.destination);
        // ------------------------------

        const createOsc = (freq, pan) => {
            const osc = this.walkingCtx.createOscillator();
            const panner = this.walkingCtx.createStereoPanner ? this.walkingCtx.createStereoPanner() : null;
            osc.type = 'sine';
            osc.frequency.value = freq;
            if (panner) {
                panner.pan.value = pan;
                osc.connect(panner);
                panner.connect(this.masterGain);
            } else {
                osc.connect(this.masterGain);
            }
            osc.start();
            return osc;
        };

        this.walkingOscs = [
            createOsc(frequencies.left, -1),
            createOsc(frequencies.right, 1)
        ];
    },

    startDemoPulse() {
        this.pulseInterval = setInterval(() => {
            const ctx = (this.walkingCtx || this.zenCtx);
            if (!ctx || !this.masterGain) return;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            g.gain.setValueAtTime(0, ctx.currentTime);
            g.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start();
            osc.stop(ctx.currentTime + 2);
        }, 12000);
    },

    async stop() {
        this.isPlaying = false;
        if (this.pulseInterval) clearInterval(this.pulseInterval);
        clearTimeout(this.cueTimeout);
        if (this.walkingOscs) {
            this.walkingOscs.forEach(o => { try { o.stop(); } catch(e){} });
        }
        if (this.walkingCtx) {
            try { this.walkingCtx.close(); } catch(e){}
        }
        if (this.zenCtx) {
            try { this.zenCtx.close(); } catch(e){}
        }
        this.masterGain = null;
        this.walkingCtx = null;
        this.zenCtx = null;
    }
};

