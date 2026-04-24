/**
 * SINAANK SDM (Digital Movement) Engine
 * Handles Walking Cues, DNA Personalization, and Heartbeat
 */
window.SDMEngine = {
    isPlaying: false,
    mode: 'normal',
    heartbeatInterval: null,
    cueTimeout: null,
    async start(mode = 'normal') {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.mode = mode;
        this.startTime = new Date();

        try {
            this.startAmbient();
            this.startDemoPulse();
            
            setTimeout(() => this.runCueLoop(), 15000);
            
            return { moduleId: 'sdm', startText: 'Focus on your movement.', metadata: { mode } };
        } catch (err) {
            console.error("SDM Start Error:", err);
            this.stop();
        }
    },

    setVolume(value) {
        if (this.masterGain && this.audioCtx) {
            const vol = Math.max(0, Math.min(1, value));
            // Boosted scale (0.8 max) for speaker support
            const targetGain = vol * 0.8; 
            this.masterGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
        }
    },

    startAmbient() {
        const id = window.SDP_THEME || (window.ThemeEngine ? ThemeEngine.generateIdentity(null) : null);
        const frequencies = id ? id.frequencies : { left: 200, right: 207 };

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        
        // --- FINAL AUDIO BOOST FIX ---
        this.boostGain = this.audioCtx.createGain();
        this.boostGain.gain.value = 2.5; // Speaker amplification
        // ------------------------------

        this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.4, this.audioCtx.currentTime + 5);
        
        this.masterGain.connect(this.boostGain);
        this.boostGain.connect(this.audioCtx.destination);

        const createOsc = (freq, pan) => {
            const osc = this.audioCtx.createOscillator();
            const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
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

        this.oscs = [
            createOsc(frequencies.left, -1),
            createOsc(frequencies.right, 1)
        ];
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

    playCue(cue) {
        if (!this.isPlaying) return;
        const audio = new Audio(`/assets/audio/cues/${cue.file}`);
        audio.crossOrigin = "anonymous";
        audio.volume = 1.0;

        // --- FINAL AUDIO BOOST FIX (CUES) ---
        if (this.audioCtx) {
            const source = this.audioCtx.createMediaElementSource(audio);
            const gainNode = this.audioCtx.createGain();
            gainNode.gain.value = 2.5; // BOOST
            source.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);
        }
        // ------------------------------------

        audio.play().catch(e => console.warn('[SDM] Audio blocked or failed:', e));
    },

    runCueLoop() {
        if (!this.isPlaying) return;
        const mobile = ThemeEngine.getMobile();
        const dateStr = new Date().toISOString().split('T')[0];
        const seed = ThemeEngine.hashMobile(mobile + dateStr);
        const filteredCues = this.cues.filter(c => c.tags.includes('all') || c.tags.includes(this.mode));
        const timeIndex = Math.floor(Date.now() / 20000); 
        const cueIndex = (seed + timeIndex) % filteredCues.length;
        this.playCue(filteredCues[cueIndex]);
        const delay = (15 + (seed % 15)) * 1000;
        this.cueTimeout = setTimeout(() => this.runCueLoop(), delay);
    },

    async stop() {
        this.isPlaying = false;
        if (this.pulseInterval) clearInterval(this.pulseInterval);
        clearTimeout(this.cueTimeout);
        if (this.oscs) {
            this.oscs.forEach(osc => { try { osc.stop(); } catch(e){} });
        }
        if (this.audioCtx) {
            try { this.audioCtx.close(); } catch(e){}
        }
        this.masterGain = null;
        this.audioCtx = null;
    }
};

