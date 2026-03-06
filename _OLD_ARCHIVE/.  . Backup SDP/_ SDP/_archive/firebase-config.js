// TODO: Replace with your project's config object
const firebaseConfig = {
    apiKey: "AIzaSyDHDg_X35ERPJgT_iZA_y176JJ1ukeaSTw",
    authDomain: "sdp-verify-agent-001.firebaseapp.com",
    projectId: "sdp-verify-agent-001",
    storageBucket: "sdp-verify-agent-001.firebasestorage.app",
    messagingSenderId: "276085036818",
    appId: "1:276085036818:web:ca7c2a70eb5598d61245cb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
