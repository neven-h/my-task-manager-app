import React, * as r from 'react';
import { disableBiometric, isBiometricAvailable } from './biometricAuth.js';

/* function Se() component */
function Se() {
  const [biometricAvailable, setBiometricAvailable] = r.useState(false);
  // other state declarations

  // existing useEffect calling he()
  r.useEffect(() => {
    he();
    (async () => {
      const avail = await isBiometricAvailable();
      setBiometricAvailable(avail);
    })();
  }, []);

  // other functions and hooks

  return {
    // existing returned values and methods
    biometricAvailable,
    handleDisableBiometric: async () => {
      try {
        await disableBiometric();
        s('Face ID sign-in disabled.');
        setTimeout(() => s(''), 3000);
      } catch (e) {
        console.error('Disable biometric failed', e);
      }
    },
  };
}

/* Settings UI - inside the Security card, under Two-Factor section buttons */
// assuming 't' is the variable referencing Se() return value, and 'e' is React.createElement or jsx runtime

{t.biometricAvailable && e.jsx('div', {
  style: {
    marginTop: '20px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    background: '#f9fafb',
  },
  children: e.jsxs('div', {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '12px',
    },
    children: [
      e.jsxs('div', {
        children: [
          e.jsx('h4', { style: { margin: 0 }, children: 'Face ID Sign-In' }),
          e.jsx('p', {
            style: { margin: 0, color: '#666', fontSize: '0.9rem' },
            children: 'Disable Face ID-based sign-in on this device.',
          }),
        ],
      }),
      e.jsx('button', {
        onClick: t.handleDisableBiometric,
        style: {
          padding: '10px 16px',
          background: 'transparent',
          border: '2px solid #dc2626',
          color: '#dc2626',
          borderRadius: '10px',
          fontWeight: 600,
          cursor: 'pointer',
        },
        children: 'Disable Face ID',
      }),
    ],
  }),
})}
