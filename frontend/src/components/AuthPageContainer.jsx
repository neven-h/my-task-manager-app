import React from 'react';

/**
 * Reusable page container for authentication pages (SignUp, ForgotPassword, ResetPassword).
 * Provides consistent brutalism-style layout with card, title, and subtitle.
 */
const AuthPageContainer = ({ title, subtitle, children }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8f8f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        border: '3px solid #000',
        padding: '40px',
        width: '100%',
        maxWidth: '460px',
        boxShadow: '8px 8px 0 #000'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 900,
          textTransform: 'uppercase',
          marginBottom: '8px',
          letterSpacing: '-1px'
        }}>
          {title}
        </h1>
        <p style={{ marginBottom: '32px', color: '#666', fontSize: '0.95rem' }}>
          {subtitle}
        </p>
        {children}
      </div>
    </div>
  );
};

export default AuthPageContainer;
