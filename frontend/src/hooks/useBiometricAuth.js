import { useState, useEffect, useCallback } from 'react';
import storage, { STORAGE_KEYS } from '../utils/storage';

/**
 * Check if the native Capacitor biometric plugin is available.
 * Returns the plugin wrapper functions only when running inside the native iOS shell.
 */
async function loadBiometricPlugin() {
    const isNative = !!window.Capacitor?.isNativePlatform?.();
    if (!isNative) return null;
    try {
        // Dynamic import — only loads in native Capacitor context
        const mod = await import('../../ios/App/biometricAuth.js');
        return mod;
    } catch {
        return null;
    }
}

/**
 * Hook that wraps the native BiometricAuth Capacitor plugin.
 *
 * Provides:
 *  - available: boolean — device supports biometrics and plugin is loaded
 *  - enabled: boolean — user has opted in to biometric login
 *  - loading: boolean — biometric operation in progress
 *  - login(): Promise<{ token, username } | null> — authenticate via Face ID / Touch ID
 *  - enable(token, username): Promise<void> — save credentials to Keychain & flag enabled
 *  - disable(): Promise<void> — remove credentials from Keychain & flag disabled
 */
export default function useBiometricAuth() {
    const [available, setAvailable] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(false);
    const [plugin, setPlugin] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const mod = await loadBiometricPlugin();
            if (cancelled || !mod) return;
            const isAvail = await mod.isBiometricAvailable();
            if (cancelled) return;
            setPlugin(mod);
            setAvailable(isAvail);
            setEnabled(storage.get(STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true');
        })();
        return () => { cancelled = true; };
    }, []);

    const login = useCallback(async () => {
        if (!plugin || !available || !enabled) return null;
        setLoading(true);
        try {
            const result = await plugin.authenticateBiometric('Sign in with Face ID');
            // result contains { token, username } from Keychain
            return result;
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    }, [plugin, available, enabled]);

    const enable = useCallback(async (token, username) => {
        if (!plugin || !available) return;
        setLoading(true);
        try {
            await plugin.enableBiometric({ token, username });
            storage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
            setEnabled(true);
        } catch (err) {
            console.warn('Failed to enable biometric:', err);
        } finally {
            setLoading(false);
        }
    }, [plugin, available]);

    const disable = useCallback(async () => {
        if (!plugin) return;
        setLoading(true);
        try {
            await plugin.disableBiometric();
            storage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
            setEnabled(false);
        } catch (err) {
            console.warn('Failed to disable biometric:', err);
        } finally {
            setLoading(false);
        }
    }, [plugin]);

    return { available, enabled, loading, login, enable, disable };
}
