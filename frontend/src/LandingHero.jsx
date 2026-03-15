import React from 'react';
import { Globe, Sparkles } from 'lucide-react';

const LandingHero = () => (
    <>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                <Globe size={60} style={{ color: '#dc3545', filter: 'drop-shadow(0 0 20px rgba(220,53,69,0.5))' }} />
                <Sparkles size={40} style={{ color: '#ffc107', filter: 'drop-shadow(0 0 15px rgba(255,193,7,0.5))' }} />
            </div>
        </div>
        <h1 style={{
            fontSize: 'clamp(3rem, 10vw, 5rem)', fontWeight: '900', margin: '0 0 50px 0',
            background: 'linear-gradient(90deg, #dc3545, #ffc107, #0d6efd, #dc3545)',
            backgroundSize: '300% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', animation: 'gradient 4s ease infinite',
            letterSpacing: '-2px', textTransform: 'uppercase',
        }}>
            World Wide Pitz
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '50px' }}>
            {['#dc3545', '#ffc107', '#0d6efd'].map((color, i) => (
                <div key={i} style={{ width: '80px', height: '8px', background: color, borderRadius: '4px', boxShadow: `0 0 20px ${color}80` }} />
            ))}
        </div>
    </>
);

export default LandingHero;
