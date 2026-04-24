const AudioDB = {
    dbName: "SDPAudioDB",
    storeName: "audioStore",
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onerror = e => reject("IndexedDB error: " + e.target.errorCode);
            request.onsuccess = e => resolve(e.target.result);
            request.onupgradeneeded = e => {
                e.target.result.createObjectStore(this.storeName);
            };
        });
    },
    async saveAudio(file, mobile) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            // Prefix key with mobile to isolate data per account
            let userKey = 'customAudio';
            if (mobile) userKey = 'customAudio_' + mobile;

            store.put({ file: file, name: file.name }, userKey);
            tx.oncomplete = () => resolve();
            tx.onerror = e => reject(e);
        });
    },
    async getAudio(mobile) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            let userKey = 'customAudio';
            if (mobile) userKey = 'customAudio_' + mobile;

            const request = store.get(userKey);
            request.onsuccess = e => resolve(request.result);
            request.onerror = e => reject(e);
        });
    },
    async clearAudio(mobile) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            let userKey = 'customAudio';
            if (mobile) userKey = 'customAudio_' + mobile;

            const request = store.delete(userKey);
            request.onsuccess = () => resolve();
            request.onerror = e => reject(e);
        });
    }
};
window.AudioDB = AudioDB;
