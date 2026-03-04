const DB_NAME = 'task_manager_db';
const STORE_NAME = 'key_value_store';
const VERSION = 1;

export default class IndexedDBProvider {
    constructor() {
        this.db = null;
    }

    async init() {
        if (this.db) return;

        this.db = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, VERSION);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };

            request.onsuccess = () => resolve(request.result);
        });
    }

    async get(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    }

    async set(key, value) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async remove(key) {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async clear() {
        await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
}
