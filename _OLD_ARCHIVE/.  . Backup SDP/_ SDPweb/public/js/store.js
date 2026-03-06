const store = {
    // --- Numerology Logic ---
    // Logic: (Sum of digits reduced to single digit) + (Last non-zero digit)
    calculateSdpCode: function (mobile) {
        if (!mobile || mobile.length !== 10) return "00";

        // 1. Digital Root (Sum of digits reduced to 1-9)
        let sum = 0;
        for (let char of mobile) {
            sum += parseInt(char);
        }
        // Reduce to single digit (1-9)
        // Math trick: 1 + (n - 1) % 9
        // But let's loop to be safe and explicit
        while (sum > 9) {
            let tempSum = 0;
            let digits = sum.toString().split('');
            for (let d of digits) tempSum += parseInt(d);
            sum = tempSum;
        }
        const digit1 = sum;

        // 2. Last Non-Zero Digit
        let digit2 = 0;
        for (let i = mobile.length - 1; i >= 0; i--) {
            const d = parseInt(mobile[i]);
            if (d !== 0) {
                digit2 = d;
                break;
            }
        }

        return `${digit1}${digit2}`;
    },

    // --- Commission Distribution (Mock) ---
    // Distributes funds to 5 levels of referrers
    distributeCommission: async function (buyerId, amountPaid) {
        console.log(`[Store] Distributing commission for ${buyerId}, Amount: ${amountPaid}`);

        if (parseInt(amountPaid) !== 580) {
            console.log("[Store] Not a 580 kit. No distribution.");
            return;
        }

        const db = firebase.firestore();

        try {
            // 1. Get Buyer's Referrer
            const buyerDoc = await db.collection('users').doc(buyerId).get();
            let currentReferrerId = buyerDoc.data().referrerId;

            if (!currentReferrerId) {
                console.log("[Store] No referrer found for this user.");
                // System keeps 100%
                return;
            }

            // Commission Structure: L1, L2, L3, L4, L5
            const levels = [140, 100, 70, 50, 40];

            for (let i = 0; i < 5; i++) {
                if (!currentReferrerId) break;

                const amount = levels[i];
                const levelName = `l${i + 1}`;

                console.log(`[Store] Paying Level ${i + 1} (${amount}) to ${currentReferrerId}`);

                // Transaction / Update Wallet
                const refRef = db.collection('users').doc(currentReferrerId);

                // Using atomic increment
                await refRef.update({
                    earningsBalance: firebase.firestore.FieldValue.increment(amount),
                    [`teamCounts.${levelName}`]: firebase.firestore.FieldValue.increment(1) // Just updating count for visibility
                });

                // Add Transaction Record
                await db.collection('transactions').add({
                    userId: currentReferrerId,
                    type: 'CREDIT',
                    amount: amount,
                    source: 'COMMISSION',
                    fromUser: buyerId, // Anonymize in production if needed
                    level: i + 1,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Move up the chain
                const refDoc = await refRef.get();
                currentReferrerId = refDoc.data().referrerId;
            }

            console.log("[Store] Distribution Complete.");

        } catch (error) {
            console.error("[Store] Commission Error:", error);
        }
    },

    // --- Referral Handling ---
    captureReferral: function () {
        const urlParams = new URLSearchParams(window.location.search);
        const refId = urlParams.get('ref');
        if (refId) {
            localStorage.setItem('sdp_referrer', refId);
            console.log("[Store] Captured Referrer:", refId);
        }
    },

    getReferrer: function () {
        return localStorage.getItem('sdp_referrer');
    }
};

// Auto-run referral capture on load
store.captureReferral();
