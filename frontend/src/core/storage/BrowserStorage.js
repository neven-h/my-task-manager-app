export default class BrowserStorage {
    constructor(provider, logger) {
        this.provider = provider;
        this.logger = logger;
    }

    async init() {
        this.logger.info('Initializing storage');
        await this.provider.init();
    }

    async get(key) {
        this.logger.info('GET ' + key);
        return this.provider.get(key);
    }

    async set(key, value) {
        this.logger.info('SET ' + key, value);
        return this.provider.set(key, value);
    }

    async remove(key) {
        this.logger.info('REMOVE ' + key);
        return this.provider.remove(key);
    }

    async clear() {
        this.logger.info('CLEAR STORAGE');
        return this.provider.clear();
    }
}
