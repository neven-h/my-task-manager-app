import React from 'react';
import LandingHero from './LandingHero';
import LandingButtons from './LandingButtons';

const BG_URL = import.meta.env.VITE_BG_URL || '/background.jpg';
const BG_MOBILE_URL = import.meta.env.VITE_BG_MOBILE_URL || '/background-mobile.jpg';
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const LandingPage = ({ onEnter, onSignUp }) => {
    const isMobile = window.innerWidth <= 768;
    return (
        <div style={{
            minHeight: '100vh',
            background: isMobile
                ? `url(${BG_MOBILE_URL}) center/cover no-repeat, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`
                : `url(${BG_URL}) 20% 50%/cover no-repeat, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, overflow: 'hidden', position: 'relative',
        }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }} />

            <div style={{ textAlign: 'center', zIndex: 10, padding: '40px' }}>
                <LandingHero />
                <LandingButtons onEnter={onEnter} onSignUp={onSignUp} />
            </div>

            <div style={{ position: 'absolute', bottom: '30px', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', letterSpacing: '1px', fontFamily: FONT }}>
                drpitz.club
            </div>

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
