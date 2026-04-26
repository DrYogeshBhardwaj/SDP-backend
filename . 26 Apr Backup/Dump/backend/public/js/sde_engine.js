/**
 * SINAANK SDE (Digital Eye Relax) Engine
 * Handles Eye Relaxation Ambient Sound and Heartbeat
 */
window.SDEEngine = {
    isPlaying: false,
    heartbeatInterval: null,
    masterGain: null,
    pulseInterval: null,

    async start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        try {
            this.startEngine();
            this.startDemoPulse();
            return { moduleId: 'sde', startText: 'Relax eyes. Focus.', metadata: { l: this.lFreq, r: this.rFreq } };
        } catch (err) {
            console.error("SDE Start Error:", err);
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

    startEngine() {
        const id = window.SDP_THEME || (window.ThemeEngine ? ThemeEngine.generateIdentity(null) : null);
        const lFreq = id ? id.frequencies.left : 200;
        const rFreq = id ? id.frequencies.right : 207;
        this.lFreq = lFreq; this.rFreq = rFreq;
        
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.oscL = this.audioCtx.createOscillator();
        this.oscR = this.audioCtx.createOscillator();
        const panL = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : this.audioCtx.createGain();
        const panR = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : this.audioCtx.createGain();
        this.masterGain = this.audioCtx.createGain();

        this.oscL.type = 'sine';
        this.oscR.type = 'sine';
        this.oscL.frequency.setValueAtTime(lFreq, this.audioCtx.currentTime);
        this.oscR.frequency.setValueAtTime(rFreq, this.audioCtx.currentTime);
        
        if (this.audioCtx.createStereoPanner) {
            panL.pan.value = -1;
            panR.pan.value = 1;
        }

        this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.4, this.audioCtx.currentTime + 3); 

        // --- FINAL AUDIO BOOST FIX ---
        this.boostGain = this.audioCtx.createGain();
        this.boostGain.gain.value = 2.5; // Speaker boost
        // ------------------------------

        this.oscL.connect(panL);
        this.oscR.connect(panR);
        panL.connect(this.masterGain);
        panR.connect(this.masterGain);
        
        this.masterGain.connect(this.boostGain);
        this.boostGain.connect(this.audioCtx.destination);

        this.oscL.start();
        this.oscR.start();
        return { l: this.lFreq, r: this.rFreq };
    },

    startDemoPulse() {
        this.pulseInterval = setInterval(() => {
            if (!this.audioCtx || !this.masterGain) return;
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            osc.index = 880; 
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
        if (this.oscL) { try { this.oscL.stop(); } catch(e){} }
        if (this.oscR) { try { this.oscR.stop(); } catch(e){} }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch(e){}
        }
        this.masterGain = null;
        this.audioCtx = null;
    }
};
