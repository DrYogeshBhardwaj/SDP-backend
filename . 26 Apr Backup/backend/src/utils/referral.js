const crypto = require('crypto');

/**
 * Generates a unique referral code in the format SIN-XXXXXX
 * XXXXXX is a 6-character uppercase alphanumeric string.
 */
const generateReferralCode = () => {
    // Generate 3 bytes to get 6 hex characters
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `SIN-${suffix}`;
};

module.exports = { generateReferralCode };
