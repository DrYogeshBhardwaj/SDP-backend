/**
 * SSB CORE PRODUCT LOGIC
    * ==========================================
 * 🔒 LOCKED CODE - DO NOT EDIT WITHOUT AUTHORIZATION 🔒
 * ==========================================
 * This file contains the proprietary algorithms for:
 * 1. Frequency Calculation based on Mobile Number
    * 2. Color Calculation based on Frequencies
        * 3. Audio Generation(Binaural Beats / Solfeggio)
            * 
 * Any changes here will affect the core product experience.
 */

class SSBCore {
    constructor() {
        this.ctx = null;
        this.oscillators = [];
        this.frequencies = {
            1: 174,  // Pain relief
            2: 285,  // Healing
            3: 396,  // Liberating Guilt/Fear
            4: 417,  // Undoing Situations
            5: 528,  // Miracle / DNA Repair
            6: 639,  // Relationships
            7: 741,  // Awakening Intuition
            8: 852,  // Returning to Spirit
            9: 963   // Higher Self
        };
        this.colors = {
            1: "#EF4444", // Red (Light/Warm)
            2: "#FDF5E6", // White (Soft/Cream)
            3: "#EAB308", // Yellow
            4: "#22C55E", // Green
            5: "#06B6D4", // Cyan
            6: "#E2E8F0", // White (Cool/Silver)
            7: "#8B5CF6", // Violet
            8: "#D946EF", // Magenta
            9: "#991B1B"  // Red (Dark/Deep)
        };
    }

    /**
     * 1. Calculate Core Values from Mobile
     * Mobank (Sum) and Yogank (Last Digit)
     */
    calculateValues(mobile) {
        if (!mobile) return { val1: 9, val2: 9 }; // Default

        // A. Last Non-Zero Digit
        let lastDigit = 9;
        const cleanMobile = mobile.replace(/\D/g, '');
        for (let i = cleanMobile.length - 1; i >= 0; i--) {
            const digit = parseInt(cleanMobile[i]);
            if (digit !== 0) {
                lastDigit = digit;
                break;
            }
        }
        let val1 = lastDigit;

        // B. Recursive Sum (Mobank)
        let val2 = 0;
        let sumStr = cleanMobile;
        while (sumStr.length > 1) {
            let tempSum = 0;
            for (let char of sumStr) tempSum += parseInt(char);
            sumStr = tempSum.toString();
        }
        val2 = parseInt(sumStr) || 9;

        // C. Collision Handling (Mobank == Yogank)
        // Formula: (Mobank + last_digit_of_mobile) % 9
        // Note: % 9 returns 0-8. We want 1-9. So (x-1)%9 + 1 or similar logic if result is 0?
        // User formula: "(Mobank + last_digit_of_mobile) % 9"
        // Let's interpret mathematically standard: (9+1)%9 = 1.
        // If result is 0, we treat as 9? Usually in numerology 0 isn't a core number.
        // Let's implement strictly (sum + last) % 9, and if 0 => 9.

        if (val1 === val2) {
            let variation = (val2 + lastDigit) % 9;
            if (variation === 0) variation = 9;

            // Secondary check: If variation still equals original (e.g. 9 -> 9), force shift
            if (variation === val2) {
                variation = (variation % 9) + 1;
            }
            val1 = variation;
        }

        return { val1, val2 };
    }

    getFrequency(val) {
        return this.frequencies[val] || 432;
    }

    getColor(val) {
        return this.colors[val] || "#0EA5E9";
    }

    getFrequencyText(val) {
        return (this.frequencies[val] || 432) + " Hz";
    }

    // New Helper: Ensure visual distinction between two colors
    verifyContrast(val1, val2) {
        let c1 = this.getColor(val1);
        let c2 = this.getColor(val2);

        // Define Color Families
        const reds = [1, 9];
        const whites = [2, 6];

        // 1. Check for Red Family Conflict (1 & 9)
        if (reds.includes(val1) && reds.includes(val2)) {
            // Force High Contrast: Yellow (3)
            val2 = 3;
            c2 = this.getColor(val2);
        }

        // 2. Check for White Family Conflict (2 & 6)
        if (whites.includes(val1) && whites.includes(val2)) {
            // Force High Contrast: Yellow (3) or Green (4) if needed. 
            // Using Yellow (3) as per request for "Guru / Guidance".
            val2 = 3;
            c2 = this.getColor(val2);
        }

        // 3. General Fail-safe: If same color ID (should be handled by calcValues, but just in case)
        if (val1 === val2) {
            // Force shift to next available
            val2 = (val1 % 9) + 1;
            c2 = this.getColor(val2);
        }

        return { val1, val2, color1: c1, color2: c2 };
    }

    /**
     * 3. Audio Engine
     */
    async startAudio(val1, val2) {
        // Stop/Cleanup previous
        this.stopAudio();

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) throw new Error("Web Audio API not supported");

            this.ctx = new AudioContext();

            // Resume if suspended (Browser Policy)
            if (this.ctx.state === 'suspended') {
                await this.ctx.resume();
            }

            const f1 = this.getFrequency(val1);
            const f2 = this.getFrequency(val2);

            console.log(`[SSB CORE] Starting Audio: L=${f1}Hz (${val1}), R=${f2}Hz (${val2})`);

            // Check if frequencies are valid numbers
            if (!f1 || !f2 || isNaN(f1) || isNaN(f2)) {
                console.error("Invalid Frequencies:", f1, f2);
                return;
            }

            // Create Oscillators
            const osc1 = this.ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.value = f1;

            const osc2 = this.ctx.createOscillator();
            osc2.type = 'sine';
            osc2.frequency.value = f2;

            // Gain (Volume) - Increased to 0.8 for better audibility
            const masterGain = this.ctx.createGain();
            masterGain.gain.value = 0.8;
            masterGain.connect(this.ctx.destination);

            // Panning
            if (this.ctx.createStereoPanner) {
                const panL = this.ctx.createStereoPanner();
                panL.pan.value = -1; // Left

                const panR = this.ctx.createStereoPanner();
                panR.pan.value = 1; // Right

                osc1.connect(panL).connect(masterGain);
                osc2.connect(panR).connect(masterGain);
            } else {
                // Merging for older Safari/Browsers
                const merger = this.ctx.createChannelMerger(2);
                osc1.connect(merger, 0, 0);
                osc2.connect(merger, 0, 1);
                merger.connect(masterGain);
            }

            osc1.start();
            osc2.start();

            this.oscillators = [osc1, osc2];

        } catch (e) {
            console.error("[SSB CORE] Audio Error:", e);
            throw e;
        }
    }

    stopAudio() {
        if (this.oscillators) {
            this.oscillators.forEach(osc => {
                try { osc.stop(); } catch (e) { /* ignore */ }
            });
            this.oscillators = [];
        }
        if (this.ctx) {
            try { this.ctx.close(); } catch (e) { /* ignore */ }
            this.ctx = null;
        }
    }
}

// Global Instance
window.ssbCore = new SSBCore();
