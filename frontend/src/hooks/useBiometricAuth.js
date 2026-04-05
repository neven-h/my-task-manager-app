import { useState, useEffect, useCallback } from 'react';
import storage, { STORAGE_KEYS } from '../utils/storage';
import {
    isBiometricAvailable,
    enableBiometric,
    authenticateBiometric,
    disableBiometric,
} from '../utils/biometricPlugin';

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

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const isAvail = await isBiometricAvailable();
            if (cancelled) return;
            setAvailable(isAvail);
            setEnabled(storage.get(STORAGE_KEYS.BIOMETRIC_ENABLED) === 'true');
        })();
        return () => { cancelled = true; };
    }, []);

    const login = useCallback(async () => {
        if (!available || !enabled) return null;
        setLoading(true);
        try {
            return await authenticateBiometric('Sign in with Face ID');
        } catch {
            return null;
        } finally {
            setLoading(false);
        }
    }, [available, enabled]);

    const enable = useCallback(async (token, username) => {
        if (!available) return;
        setLoading(true);
        try {
            await enableBiometric({ token, username });
            storage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
            setEnabled(true);
        } catch (err) {
            console.warn('Failed to enable biometric:', err);
        } finally {
            setLoading(false);
        }
    }, [available]);

    const disable = useCallback(async () => {
        setLoading(true);
        try {
            await disableBiometric();
            storage.set(STORAGE_KEYS.BIOMETRIC_ENABLED, 'false');
            setEnabled(false);
        } catch (err) {
            console.warn('Failed to disable biometric:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    return { available, enabled, loading, login, enable, disable };
}
