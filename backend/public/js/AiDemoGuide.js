/**
 * AiDemoGuide.js - Sinaank Interactive Onboarding Core V3
 * Features: Multi-lingual step flow, Voice Synthesis, Demo Simulation, Interactive Chat.
 * Standardized for Sinaank Global Brand Standard (0.90 rate, Contextual Visuals).
 */

class AiDemoGuide {
    constructor() {
        this.currentStep = 0;
        this.lang = localStorage.getItem('lang') || 'en';
        this.isSpeaking = false;
        this.demoTimeout = null;
        
        this.container = null;
        this.contentArea = null;
        this.textEl = null;

        // Do not auto-initialize. Wait for open() call.
    }

    open() {
        this.lang = localStorage.getItem('lang') || 'en';
        if (!this.container) {
            this.init();
        } else {
            this.container.style.display = 'flex';
            this.container.classList.add('active');
            this.showPortal();
        }
    }

    init() {
        // Create root container
        this.container = document.createElement('div');
        this.container.id = 'ai-guide-root';
        document.body.appendChild(this.container);
        
        this.showPortal();
    }

    // Phase 0: Start Experience (Autoplay Compliance)
    showPortal() {
        this.container.innerHTML = `
            <div class="guide-portal">
                <div class="portal-card">
                    <img src="/assets/logo.png" class="portal-logo" alt="Sinaank Logo">
                    <h2 class="portal-title">Sinaank Digital Therapy</h2>
                    <p class="portal-desc">${this.lang === 'hi' ? 'आपका स्वागत है! सिनांक के डिजिटल अनुभव को शुरू करने के लिए नीचे क्लिक करें।' : 'Welcome! Click below to start your immersive Sinaank digital experience.'}</p>
                    <button class="portal-btn" id="guide-init-btn">
                        ${this.lang === 'hi' ? 'Experience शुरू करें →' : 'Start Experience →'}
                    </button>
                    <div class="portal-hint">Requires Headphones 🎧</div>
                </div>
            </div>
        `;
        this.container.style.display = 'flex';
        this.container.classList.add('active');

        document.getElementById('guide-init-btn').onclick = () => this.startFlow();
    }

    async startFlow() {

        const startSound = new Audio("/assets/audio/common/therapy_start.mp3");
        startSound.volume = 1.0;

        try {
            // AudioContext unlock
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') await ctx.resume();

            // Play sound immediately within the gesture handler
            await startSound.play();

        } catch(e) { 
            console.warn("[AiGuide] Audio failed:", e); 
        }

        // 1. Log Demo Start (Conversion Tracking)
        try {
            fetch("https://sdp-backend-production-c758.up.railway.app/api/log-demo", { method: 'POST', headers: { 'Content-Type': 'application/json' } }).catch(() => {});
        } catch(e) {}

        // 3. Unlock Speech Synth
        if (window.speechSynthesis) {
            window.speechSynthesis.resume();
            const utter = new SpeechSynthesisUtterance(" ");
            utter.volume = 0;
            window.speechSynthesis.speak(utter);
        }

        // 4. Unlock and Show Global Assistant
        if (window.sinaankAssistant) {
            window.sinaankAssistant.show();
            window.sinaankAssistant.setPosition('centered');
            window.sinaankAssistant.speak(' ', 'welcome'); // Wake up synth with welcome context
        }
        
        // Hide portal, show guide UI
        this.renderBaseUI();
        this.nextStep();
    }

    renderBaseUI() {
        this.container.innerHTML = `
            <div class="guide-overlay">
                <div class="demo-active-bg" id="demo-bg"></div>
                <div class="guide-ai-header">
                    <!-- Standardized Visual will be handled by sinaankAssistant component -->
                    <div style="margin-left: 170px">
                        <div class="ai-label">${window._t('support.ai_label')}</div>
                        <h4 style="margin:0">Sinaank Guide</h4>
                    </div>
                </div>
                <div class="guide-content" id="guide-content-area">
                    <p class="guide-text" id="guide-main-text"></p>
                    <div id="guide-interactive-slot"></div>
                </div>
                <div class="pulse-circle" id="demo-pulse"></div>
            </div>
        `;
        this.contentArea = document.getElementById('guide-content-area');
        this.textEl = document.getElementById('guide-main-text');
    }

    // Step Management
    nextStep() {
        this.currentStep++;
        this.executeStep(this.currentStep);
    }

    executeStep(step) {
        const slot = document.getElementById('guide-interactive-slot');
        slot.innerHTML = ''; // Clear previous slot
        
        const demoBg = document.getElementById('demo-bg');
        demoBg.className = 'demo-active-bg';

        switch(step) {
            case 1: // Powerful Intro (User Step 1 Upgrade)
                this.updateUI(window._t('guide.intro'));
                this.speak(window._t('guide.intro'), 'welcome', () => {
                    setTimeout(() => this.nextStep(), 1500); // 1.5s pause after intro text
                });
                break;

            case 2: // Rapid Experience (20 Second Rule)
                this.updateUI(window._t('guide.experience_title'));
                window.sinaankAssistant.setPosition('floating');
                slot.innerHTML = `
                    <div class="demo-buttons">
                        <button class="demo-btn" onclick="window.aiGuide.runDemo('relax')">🧘 ${this.lang === 'hi' ? 'Relax' : 'Relax'}</button>
                        <button class="demo-btn" onclick="window.aiGuide.runDemo('focus')">🎯 ${this.lang === 'hi' ? 'Focus' : 'Focus'}</button>
                        <button class="demo-btn" onclick="window.aiGuide.runDemo('sleep')">🌙 ${this.lang === 'hi' ? 'Sleep' : 'Sleep'}</button>
                    </div>
                `;
                break;

            case 3: // High Conversion Closing (Join Trigger Upgrade)
                const ctaText = window._t('guide.join_trigger');
                this.updateUI(ctaText);
                this.speak(ctaText, 'join');
                
                slot.innerHTML = `
                    <div class="cta-container-final">
                        <a href="/join.html?plan=growth" class="btn-join-huge">
                            ${window._t('guide.btn_cta')}
                        </a>
                        <p class="trust-signal">${window._t('guide.trust_signal')}</p>
                    </div>
                    <button onclick="window.aiGuide.close()" style="margin-top:2rem; opacity:0.6; background:none; border:none; cursor:pointer">${this.lang === 'hi' ? 'बंद करें' : 'Close'}</button>
                `;
                break;
        }
    }

    updateUI(text) {
        this.textEl.classList.remove('active');
        setTimeout(() => {
            this.textEl.innerText = text;
            this.textEl.classList.add('active');
        }, 300);
    }

    // Interactive Demo
    runDemo(mode) {
        if (this.demoTimeout) clearTimeout(this.demoTimeout);
        
        window.sinaankAssistant.stop();
        const demoBg = document.getElementById('demo-bg');
        const pulse = document.getElementById('demo-pulse');
        
        // Match BG with mode
        demoBg.className = `demo-active-bg ${mode}`;
        pulse.style.display = 'block';
        
        const demoTexts = {
            relax: "Relaxing your neural pathways... Feel the stress leave your body.",
            focus: "Calibrating your focus... Your mind is becoming sharp and clear.",
            sleep: "Slowing down brain activity... Preparing you for a deep, restful sleep."
        };
        const demoTextsHi = {
            relax: "神经网络 को रिलैक्स किया जा रहा है... तनाव को शरीर से बाहर महसूस करें।",
            focus: "Focus को कैलिब्रेट किया जा रहा है... आपका दिमाग तेज और साफ हो रहा है।",
            sleep: "ब्रेन एक्टिविटी को स्लो किया जा रहा है... गहरी नींद के लिए तैयार हों।"
        };

        const msg = (this.lang === 'hi') ? demoTextsHi[mode] : demoTexts[mode];
        this.speak(msg, mode); // Context sync

        // Run for 8 seconds then reset (Hitting the 20-30s total target)
        this.demoTimeout = setTimeout(() => {
            demoBg.className = 'demo-active-bg';
            pulse.style.display = 'none';
            this.nextStep();
        }, 8000);
    }

    // Centralized Voice & Synthesis via Global Assistant
    speak(text, context = 'welcome', callback = null) {
        if (window.sinaankAssistant) {
            window.sinaankAssistant.speak(text, context, callback);
        }
    }

    setupVoiceRecognition() {
        const micBtn = document.getElementById('guide-mic-btn');
        const input = document.getElementById('guide-chat-input');
        if (!micBtn || !input) return;

        micBtn.onclick = () => {
            if (window.sinaankAssistant) {
                window.sinaankAssistant.startListening(
                    (transcript) => {
                        input.value = transcript;
                        this.handleTextChat();
                    },
                    () => micBtn.classList.remove('active')
                );
                micBtn.classList.add('active');
            }
        };
    }

    handleTextChat() {
        const input = document.getElementById('guide-chat-input');
        const query = input.value.trim();
        if(!query) return;
        
        input.value = 'AI is thinking...';
        // Simulated AI response for landing demo
        const response = (this.lang === 'hi') 
            ? "Sinaank के बारे में पूछने के लिए धन्यवाद। हमारी थेरेपी साइंस-बैक्ड है। ज़्यादा जानकारी के लिए आप ₹779 वाला प्लान जॉइन कर सकते हैं।" 
            : "Thank you for asking about Sinaank. Our digital therapy is science-backed. To experience the full version, consider joining our ₹779 Personal plan.";
        
        setTimeout(() => {
            input.value = '';
            this.updateUI(response);
            this.speak(response, 'welcome');
        }, 1000);
    }

    close() {
        this.container.classList.remove('active');
        if (window.sinaankAssistant) window.sinaankAssistant.hide();
        setTimeout(() => {
            this.container.style.display = 'none';
        }, 500);
    }
}

window.aiGuide = new AiDemoGuide();
window.openSinaankGuide = () => window.aiGuide.open();

