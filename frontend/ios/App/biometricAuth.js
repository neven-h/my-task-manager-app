// Lightweight Capacitor plugin wrapper for the native BiometricAuth plugin
// This file exposes enable/authenticate/disable/isAvailable to the web layer.

import { registerPlugin } from '@capacitor/core';

export const BiometricAuth = registerPlugin('BiometricAuth');

// Helper methods with safe fallbacks when running on web without native bridge
export async function isBiometricAvailable() {
  try {
    const res = await BiometricAuth.isAvailable();
    console.log('Biometric availability result:', res);
    return !!res?.available;
  } catch (err) {
    console.error('Biometric availability failed:', err);
    throw err;
  }
}

export async function enableBiometric({ token, username }) {
  return BiometricAuth.enable({ token, username });
}

export async function authenticateBiometric(reason = 'Sign in with Face ID') {
  return BiometricAuth.authenticate({ reason });
}

export async function disableBiometric() {
  return BiometricAuth.disable();
}
