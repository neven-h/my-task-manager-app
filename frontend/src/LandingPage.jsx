import React from 'react';
import { Globe, Lock, Sparkles, UserPlus } from 'lucide-react';

const LandingPage = ({ onEnter, onSignUp }) => {
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
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Dark overlay for better text readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        pointerEvents: 'none'
      }} />

      {/* Main content */}
      <div style={{
        textAlign: 'center',
        zIndex: 10,
        padding: '40px'
      }}>
        {/* Logo/Icon area */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          <div style={{
            display: 'flex',
            gap: '15px',
            alignItems: 'center'
          }}>
            <Globe 
              size={60} 
              style={{ 
                color: '#dc3545',
                filter: 'drop-shadow(0 0 20px rgba(220, 53, 69, 0.5))'
              }} 
            />
            <Sparkles 
              size={40} 
              style={{ 
                color: '#ffc107',
                filter: 'drop-shadow(0 0 15px rgba(255, 193, 7, 0.5))'
              }} 
            />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(3rem, 10vw, 5rem)',
          fontWeight: '900',
          margin: '0 0 50px 0',
          background: 'linear-gradient(90deg, #dc3545, #ffc107, #0d6efd, #dc3545)',
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'gradient 4s ease infinite',
          letterSpacing: '-2px',
          textShadow: '0 0 40px rgba(255, 193, 7, 0.3)',
          textTransform: 'uppercase'
        }}>
          World Wide Pitz
        </h1>

        {/* Color bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '10px',
          marginBottom: '50px'
        }}>
          <div style={{
            width: '80px',
            height: '8px',
            background: '#dc3545',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(220, 53, 69, 0.5)'
          }} />
          <div style={{
            width: '80px',
            height: '8px',
            background: '#ffc107',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(255, 193, 7, 0.5)'
          }} />
          <div style={{
            width: '80px',
            height: '8px',
            background: '#0d6efd',
            borderRadius: '4px',
            boxShadow: '0 0 20px rgba(13, 110, 253, 0.5)'
          }} />
        </div>

        {/* Buttons container */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center'
        }}>
          {/* Enter button */}
          <button
            onClick={onEnter}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '18px 50px',
              fontSize: '1.2rem',
              fontWeight: '700',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              color: 'white',
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 10px 40px rgba(220, 53, 69, 0.4)',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-3px) scale(1.02)';
              e.target.style.boxShadow = '0 15px 50px rgba(220, 53, 69, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 10px 40px rgba(220, 53, 69, 0.4)';
            }}
          >
            <Lock size={20} />
            Enter System
          </button>

          {/* Sign Up button */}
          <button
            onClick={onSignUp}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              padding: '14px 40px',
              fontSize: '1rem',
              fontWeight: '700',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              color: 'white',
              background: 'transparent',
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '50px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.8)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'transparent';
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <UserPlus size={18} />
            Sign Up
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.9rem',
        letterSpacing: '1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        drpitz.club
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
