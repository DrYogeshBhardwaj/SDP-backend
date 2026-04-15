/**
 * Sinaank Personal Start Engine V3 (Production Locked)
 * ─────────────────────────────────────────────────────────────
 * Standardized for Sinaank Global Brand Standard (0.90 rate, Contextual Visuals).
 */

window.PersonalStartEngine = {
    config: {
        introMaxTime: 5000,
        silenceGap: 500,
        personality: {
            sdb: { label: 'sound dominant', context: 'relax', frequency: 25000 },
            sdr: { label: 'color dominant', context: 'focus', frequency: 45000 },
            sdm: { label: 'rhythm dominant', context: 'focus', frequency: 60000 },
            sds: { label: 'deep whisper', context: 'sleep', frequency: 0 },
            sde: { label: 'visual dominant', context: 'relax', frequency: 35000 },
            sdd: { label: 'gut-brain sync', context: 'relax', frequency: 40000 },
            sdp: { label: 'calibration', context: 'welcome', frequency: 30000 }
        }
    },

    userName: 'Member',
    isFirstRun: true,
    injectionInterval: null,

    async init(moduleId) {
        this.moduleId = moduleId.toLowerCase();
        this._detectUser();
        const p = this.config.personality[this.moduleId] || this.config.personality.sdp;
        if (this._checkResume()) return true;

        let introText = this.isFirstRun 
            ? `नमस्ते ${this.userName}. मैं सिनांक मोबाइल थेरेपी हूँ. आपका आईडी कैलिब्रेशन सफल रहा. `
            : `स्वागत है ${this.userName}. चलिए वापस चलते हैं. `;
        
        introText += `यह ${p.label} सत्र आपके लिए तैयार है. `;

        await this._speak(introText, p.context);
        await new Promise(resolve => setTimeout(resolve, this.config.silenceGap));
        this._setupInjection(p.frequency);

        sessionStorage.setItem('ssb_last_start', Date.now().toString());
        localStorage.setItem('ssb_has_run_before', 'true');
        return true;
    },

    stop() {
        if (this.injectionInterval) clearInterval(this.injectionInterval);
        this.injectionInterval = null;
        if (window.sinaankAssistant) window.sinaankAssistant.stop();
    },

    _detectUser() {
        try {
            const session = JSON.parse(localStorage.getItem('ssb_session') || '{}');
            this.userName = (session.name || 'Member').replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '');
            this.isFirstRun = !localStorage.getItem('ssb_has_run_before');
        } catch (e) {
            this.userName = 'Member';
            this.isFirstRun = true;
        }
    },

    _checkResume() {
        const lastStart = parseInt(sessionStorage.getItem('ssb_last_start') || '0');
        return (Date.now() - lastStart < 120000);
    },

    _speak(text, context = 'welcome') {
        return new Promise((resolve) => {
            if (!text) return resolve();
            if (window.sinaankAssistant) {
                window.sinaankAssistant.speak(text, context, resolve);
            } else resolve();
        });
    },

    async playIntroMp3(moduleId) {
        const path = `/assets/audio/intro/intro_${moduleId.toLowerCase()}.mp3`;
        return new Promise((resolve) => {
            const audio = new Audio(path);
            audio.crossOrigin = "anonymous";
            audio.volume = 1.0; 

            // --- FINAL AUDIO BOOST FIX (Speaker Support) ---
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const source = ctx.createMediaElementSource(audio);
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
            // ------------------------------------------------

            audio.onended = () => {
                ctx.close().catch(() => {});
                resolve();
            };
            audio.onerror = () => {
                ctx.close().catch(() => {});
                resolve();
            };
            audio.play().catch(() => resolve());
        });
    },

    async announceSID(sidData) {
        if (!sidData) return true;
        const sidDigits = HindiNumberConverter.toDigits(sidData.sid.toString().replace(/\D/g, ''));
        const leftHzWords = HindiNumberConverter.toWords(sidData.frequencies.left);
        const rightHzWords = HindiNumberConverter.toWords(sidData.frequencies.right);

        const phrase1 = `सिनांक आईडी कोड. ${sidDigits}.`;
        const phrase2 = `आपकी प्रोफाइल कलर. ${sidData.color1Name} और ${sidData.color2Name}.`;
        const phrase3 = `आपकी दिमागी फ्रीक्वेंसी. बायीं ओर. ${leftHzWords} हर्ट्ज़. दायीं ओर. ${rightHzWords} हर्ट्ज़.`;

        await this._speak(`${phrase1} ${phrase2} ${phrase3}`, 'focus');
        return true;
    },

    _setupInjection(frequency) {
        if (this.injectionInterval) clearInterval(this.injectionInterval);
        if (frequency <= 0) return;
        this.injectionInterval = setInterval(() => {
            if (window.sinaankAssistant) window.sinaankAssistant.speak(`${this.userName} जी...`, 'welcome');
        }, frequency);
    }
};

const HindiNumberConverter = {
    words: {
        0: 'शून्य', 1: 'एक', 2: 'दो', 3: 'तीन', 4: 'चार', 5: 'पाँच', 6: 'छह', 7: 'सात', 8: 'आठ', 9: 'नौ', 10: 'दस',
        11: 'ग्यारह', 12: 'बारह', 13: 'तेरह', 14: 'चौदह', 15: 'पन्द्रह', 16: 'सोलह', 17: 'सत्रह', 18: 'अठारह', 19: 'उन्नीस', 20: 'बीस',
        30: 'तीस', 40: 'चालीस', 50: 'पचास', 60: 'साठ', 70: 'सत्तर', 80: 'अस्सी', 90: 'नब्बे'
    },
    toWords(num) {
        num = parseInt(num);
        if (num < 21) return this.words[num] || num;
        if (num < 100) {
            const units = num % 10;
            const tens = num - units;
            return (units > 0 ? this.words[units] + ' ' : '') + this.words[tens];
        }
        if (num < 1000) {
            const hundreds = Math.floor(num / 100);
            return this.words[hundreds] + ' सौ ' + this.toWords(num % 100);
        }
        const thousands = Math.floor(num / 1000);
        return this.words[thousands] + ' हजार ' + this.toWords(num % 1000);
    },
    toDigits(str) {
        return str.split('').map(d => this.words[d] || d).join(' ');
    }
};
