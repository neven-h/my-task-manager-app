import BrowserStorage from './BrowserStorage';
import IndexedDBProvider from './IndexedDBProvider';
import LocalStorageProvider from './LocalStorageProvider';
import ConsoleLogger from '../logger/ConsoleLogger';

const logger = new ConsoleLogger();

let provider;

try {
    provider = new IndexedDBProvider();
} catch {
    provider = new LocalStorageProvider();
}

const storage = new BrowserStorage(provider, logger);

export default storage;
