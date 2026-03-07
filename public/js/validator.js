/**
 * Global Input Validator
 * Enforces rules for Name, Mobile, and PIN fields.
 * Uses event delegation to handle dynamic elements (Admin/SPA).
 */
(function () {
    console.log("Validator Initialized");

    document.body.addEventListener('input', function (e) {
        const target = e.target;
        if (!target || target.tagName !== 'INPUT') return;

        // 1. Mobile Validation
        // IDs containing 'mobile' OR type='tel'
        if (target.type === 'tel' || (target.id && target.id.toLowerCase().includes('mobile'))) {
            // Remove non-digits
            let val = target.value.replace(/\D/g, '');
            // Limit to 10
            if (val.length > 10) val = val.substring(0, 10);

            if (target.value !== val) target.value = val;
        }

        // 2. PIN Validation
        // IDs containing 'pin'
        if (target.id && target.id.toLowerCase().includes('pin')) {
            // Remove non-digits
            let val = target.value.replace(/\D/g, '');
            // Limit to 4
            if (val.length > 4) val = val.substring(0, 4);

            if (target.value !== val) target.value = val;
        }

        // 3. Name Validation
        // IDs containing 'name'
        if (target.id && target.id.toLowerCase().includes('name')) {
            // Title Case: Capitalize first letter of each word
            // Preserve whitespace closely to avoid cursor jumping issues (simplified)
            // Regex to find first letter of words
            const val = target.value.replace(/\b\w/g, char => char.toUpperCase());

            if (target.value !== val) target.value = val;
        }
    });
})();
