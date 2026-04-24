const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SID_CONFIG = {
    FREQ_RANGE: [174, 396],
    MIN_DIFF: 7,
    HUE_RANGE: [0, 360],
    HUE_SHIFT: [120, 210] // Relative shift for color2
};

/**
 * Generates a unique Digital SID combination of colors and sounds using the Master Combo System.
 * Rules:
 *  - Colors: Randomly picked from seeded SidColorCombo patterns.
 *  - Audio: Unique L/R frequencies assigned for the chosen combo.
 *  - SID ID: Unique human-friendly numeric ID (e.g., 7421).
 */
async function generateUniqueSID(userId) {
    let unique = false;
    let sid = {};
    let attempts = 0;

    // 1. Get all active combos
    const combos = await prisma.sidColorCombo.findMany({ 
        where: { active: true },
        include: { color1: true, color2: true }
    });

    if (combos.length === 0) throw new Error("No active SID Color Combos found. Run seed script.");

    while (!unique && attempts < 100) {
        attempts++;
        
        // Pick a random combo template
        const combo = combos[Math.floor(Math.random() * combos.length)];
        
        // Generate frequencies
        const leftHz = SID_CONFIG.FREQ_RANGE[0] + Math.floor(Math.random() * (SID_CONFIG.FREQ_RANGE[1] - SID_CONFIG.FREQ_RANGE[0] + 1));
        let rightHz = SID_CONFIG.FREQ_RANGE[0] + Math.floor(Math.random() * (SID_CONFIG.FREQ_RANGE[1] - SID_CONFIG.FREQ_RANGE[0] + 1));
        while (Math.abs(leftHz - rightHz) < SID_CONFIG.MIN_DIFF) {
            rightHz = SID_CONFIG.FREQ_RANGE[0] + Math.floor(Math.random() * (SID_CONFIG.FREQ_RANGE[1] - SID_CONFIG.FREQ_RANGE[0] + 1));
        }

        // Generate a unique 4-6 digit numeric SID ID
        const sidId = Math.floor(1000 + Math.random() * 999000).toString();

        // Check for Collision of the Triple (Combo, L, R) OR the SID ID
        const collision = await prisma.user.findFirst({
            where: {
                OR: [
                    { sid_id: sidId },
                    {
                        AND: [
                            { sid_combo_id: combo.id },
                            { sid_left_hz: leftHz },
                            { sid_right_hz: rightHz }
                        ]
                    }
                ]
            }
        });

        if (!collision) {
            unique = true;
            sid = {
                sid_id: sidId,
                sid_combo_id: combo.id,
                sid_color1: combo.color1.hue,
                sid_color2: combo.color2.hue,
                sid_left_hz: leftHz,
                sid_right_hz: rightHz,
                sid_seed: Math.random().toString(36).substring(7),
                sid_created_at: new Date()
            };
        }
    }

    if (!unique) throw new Error("Failed to generate unique SID after 100 attempts.");

    if (userId) {
        return await prisma.user.update({
            where: { id: userId },
            data: sid
        });
    }
    return sid;
}

/**
 * Archives current SID to history and generates a new one.
 */
async function archiveAndRegenerate(userId, adminId = null) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.sid_combo_id) {
        return await generateUniqueSID(userId);
    }

    // Archive current to history
    await prisma.sidHistory.create({
        data: {
            userId: user.id,
            old_sid_id: user.sid_id,
            old_combo_id: user.sid_combo_id,
            color1: user.sid_color1,
            color2: user.sid_color2,
            leftHz: user.sid_left_hz,
            rightHz: user.sid_right_hz,
            seed: user.sid_seed,
            adminId: adminId
        }
    });

    // Generate New
    return await generateUniqueSID(userId);
}

module.exports = {
    generateUniqueSID,
    archiveAndRegenerate
};
