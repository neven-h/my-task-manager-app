// Capacitor wrapper for the native BiometricAuth plugin.
// Must live inside src/ so Vite can resolve it.

let _plugin = null;

function getPlugin() {
    if (_plugin) return _plugin;
    if (!window.Capacitor?.isNativePlatform?.()) return null;
    try {
        _plugin = window.Capacitor.registerPlugin('BiometricAuth');
        return _plugin;
    } catch {
        return null;
    }
}

export async function isBiometricAvailable() {
    const plugin = getPlugin();
    if (!plugin) return false;
    try {
        const res = await plugin.isAvailable();
        return !!res?.available;
    } catch {
        return false;
    }
}

export async function enableBiometric({ token, username }) {
    const plugin = getPlugin();
    if (!plugin) throw new Error('BiometricAuth plugin not available');
    return plugin.enable({ token, username });
}

export async function authenticateBiometric(reason = 'Sign in with Face ID') {
    const plugin = getPlugin();
    if (!plugin) throw new Error('BiometricAuth plugin not available');
    return plugin.authenticate({ reason });
}

export async function disableBiometric() {
    const plugin = getPlugin();
    if (!plugin) throw new Error('BiometricAuth plugin not available');
    return plugin.disable();
}
