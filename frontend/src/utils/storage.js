/**
 * BrowserStorage — centralised localStorage wrapper with logging and DI.
 *
 * Usage:
 *   import storage, { STORAGE_KEYS } from '../utils/storage';
 *   storage.get(STORAGE_KEYS.AUTH_TOKEN);
 *   storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
 *   storage.remove(STORAGE_KEYS.AUTH_TOKEN);
 */

// ─── Storage key constants ───────────────────────────────────────────
export const STORAGE_KEYS = {
    // Auth
    AUTH_TOKEN:      'authToken',
    AUTH_USER:       'authUser',
    AUTH_ROLE:       'authRole',
    USERNAME:        'username',          // legacy duplicate of AUTH_USER
    ROLE:            'role',              // legacy duplicate of AUTH_ROLE
    USER_ROLE:       'userRole',          // legacy duplicate of AUTH_ROLE

    // View state
    LAST_ACTIVE_VIEW:     'lastActiveView',
    ACTIVE_TAB_ID:        'activeTabId',
    SELECTED_MONTH:       'selectedMonth',
    ACTIVE_PORTFOLIO_TAB: 'activePortfolioTabId',
    TASK_RTL_ENABLED:     'taskRtlEnabled',

    // Drafts (desktop)
    TASK_DRAFT:       'taskTracker_draft',
    TASK_BULK_DRAFT:  'taskTracker_bulkDraft',
    PORTFOLIO_DRAFT:  'portfolio_entry_draft',

    // Drafts (mobile)
    MOBILE_TASK_DRAFT:      'taskTracker_mobile_draft',
    MOBILE_BULK_DRAFT:      'taskTracker_mobile_bulkDraft',
    MOBILE_PORTFOLIO_DRAFT: 'mobile_portfolio_entry_draft',
    MOBILE_NOTEBOOK:        'taskTracker_mobile_notebook',
};

// ─── BrowserStorage class ────────────────────────────────────────────
class BrowserStorage {
    #provider;
    #debug;

    constructor(provider = localStorage) {
        this.#provider = provider;
        this.#debug = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
    }

    /** Toggle debug logging at runtime. */
    setDebug(enabled) {
        this.#debug = Boolean(enabled);
    }

    #log(action, key, value) {
        if (this.#debug) {
            console.debug(`[Storage] ${action} "${key}"`, value !== undefined ? value : '');
        }
    }

    /**
     * Get a value.  Objects/arrays (values starting with { or [) are
     * automatically JSON.parsed.  All other values are returned as raw strings.
     * Returns null if the key does not exist.
     */
    get(key) {
        const raw = this.#provider.getItem(key);
        if (raw === null) {
            this.#log('GET (miss)', key);
            return null;
        }
        // Only auto-parse objects and arrays — never primitives like 'true' / '123'
        if (raw.startsWith('{') || raw.startsWith('[')) {
            try {
                const parsed = JSON.parse(raw);
                this.#log('GET', key, parsed);
                return parsed;
            } catch {
                // malformed JSON — fall through to return raw string
            }
        }
        this.#log('GET', key, raw);
        return raw;
    }

    /**
     * Set a value.  Non-string values are JSON.stringified automatically.
     */
    set(key, value) {
        const toStore = typeof value === 'string' ? value : JSON.stringify(value);
        this.#provider.setItem(key, toStore);
        this.#log('SET', key, value);
    }

    /** Remove a single key. */
    remove(key) {
        this.#provider.removeItem(key);
        this.#log('REMOVE', key);
    }

    /** Remove multiple keys at once. */
    removeMany(keys) {
        keys.forEach(key => this.remove(key));
    }

    /** Clear all auth-related keys. Convenience for logout flows. */
    clearAuth() {
        this.removeMany([
            STORAGE_KEYS.AUTH_TOKEN,
            STORAGE_KEYS.AUTH_USER,
            STORAGE_KEYS.AUTH_ROLE,
            STORAGE_KEYS.USERNAME,
            STORAGE_KEYS.ROLE,
            STORAGE_KEYS.USER_ROLE,
        ]);
    }
}

// ─── Singleton export ────────────────────────────────────────────────
const storage = new BrowserStorage();
export default storage;
