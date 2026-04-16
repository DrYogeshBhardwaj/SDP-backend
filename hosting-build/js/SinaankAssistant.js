/**
 * SinaankAssistant.js - Global AI Voice & Visual Controller V3
 * Standardizes the Therapeutic Voice (0.90) and Contextual Visual Strategy.
 */

class SinaankAssistant {
    constructor() {
        this.synth = window.speechSynthesis;
        this.container = null;
        this.lang = localStorage.getItem('lang') || 'en';
        this.isSpeaking = false;
        
        // Final Bible Standards V3
        this.VOICE_RATE = 0.90;
        this.SENTENCE_PAUSE = 500; // ms
        this.state = 'idle'; // idle, speaking, listening, thinking
        this.isFirstMention = true;
        
        // Asset Mapping
        this.CONTEXT_ASSETS = {
            'welcome': '/assets/therapy/welcome.png',
            'relax': '/assets/therapy/relax.png',
            'focus': '/assets/therapy/focus.png',
            'sleep': '/assets/therapy/sleep.png',
            'stress': '/assets/therapy/stress.png',
            'fatigue': '/assets/therapy/fatigue.png',
            'growth': '/assets/therapy/growth.png',
            'business': '/assets/therapy/growth.png',
            'join': '/assets/therapy/join.png'
        };

        this.init();
    }

    init() {
        if (document.getElementById('sinaank-assistant-root')) return;

        this.container = document.createElement('div');
        this.container.id = 'sinaank-assistant-root';
        this.container.className = 'sinaank-assistant floating';
        
        this.container.innerHTML = `
            <div class="sinaank-visual-box">
                <div class="sinaank-glow-layer"></div>
                <img src="/assets/therapy/welcome.png" class="sinaank-context-img visible" id="sinaank-ctx-ui">
            </div>
            <div class="sinaank-caption-box">
                <p class="sinaank-caption-text" id="sinaank-caption-ui"></p>
            </div>
        `;
        
        document.body.appendChild(this.container);
        this.ctxImg = document.getElementById('sinaank-ctx-ui');
        this.captionBox = document.getElementById('sinaank-caption-ui');
        this.glowLayer = this.container.querySelector('.sinaank-glow-layer');
    }

    setState(state) {
        this.state = state;
        this.container.classList.remove('idle', 'speaking', 'listening', 'thinking');
        this.container.classList.add(state);
        
        if (state === 'thinking') {
            this.captionBox.textContent = "...";
            this.captionBox.style.opacity = "0.6";
        } else {
            this.captionBox.style.opacity = "1";
        }
    }

    /**
     * Update the visual context (Abstract Image)
     * @param {string} type 
     */
    setContext(type) {
        if (!this.CONTEXT_ASSETS[type]) return;
        
        // 400ms Fade Transition Logic
        this.ctxImg.style.opacity = '0';
        
        setTimeout(() => {
            this.ctxImg.src = this.CONTEXT_ASSETS[type];
            this.ctxImg.style.opacity = '1';
        }, 400);
    }

    setPosition(pos) {
        this.container.classList.remove('floating', 'centered', 'side');
        this.container.classList.add(pos);
    }

    show() {
        this.container.classList.add('active');
        this.container.style.display = 'flex';
    }

    hide() {
        this.container.classList.remove('active');
        this.container.style.display = 'none';
        this.stop();
    }

    /**
     * Therapeutic Speech Engine (Split with Pauses)
     * @param {string} text 
     * @param {string} context - Optional visual context to trigger
     * @param {Function} onEnd 
     */
    speak(text, context = null, onEnd = null) {
        if (!this.synth) return;
        this.synth.cancel();

        if (context) this.setContext(context);

        // 1. Text Normalization
        const normalized = this.normalize(text);
        
        // 2. Split into sentences for 500ms pauses
        const sentences = normalized.match(/[^.!?]+[.!?]*/g) || [normalized];
        
        this.setState('speaking');
        
        this.speakSequential(sentences, 0, () => {
            this.setState('idle');
            if (onEnd) onEnd();
        });
    }

    normalize(text) {
        const SINAANK_WORD = "Sinaank";
        const SINAANK_HINDI = "सिनांक";
        const SINAANK_MOBILE_HINDI = "Sinaank Mobile Therapy";
        const SINAANK_MOBILE_HINDI_HI = "सिनांक मोबाइल थेरेपी";

        let result = text;
        
        // Replacement for all-caps SINAANK and SMT
        const replaceBrand = (txt) => {
            let replaced = txt.replace(/SINAANK/g, SINAANK_WORD)
                              .replace(/SMT/g, SINAANK_WORD);
            
            if (this.isFirstMention) {
                replaced = replaced.replace(new RegExp(SINAANK_WORD, 'g'), (match, offset, string) => {
                    if (this.isFirstMention) {
                        this.isFirstMention = false;
                        return this.lang === 'hi' ? SINAANK_MOBILE_HINDI_HI : SINAANK_MOBILE_HINDI;
                    }
                    return match;
                });
            }
            return replaced;
        };

        return replaceBrand(result);
    }

    speakSequential(sentences, index, callback) {
        if (index >= sentences.length) {
            if (callback) callback();
            return;
        }

        const part = sentences[index].trim();
        if (!part) return this.speakSequential(sentences, index + 1, callback);

        // Update Captions
        this.captionBox.textContent = part;

        const utterance = new SpeechSynthesisUtterance(part);
        utterance.lang = this.lang === 'hi' ? 'hi-IN' : 'en-US';
        utterance.rate = this.VOICE_RATE;
        utterance.pitch = 1.0;

        // Custom Voice Priority (STRICTLY FEMALE)
        const voices = this.synth.getVoices();
        const preferred = voices.find(v => v.lang === utterance.lang && v.name.includes('Neural') && v.name.includes('Female'))
                       || voices.find(v => v.lang === utterance.lang && v.name.includes('Female'))
                       || voices.find(v => v.lang === utterance.lang && (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Edge')))
                       || voices.find(v => v.lang === utterance.lang);

        if (preferred) utterance.voice = preferred;

        utterance.onend = () => {
            // Mandatory 500ms pause Bible Standard
            setTimeout(() => {
                this.speakSequential(sentences, index + 1, callback);
            }, this.SENTENCE_PAUSE);
        };

        utterance.onerror = () => {
            this.speakSequential(sentences, index + 1, callback);
        };

        this.synth.speak(utterance);
    }

    stop() {
        this.synth.cancel();
        this.setState('idle');
    }

    // --- STT INTEGRATION (Voice Agent Capabilities) ---
    startListening(onResult, onEnd) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("STT not supported");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = this.lang === 'hi' ? 'hi-IN' : 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => this.setState('listening');
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (onResult) onResult(transcript);
        };
        recognition.onend = () => {
            if (this.state === 'listening') this.setState('idle');
            if (onEnd) onEnd();
        };
        recognition.onerror = (e) => {
            console.error("STT Error:", e);
            this.setState('idle');
        };

        recognition.start();
    }

    setThinking() {
        this.setState('thinking');
    }
}

// Global Singleton Instance
window.addEventListener('load', () => {
    // Ensure voices are loaded for better initial selection
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
            if (!window.sinaankAssistant) window.sinaankAssistant = new SinaankAssistant();
        };
    }
    // Fallback if event doesn't fire
    setTimeout(() => {
        if (!window.sinaankAssistant) window.sinaankAssistant = new SinaankAssistant();
    }, 100);
});
