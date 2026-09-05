// API Configuration - automatically uses correct URL based on environment.
// Vite production builds inline VITE_API_URL from .env.production (HTTPS).
// iOS Simulator still uses protocol capacitor: and injects __DPC_API_BASE.
const PROD_API = 'https://api.drpitz.club/api';
const LOCAL_API = 'http://127.0.0.1:5001/api';

function resolveApiBase() {
    if (typeof location !== 'undefined' && location.protocol === 'capacitor:') {
        const injected = window['__DPC_API_BASE'];
        if (typeof injected === 'string' && injected) return injected;
    }
    return import.meta.env.VITE_API_URL
        || (import.meta.env.PROD ? PROD_API : LOCAL_API);
}

export default resolveApiBase();
