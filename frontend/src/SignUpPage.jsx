import React from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';

const SignUpPage = ({ onBack }) => {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'url(/background.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      position: 'relative'
    }}>
      {/* Dark overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        pointerEvents: 'none'
      }} />

      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          fontSize: '1rem',
          fontWeight: '700',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          color: 'white',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '30px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          zIndex: 20,
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.target.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Main content */}
      <div style={{
        zIndex: 10,
        textAlign: 'center',
        padding: '60px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        maxWidth: '500px',
        width: '90%'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: 'linear-gradient(135deg, #dc3545, #ffc107)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 30px'
        }}>
          <UserPlus size={40} color="white" />
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: '900',
          margin: '0 0 20px 0',
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '-1px'
        }}>
          Coming Soon
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: '#666',
          lineHeight: '1.8',
          margin: '0 0 30px 0'
        }}>
          Sign up functionality is currently under development. 
          Check back soon to create your World Wide Pitz account!
        </p>

        {/* Color bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '60px',
            height: '6px',
            background: '#dc3545',
            borderRadius: '3px'
          }} />
          <div style={{
            width: '60px',
            height: '6px',
            background: '#ffc107',
            borderRadius: '3px'
          }} />
          <div style={{
            width: '60px',
            height: '6px',
            background: '#0d6efd',
            borderRadius: '3px'
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.9rem',
        letterSpacing: '1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        zIndex: 10
      }}>
        drpitz.club
      </div>
    </div>
  );
};

export default SignUpPage;
