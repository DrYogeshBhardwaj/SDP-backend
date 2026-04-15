/**
 * SupportHub.js - Sinaank AI Support Core V3
 * Features: Text Chat, Voice to Text, AI Speech Synthesis, Admin Override.
 * Standardized for Sinaank Global Brand Standard (0.90 rate, Contextual Visuals).
 */

class SinaankSupport {
    constructor() {
        this.isOpen = false;
        this.isListening = false;
        this.init();
    }

    init() {
        this.render();
        this.setupEventListeners();
        this.loadChatHistory();
    }

    render() {
        const container = document.createElement('div');
        container.id = 'sinaank-support-container';
        container.innerHTML = `
            <button class="support-fab" id="support-toggle-btn">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338C8.47 21.513 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
            </button>
            <div class="support-window" id="support-window">
                <div class="support-header">
                    <div class="support-header-icon" id="support-header-visual">
                        <!-- Contextual Visual will be synced from SinaankAssistant if available -->
                    </div>
                    <div class="support-header-info">
                        <h4>${window._t('support.title')}</h4>
                        <p>${window._t('support.subtitle')}</p>
                    </div>
                </div>
                <div class="support-messages" id="support-messages">
                    <div class="msg msg-ai">
                        <span class="msg-ai-label">${window._t('support.ai_label')}</span>
                        ${window._t('support.welcome_msg')}
                    </div>
                </div>
                <div class="support-input-area">
                    <button class="support-btn support-btn-voice" id="btn-voice" title="Voice Input">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M3.5 6.5A.5.5 0 0 1 4 7v1a4 4 0 0 0 8 0V7a.5.5 0 0 1 1 0v1a5 5 0 0 1-4.5 4.975V15h3a.5.5 0 0 1 0 1h-7a.5.5 0 0 1 0-1h3v-2.025A5 5 0 0 1 3 8V7a.5.5 0 0 1 .5-.5z"/><path d="M10 8a2 2 0 1 1-4 0V3a2 2 0 1 1 4 0v5zM8 0a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V3a3 3 0 0 0-3-3z"/></svg>
                    </button>
                    <input type="text" class="support-input" id="support-input" placeholder="${window._t('support.placeholder')}">
                    <button class="support-btn support-btn-send" id="btn-send">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.493-7.493Z"/></svg>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('support-toggle-btn');
        const sendBtn = document.getElementById('btn-send');
        const voiceBtn = document.getElementById('btn-voice');
        const input = document.getElementById('support-input');
        const win = document.getElementById('support-window');

        toggleBtn.onclick = () => {
            this.isOpen = !this.isOpen;
            win.classList.toggle('active', this.isOpen);
            if(this.isOpen) {
                input.focus();
                this.scrollToBottom();
                if (window.sinaankAssistant) {
                    window.sinaankAssistant.show();
                    window.sinaankAssistant.setPosition('floating');
                    this.syncHeaderVisual();
                }
            }
        };

        sendBtn.onclick = () => this.handleSendMessage();
        input.onkeypress = (e) => { if(e.key === 'Enter') this.handleSendMessage(); };

        voiceBtn.onclick = () => this.toggleVoiceRecognition();
    }

    toggleVoiceRecognition() {
        if (!window.sinaankAssistant) return;

        if (this.isListening) {
            // Already handled by SinaankAssistant recognition instance or just ignore if one-shot
            return;
        }

        window.sinaankAssistant.startListening(
            (transcript) => {
                document.getElementById('support-input').value = transcript;
                this.handleSendMessage();
            },
            () => {
                this.isListening = false;
                document.getElementById('btn-voice').classList.remove('active');
            }
        );
        
        this.isListening = true;
        document.getElementById('btn-voice').classList.add('active');
    }

    async handleSendMessage() {
        const input = document.getElementById('support-input');
        const content = input.value.trim();
        if (!content) return;

        input.value = '';
        this.addMessage(content, 'user');

        try {
            if (window.sinaankAssistant) window.sinaankAssistant.setThinking();
            const res = await ApiClient.post('/communication/messages/send', { content });
            if (res.success) {
                setTimeout(() => this.loadChatHistory(), 1500);
            }
        } catch (err) {
            console.error("Send Msg Error:", err);
        }
    }

    async loadChatHistory() {
        try {
            const res = await ApiClient.get('/communication/messages/thread');
            if (res.success && res.data.messages) {
                const msgsArea = document.getElementById('support-messages');
                const lastMsgCount = msgsArea.children.length;
                
                msgsArea.innerHTML = res.data.messages.map(m => {
                    const isUser = m.sender.role !== 'ADMIN';
                    const isAI = m.isAI;
                    return `
                        <div class="msg ${isUser ? 'msg-user' : 'msg-ai'}">
                            ${isAI ? `<span class="msg-ai-label">${window._t('support.ai_label')}</span>` : (!isUser ? `<span class="msg-ai-label" style="color:var(--success)">${window._t('support.admin_label')}</span>` : '')}
                            ${m.content}
                        </div>
                    `;
                }).join('');

                if (res.data.messages.length > lastMsgCount) {
                    const latest = res.data.messages[res.data.messages.length - 1];
                    if (latest.isAI && this.isOpen) {
                        this.speak(latest.content.split(' REPROY: ')[1] || latest.content);
                    }
                    this.scrollToBottom();
                }
            }
        } catch (err) {
            console.error("History Error:", err);
        }
    }

    addMessage(text, type) {
        const msgsArea = document.getElementById('support-messages');
        const div = document.createElement('div');
        div.className = `msg ${type === 'user' ? 'msg-user' : 'msg-ai'}`;
        if(type === 'ai') div.innerHTML = `<span class="msg-ai-label">Sinaank AI</span>`;
        div.innerHTML += text;
        msgsArea.appendChild(div);
        this.scrollToBottom();
    }

    scrollToBottom() {
        const msgsArea = document.getElementById('support-messages');
        msgsArea.scrollTop = msgsArea.scrollHeight;
    }

    speak(text) {
        if (window.sinaankAssistant) {
            window.sinaankAssistant.speak(text, 'welcome');
        }
    }

    syncHeaderVisual() {
        const headerVisual = document.getElementById('support-header-visual');
        if (headerVisual && window.sinaankAssistant && window.sinaankAssistant.ctxImg) {
            headerVisual.innerHTML = '';
            const clone = window.sinaankAssistant.ctxImg.cloneNode(true);
            clone.id = 'support-header-ctx-clone';
            clone.style.width = '100%';
            clone.style.height = '100%';
            clone.style.borderRadius = '12px';
            clone.style.objectFit = 'cover';
            clone.style.opacity = '1';
            headerVisual.appendChild(clone);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.sinaankSupport = new SinaankSupport();
    
    // Global Poll for updates every 10s if window is open
    setInterval(() => {
        if(window.sinaankSupport && window.sinaankSupport.isOpen) {
            window.sinaankSupport.loadChatHistory();
        }
    }, 10000);
});

