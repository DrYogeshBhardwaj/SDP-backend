window.SDSEngine = {
    audioCtx: null,
    masterGain: null,
    isPlaying: false,

    async init() {
        if (this.audioCtx) return;

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioCtx.createGain();

        // START audible (NOT ZERO)
        this.masterGain.gain.value = 0.25;

        // --- FINAL AUDIO BOOST FIX ---
        this.boostGain = this.audioCtx.createGain();
        this.boostGain.gain.value = 2.5; 
        this.masterGain.connect(this.boostGain);
        this.boostGain.connect(this.audioCtx.destination);
        // ------------------------------

        if (this.audioCtx.state === 'suspended') {
            await this.audioCtx.resume();
        }

        console.log('[SDS] init complete');
    },

    async startFlow() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        if (this.masterGain && this.audioCtx) {
            this.masterGain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.4, this.audioCtx.currentTime + 3);
        }

        await this.startBinauralLoop();
    },


    async startBinauralLoop() {
        if (!this.audioCtx) await this.init();

        const id = window.SDP_THEME || ThemeEngine.generateIdentity(null);
        const { left, right } = id.frequencies;

        const createOsc = (freq, pan) => {
            const osc = this.audioCtx.createOscillator();
            const panner = this.audioCtx.createStereoPanner();
            const g = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            panner.pan.value = pan;
            g.gain.value = 0.2; // DEMO: Significantly increased for audibility

            osc.connect(panner);
            panner.connect(g);
            g.connect(this.masterGain);

            osc.start();
            return osc;
        };

        this.binauralL = createOsc(left, -1);
        this.binauralR = createOsc(right, 1);

        console.log(`[SDS] binaural started at L:${left} R:${right}`);
    },

    stop() {
        if (this.binauralL) this.binauralL.stop();
        if (this.binauralR) this.binauralR.stop();

        if (this.audioCtx) {
            this.audioCtx.close();
            this.audioCtx = null;
        }
    }
};