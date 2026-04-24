/**
 * SINAANK SDB (Digital Breathing) Engine
 * Handles Natural Breathing Ambient Sound and Heartbeat
 */
window.SDBEngine = {
    isPlaying: false,
    heartbeatInterval: null,
    masterGain: null,
    pulseInterval: null,

    async start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        try {
            this.startAmbient();
            this.startDemoPulse();
            return { moduleId: 'sdb', startText: 'Relax. Breathe naturally.', metadata: { l: this.baseFreq, r: null } };
        } catch (err) {
            console.error("SDB Start Error:", err);
            this.stop();
        }
    },

    setVolume(value) {
        if (this.masterGain && this.audioCtx) {
            const vol = Math.max(0, Math.min(1, value));
            // Boosted scale for speaker support
            const targetGain = vol * 0.8; 
            this.masterGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
        }
    },

    startAmbient() {
        const id = window.SDP_THEME || (window.ThemeEngine ? ThemeEngine.generateIdentity(null) : null);
        const baseFreq = id ? id.frequencies.left : 200;
        this.baseFreq = baseFreq; 

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.osc = this.audioCtx.createOscillator();
        this.masterGain = this.audioCtx.createGain();

        this.osc.type = 'sine';
        this.osc.frequency.setValueAtTime(baseFreq, this.audioCtx.currentTime);
        
        this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 3);

        this.osc.connect(this.masterGain);
        
        // --- FINAL AUDIO BOOST FIX ---
        this.boostGain = this.audioCtx.createGain();
        this.boostGain.gain.value = 2.5; 
        this.panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
        if (this.panner) this.panner.pan.value = 0; 

        if (this.panner) {
            this.masterGain.connect(this.panner);
            this.panner.connect(this.boostGain);
        } else {
            this.masterGain.connect(this.boostGain);
        }
        
        this.boostGain.connect(this.audioCtx.destination);
        // ------------------------------
        this.osc.start();
        return { l: this.baseFreq, r: null };
    },

    startDemoPulse() {
        this.pulseInterval = setInterval(() => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
            g.gain.setValueAtTime(0, this.audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.04, this.audioCtx.currentTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start();
            osc.stop(this.audioCtx.currentTime + 2);
        }, 12000);
    },

    async stop() {
        this.isPlaying = false;
        if (this.pulseInterval) clearInterval(this.pulseInterval);
        if (this.osc) {
            try { this.osc.stop(); } catch(e){}
        }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch(e){}
        }
        this.masterGain = null;
        this.audioCtx = null;
    }
};

