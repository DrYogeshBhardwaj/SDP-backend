/**
 * SDT: Sinaank Digital Therapy
 * Phase 1: Main Page Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const hindiBtn = document.getElementById('lang-hi');
    const englishBtn = document.getElementById('lang-en');

    // Handle Language Selection
    const selectLanguage = (lang) => {
        // Store selected language
        localStorage.setItem('sdt_lang', lang);
        
        // Redirect to next step (placeholder)
        // Using a slight timeout (100ms) only to ensure localStorage persists 
        // and provides a tiny bit of tactile feedback on mobile.
        setTimeout(() => {
            window.location.href = 'join.html'; 
        }, 100);
    };

    if (hindiBtn) {
        hindiBtn.addEventListener('click', (e) => {
            e.preventDefault();
            selectLanguage('hi');
        });
    }

    if (englishBtn) {
        englishBtn.addEventListener('click', (e) => {
            e.preventDefault();
            selectLanguage('en');
        });
    }
});
