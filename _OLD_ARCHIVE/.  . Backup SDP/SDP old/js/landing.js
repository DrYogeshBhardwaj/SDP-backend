// Landing Logic
class LandingApp {
    constructor() {
        this.init();
    }
    init() {
        console.log("LandingApp Initializing...");
        // Check for referral
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('ssb_ref', ref);
            console.log("Ref Captured:", ref);
            // Optional: Auto-scroll to purchase
            const grid = document.querySelector('.products-grid');
            if (grid) grid.scrollIntoView({ behavior: 'smooth' });
        }
    }

    navigate(page) {
        if (page === 'login') window.location.href = 'login.html';
        else if (page === 'learn-more-view') {
            document.getElementById('home').classList.add('hidden');
            document.getElementById('learn-more-view').classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    }

    backFromLearnMore() {
        document.getElementById('learn-more-view').classList.add('hidden');
        document.getElementById('home').classList.remove('hidden');
    }

    handleKitPurchase(kitId) {
        console.log("handleKitPurchase called for:", kitId);
        const modal = document.getElementById('registration-modal');
        if (!modal) {
            console.error("Registration modal not found!");
            return;
        }

        const kitInput = document.getElementById('reg-kit-id');
        if (kitInput) kitInput.value = kitId;

        // Force show
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto'; // Ensure clickable
    }

    cancelPurchase() {
        const modal = document.getElementById('registration-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
        modal.style.pointerEvents = 'none';
    }

    // Purchase Submit
    async submitPurchase(e) {
        e.preventDefault();
        const mobile = document.getElementById('reg-mobile').value;
        const pin = document.getElementById('reg-pin').value;
        const kitId = document.getElementById('reg-kit-id').value;
        const refId = localStorage.getItem('ssb_ref');

        try {
            if (!store) throw new Error("Store not loaded");

            // Create User & Process Purchase
            // 1. Check if user exists?
            let user = store.getUser(mobile);
            if (!user) {
                user = store.createUser({ mobile, pin, name: 'User' }); // Default name
            }

            // 2. Process
            store.processPurchase(mobile, kitId, refId);

            alert("Purchase Successful! Please Login.");
            window.location.href = 'login.html';

        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    }
}

// Ensure global access safely
window.app = new LandingApp();
console.log("LandingApp assigned to window.app");
