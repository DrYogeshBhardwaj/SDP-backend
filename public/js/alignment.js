// assets/js/alignment.js

/**
 * Executes a 5-second Color + Sound Alignment Ritual.
 * Resolves exactly 5 seconds after invocation.
 */
export async function runAlignmentRitual() {
    // Pre-initialize and resume ambient context synchronously with click gesture
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
        if (!activeSessionAudioCtx) activeSessionAudioCtx = new AudioContext();
        if (activeSessionAudioCtx.state === 'suspended') activeSessionAudioCtx.resume();
    }

    return new Promise((resolve) => {
        // 1. Show UI Overlay
        const overlay = document.getElementById('alignment-overlay');
        if (overlay) {
            overlay.classList.add('alignment-active');
        }

        // 2. Initialize Web Audio Context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
            console.warn('Web Audio API not supported in this browser. Running visual only.');
            return finishRitual(overlay, null, resolve);
        }

        const ctx = new AudioContext();

        // Ensure state is running
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // 3. Create Audio Nodes
        const gainNode = ctx.createGain();
        gainNode.connect(ctx.destination);

        // Start at 0 volume
        gainNode.gain.setValueAtTime(0, now);
        // Fade in to a soft volume (e.g., 0.1) over 3 seconds
        gainNode.gain.linearRampToValueAtTime(0.1, now + 3);
        // Fade out to 0 starting at 4 seconds, ending at 5 seconds
        gainNode.gain.setValueAtTime(0.1, now + 4);
        gainNode.gain.linearRampToValueAtTime(0, now + 5);

        // Oscillator A: 220 Hz
        const oscA = ctx.createOscillator();
        oscA.type = 'sine';
        oscA.frequency.value = 220;
        oscA.connect(gainNode);

        // Oscillator B: 440 Hz
        const oscB = ctx.createOscillator();
        oscB.type = 'sine';
        oscB.frequency.value = 440;
        oscB.connect(gainNode);

        // 4. Start Oscillators
        oscA.start(now);
        oscB.start(now);

        // 5. Schedule Stop
        oscA.stop(now + 5);
        oscB.stop(now + 5);

        // Fallback or exact timing resolution
        setTimeout(() => {
            finishRitual(overlay, ctx, resolve);
        }, 5000); // Exactly 5 seconds
    });
}

function finishRitual(overlay, audioCtx, resolveCallback) {
    if (overlay) {
        overlay.classList.remove('alignment-active');
    }
    // Clean up AudioContext if it exists to prevent memory leaks
    if (audioCtx && audioCtx.state !== 'closed') {
        audioCtx.close().catch(e => console.error("Error closing AudioContext:", e));
    }
    resolveCallback();
}

// Ambient Audio for Active Sessions
let activeSessionAudioCtx = null;
let activeSessionGainNode = null;
let chimeIntervalId = null;

export function playSessionAmbientAudio(delaySeconds = 0) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;

    if (!activeSessionAudioCtx) {
        activeSessionAudioCtx = new AudioContext();
    }
    if (activeSessionAudioCtx.state === 'suspended') {
        activeSessionAudioCtx.resume();
    }

    activeSessionGainNode = activeSessionAudioCtx.createGain();
    activeSessionGainNode.connect(activeSessionAudioCtx.destination);

    const now = activeSessionAudioCtx.currentTime;
    activeSessionGainNode.gain.setValueAtTime(0, now);
    if (delaySeconds > 0) {
        activeSessionGainNode.gain.setValueAtTime(0, now + delaySeconds);
    }
    activeSessionGainNode.gain.linearRampToValueAtTime(0.4, now + delaySeconds + 5); // slow gentle fade in, boosted volume

    // 432 Hz frequency base for meditation
    const osc1 = activeSessionAudioCtx.createOscillator();
    osc1.type = 'triangle'; // Using triangle instead of sine so bass is audible on small speakers
    osc1.frequency.value = 108; // 432/4 for deep bass drone

    const osc2 = activeSessionAudioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 162; // Perfect fifth

    const droneGain = activeSessionAudioCtx.createGain();
    droneGain.gain.value = 0.8; // increased base volume

    // Slow LFO to create "breathing" effect
    const lfo = activeSessionAudioCtx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // 10 second cycle (e.g., matching a deep breath)
    const lfoGain = activeSessionAudioCtx.createGain();
    lfoGain.gain.value = 0.3; // depth of breathing pulse
    lfo.connect(lfoGain);

    // LFO controls the drone gain to pulse it
    lfoGain.connect(droneGain.gain);

    osc1.connect(droneGain);
    osc2.connect(droneGain);
    droneGain.connect(activeSessionGainNode);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    // Create an intermittent soft chime (like a sing bowl)
    if (chimeIntervalId) clearInterval(chimeIntervalId);
    chimeIntervalId = setInterval(() => {
        if (!activeSessionAudioCtx || activeSessionAudioCtx.state === 'closed') {
            clearInterval(chimeIntervalId);
            return;
        }
        const chimeNow = activeSessionAudioCtx.currentTime;
        const chimeOsc = activeSessionAudioCtx.createOscillator();
        chimeOsc.type = 'sine';
        chimeOsc.frequency.value = 432 * 2; // high chime

        const chimeGain = activeSessionAudioCtx.createGain();
        chimeGain.connect(activeSessionGainNode);
        chimeOsc.connect(chimeGain);

        chimeGain.gain.setValueAtTime(0, chimeNow);
        chimeGain.gain.linearRampToValueAtTime(0.15, chimeNow + 1); // boosted chime volume
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, chimeNow + 6);

        chimeOsc.start(chimeNow);
        chimeOsc.stop(chimeNow + 7);
    }, 15000); // every 15 seconds

    return activeSessionAudioCtx;
}

export function stopSessionAmbientAudio(immediate = false) {
    if (chimeIntervalId) {
        clearInterval(chimeIntervalId);
        chimeIntervalId = null;
    }

    if (activeSessionAudioCtx && activeSessionGainNode) {
        const now = activeSessionAudioCtx.currentTime;
        activeSessionGainNode.gain.cancelScheduledValues(now);

        if (immediate) {
            activeSessionGainNode.gain.setValueAtTime(0, now);
        } else {
            activeSessionGainNode.gain.setValueAtTime(activeSessionGainNode.gain.value, now);
            activeSessionGainNode.gain.linearRampToValueAtTime(0, now + 2); // 2 second fade out
        }

        // Clean up safely
        const ctxToClose = activeSessionAudioCtx;
        setTimeout(() => {
            if (ctxToClose && ctxToClose.state !== 'closed') {
                ctxToClose.close().catch(e => console.error("Error closing AudioContext:", e));
            }
        }, 2500);

        activeSessionAudioCtx = null;
        activeSessionGainNode = null;
    }
}

// Make it available globally so inline scripts/older modules can use it
window.runAlignmentRitual = runAlignmentRitual;
window.playSessionAmbientAudio = playSessionAmbientAudio;
window.stopSessionAmbientAudio = stopSessionAmbientAudio;
