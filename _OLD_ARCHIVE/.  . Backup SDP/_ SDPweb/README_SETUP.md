# SETUP & DEPLOYMENT INSTRUCTIONS

## 1. Configure Firebase

Open `c:\SinaankProjects\SDPweb\js\firebase-config.js` and replace the placeholder config with your actual Firebase project configuration:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

## 2. Deploy

Run the following commands in your terminal (at `c:\SinaankProjects\SDPweb`):

1. **Login to Firebase** (if not already logged in):
    `firebase login`

2. **Initialize Project** (if not already done):
    `firebase use --add`
    (Select your project from the list)

3. **Deploy**:
    `firebase deploy`

## 3. Verify

Access the returned Hosting URL.

- Register a user.
- Go to Firestore Console > `users` collection.
- Change `role` field to `visitor`, `buyer178`, `buyer580`, or `admin`.
- Refresh/Login to verify redirection.
