/**
 * SINAANK SDP (Digital Pause) Engine
 * Handles Neutral Digital Pause Ambient Sound and Heartbeat
 */
window.SDPEngine = {
    isPlaying: false,
    heartbeatInterval: null,
    masterGain: null,
    pulseInterval: null,
    musicOscs: [],
    isMusicMode: false,

    async start(isNewRequested) {
        if (this.isPlaying) return;
        this.isPlaying = true;

        try {
            this.applySIDColor();
            this.startAmbient();
            this.startDemoPulse();

            if (window.unlockSDPScreen) window.unlockSDPScreen();

            return { moduleId: 'sdp', startText: 'Disconnect and relax.', metadata: { type: 'neutral', intensity: 'low' } };
        } catch (err) {
            console.error("SDP Start Error:", err);
            this.stop();
            if (window.unlockSDPScreen) window.unlockSDPScreen();
        }
    },

    applySIDColor() {
        const root = document.getElementById('focus-root');
        if (root && window.FocusUIController) {
            root.style.background = window.FocusUIController.generateSIDColor();
        }
    },

    setVolume(value) {
        if (this.masterGain && this.audioCtx) {
            const vol = Math.max(0, Math.min(1, value));
            // Boosted scale (0-0.8) for better speaker output
            const targetGain = vol * 0.8; 
            this.masterGain.gain.setTargetAtTime(targetGain, this.audioCtx.currentTime, 0.1);
            console.log(`[SDPEngine] Volume set to ${Math.round(vol * 100)}% (Boosted Gain: ${targetGain.toFixed(3)})`);
        }
    },

    toggleMusic(enabled) {
        this.isMusicMode = enabled;
        if (enabled) {
            this.startMusicPad();
        } else {
            this.stopMusicPad();
        }
    },

    startAmbient() {
        const id = window.SDP_THEME || (window.ThemeEngine ? ThemeEngine.generateIdentity(null) : null);
        const frequencies = id ? id.frequencies : { left: 200, right: 207 };

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();
        
        // --- FINAL AUDIO BOOST FIX ---
        this.boostGain = this.audioCtx.createGain();
        this.boostGain.gain.value = 2.5; // Gain boost for speakers
        // ------------------------------

        // Default start at boosted 0.4 gain
        this.masterGain.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.masterGain.gain.linearRampToValueAtTime(0.4, this.audioCtx.currentTime + 4);
        
        this.masterGain.connect(this.boostGain);
        this.boostGain.connect(this.audioCtx.destination);

        const playOsc = (freq, panValue) => {
            const osc = this.audioCtx.createOscillator();
            const panner = this.audioCtx.createStereoPanner ? this.audioCtx.createStereoPanner() : null;
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            
            if (panner) {
                panner.pan.setValueAtTime(panValue, this.audioCtx.currentTime);
                osc.connect(panner);
                panner.connect(this.masterGain);
            } else {
                osc.connect(this.masterGain);
            }
            osc.start();
            return osc;
        };

        this.oscs = [
            playOsc(frequencies.left, -1),
            playOsc(frequencies.right, 1)
        ];
    },

    startMusicPad() {
        if (!this.audioCtx || !this.masterGain) return;
        
        // Meditative chord: C Major 7th (Deep & Rich)
        const notes = [65.41, 82.41, 98.00, 123.47, 130.81, 164.81]; // C2, E2, G2, B2, C3, E3
        
        this.musicOscs = notes.map((freq, i) => {
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            
            osc.type = i % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
            
            // Rich texture: slow LFO-like volume modulation
            g.gain.setValueAtTime(0, this.audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.04, this.audioCtx.currentTime + 3 + i);
            
            osc.connect(g);
            g.connect(this.masterGain);
            
            osc.start();
            return { osc, g };
        });
    },

    stopMusicPad() {
        if (this.musicOscs) {
            this.musicOscs.forEach(item => {
                try {
                    item.g.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + 2);
                    setTimeout(() => item.osc.stop(), 2100);
                } catch(e){}
            });
            this.musicOscs = [];
        }
    },

    startDemoPulse() {
        // Periodic subtle high-frequency chime to confirm activity
        this.pulseInterval = setInterval(() => {
            if (!this.audioCtx || !this.masterGain) return;
            
            const osc = this.audioCtx.createOscillator();
            const g = this.audioCtx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime); // A5 note
            
            g.gain.setValueAtTime(0, this.audioCtx.currentTime);
            g.gain.linearRampToValueAtTime(0.05, this.audioCtx.currentTime + 0.1);
            g.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 1.5);
            
            osc.connect(g);
            g.connect(this.masterGain);
            
            osc.start();
            osc.stop(this.audioCtx.currentTime + 2);
        }, 12000); // Every 12 seconds
    },

    async stop() {
        this.isPlaying = false;
        if (this.pulseInterval) clearInterval(this.pulseInterval);
        this.stopMusicPad();
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

