export default class LocalStorageProvider {
    async init() {
        return true;
    }

    async get(key) {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : null;
    }

    async set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    }

    async remove(key) {
        localStorage.removeItem(key);
        return true;
    }

    async clear() {
        localStorage.clear();
        return true;
    }
}
