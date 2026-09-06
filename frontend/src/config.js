// API Configuration - automatically uses correct URL based on environment.
// Vite production builds inline VITE_API_URL from .env.production (HTTPS).
// iOS Simulator still uses protocol capacitor: and injects __DPC_API_BASE.
const PROD_API = 'https://my-task-manager-app-production.up.railway.app/api';
const LOCAL_API = 'http://127.0.0.1:5001/api';

function resolveApiBase() {
    if (typeof location !== 'undefined' && location.protocol === 'capacitor:') {
        const injected = window['__DPC_API_BASE'];
        if (typeof injected === 'string' && injected) return injected;
    }
    // The custom api.drpitz.club DNS currently presents an invalid certificate.
    // Production must use Railway's secure public domain until that DNS is fixed.
    if (import.meta.env.PROD) return PROD_API;
    return import.meta.env.VITE_API_URL || LOCAL_API;
}

export default resolveApiBase();
