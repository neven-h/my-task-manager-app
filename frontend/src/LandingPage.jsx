import React from 'react';
import { Globe, Lock, Sparkles } from 'lucide-react';

const LandingPage = ({ onEnter }) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
      `}</style>
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
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
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
          fontWeight: '800',
          margin: '0 0 20px 0',
          background: 'linear-gradient(90deg, #dc3545, #ffc107, #0d6efd, #dc3545)',
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          animation: 'gradient 4s ease infinite',
          letterSpacing: '-2px',
          textShadow: '0 0 40px rgba(255, 193, 7, 0.3)'
        }}>
          World Wide Pitz
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '1.3rem',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '50px',
          fontWeight: '300',
          letterSpacing: '3px',
          textTransform: 'uppercase'
        }}>
          Task Management System
        </p>

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

        {/* Enter button */}
        <button
          onClick={onEnter}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            padding: '18px 50px',
            fontSize: '1.2rem',
            fontWeight: '600',
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
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: '0.9rem',
        letterSpacing: '1px'
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
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(5deg); }
        }
      `}</style>
    </div>
    </>
  );
};

export default LandingPage;
