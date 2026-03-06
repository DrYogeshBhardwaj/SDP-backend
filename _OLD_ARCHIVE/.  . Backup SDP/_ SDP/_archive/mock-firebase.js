/**
 * MOCK FIREBASE IMPLEMENTATION (LocalStorage)
 * Replaces official Firebase SDKs for local/offline testing.
 */

window.firebase = {
    // 1. MOCK AUTH
    auth: function () {
        return {
            onAuthStateChanged: function (callback) {
                // Check session
                const userJson = localStorage.getItem('sdp_session_user');
                const user = userJson ? JSON.parse(userJson) : null;
                setTimeout(() => callback(user), 100); // Async simulation
            },
            signInWithEmailAndPassword: async function (email, password) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        const users = JSON.parse(localStorage.getItem('sdp_users') || '{}');
                        const user = Object.values(users).find(u => u.email === email);

                        if (user && user.password === password) {
                            const sessionUser = { uid: user.uid, email: user.email };
                            localStorage.setItem('sdp_session_user', JSON.stringify(sessionUser));
                            resolve({ user: sessionUser });
                        } else {
                            reject({ code: 'auth/user-not-found', message: 'Invalid credentials (Mock)' });
                        }
                    }, 500);
                });
            },
            createUserWithEmailAndPassword: async function (email, password) {
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        const users = JSON.parse(localStorage.getItem('sdp_users') || '{}');
                        // Check duplicate
                        if (Object.values(users).some(u => u.email === email)) {
                            reject({ code: 'auth/email-already-in-use', message: 'Email already exists (Mock)' });
                            return;
                        }

                        const uid = 'user_' + Math.random().toString(36).substr(2, 9);
                        const newUser = { uid, email, password }; // Password stored plain in mock only!

                        // Save to "DB"
                        users[uid] = newUser;
                        localStorage.setItem('sdp_users', JSON.stringify(users));

                        // Set Session
                        const sessionUser = { uid, email };
                        localStorage.setItem('sdp_session_user', JSON.stringify(sessionUser));

                        resolve({ user: sessionUser });
                    }, 500);
                });
            },
            signOut: async function () {
                localStorage.removeItem('sdp_session_user');
                return Promise.resolve();
            }
        };
    },

    // 2. MOCK FIRESTORE
    firestore: (function () {
        const processData = (currentData, newData) => {
            const result = { ...currentData };
            for (let key in newData) {
                const val = newData[key];
                if (val && typeof val === 'object' && val.type === 'increment') {
                    result[key] = (result[key] || 0) + val.amount;
                } else if (val && typeof val === 'object' && val.type === 'serverTimestamp') {
                    result[key] = new Date().toISOString();
                } else if (val && typeof val === 'object' && val.type === 'arrayUnion') {
                    const arr = result[key] || [];
                    const exists = arr.some(item => JSON.stringify(item) === JSON.stringify(val.value));
                    if (!exists) arr.push(val.value);
                    result[key] = arr;
                } else {
                    result[key] = val;
                }
            }
            return result;
        };

        const FirestoreMock = function () {
            return {
                collection: function (collName) {
                    return {
                        doc: function (docId) {
                            return {
                                set: async function (data, options) {
                                    const db = JSON.parse(localStorage.getItem('sdp_db_' + collName) || '{}');
                                    const current = (options && options.merge && db[docId]) ? db[docId] : {};
                                    db[docId] = processData(current, data);
                                    localStorage.setItem('sdp_db_' + collName, JSON.stringify(db));
                                    return Promise.resolve();
                                },
                                update: async function (data) {
                                    const db = JSON.parse(localStorage.getItem('sdp_db_' + collName) || '{}');
                                    if (!db[docId]) return Promise.reject({ message: "Doc not found" });
                                    db[docId] = processData(db[docId], data);
                                    localStorage.setItem('sdp_db_' + collName, JSON.stringify(db));
                                    return Promise.resolve();
                                },
                                get: async function () {
                                    const db = JSON.parse(localStorage.getItem('sdp_db_' + collName) || '{}');
                                    const data = db[docId];
                                    return Promise.resolve({
                                        exists: !!data,
                                        data: () => data,
                                        id: docId
                                    });
                                },
                                onSnapshot: function (callback) {
                                    this.get().then(callback);
                                    setInterval(() => { this.get().then(callback); }, 2000);
                                }
                            };
                        },
                        add: async function (data) {
                            const docId = 'doc_' + Math.random().toString(36).substr(2, 9);
                            const db = JSON.parse(localStorage.getItem('sdp_db_' + collName) || '{}');
                            data.id = docId;
                            db[docId] = processData({}, data);
                            localStorage.setItem('sdp_db_' + collName, JSON.stringify(db));
                            return Promise.resolve({ id: docId });
                        },
                        where: function (field, op, val) {
                            this._query = this._query || [];
                            this._query.push({ field, op, val });
                            return this;
                        },
                        orderBy: function () { return this; },
                        limit: function () { return this; },
                        get: async function () {
                            const db = JSON.parse(localStorage.getItem('sdp_db_' + collName) || '{}');
                            let results = Object.values(db);
                            if (this._query) {
                                this._query.forEach(q => {
                                    results = results.filter(item => item[q.field] == q.val);
                                });
                            }
                            this._query = [];
                            return Promise.resolve({
                                empty: results.length === 0,
                                forEach: (fn) => results.forEach(item => fn({ data: () => item, id: item.id }))
                            });
                        },
                        onSnapshot: function (callback) {
                            this.get().then(callback);
                            setInterval(() => { this.get().then(callback); }, 2000);
                        }
                    };
                }
            };
        };

        // Static Properties (The Fix)
        FirestoreMock.FieldValue = {
            increment: (n) => ({ type: 'increment', amount: n }),
            serverTimestamp: () => ({ type: 'serverTimestamp' }),
            arrayUnion: (val) => ({ type: 'arrayUnion', value: val })
        };

        return FirestoreMock;
    })(),

    initializeApp: function () { console.log("Mock Firebase Initialized"); }
};
