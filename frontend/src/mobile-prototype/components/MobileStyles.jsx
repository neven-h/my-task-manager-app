import React from 'react';

const THEME_PRIMARY = '#0000FF';
const THEME_ACCENT = '#FF0000';
const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');

        * { -webkit-tap-highlight-color: transparent; overscroll-behavior: none; }
        body { font-family: ${FONT_STACK}; }

        .mobile-btn {
          border: 1px solid rgba(0,0,0,0.2); border-radius: 10px; background: #fff;
          font-family: ${FONT_STACK}; font-weight: 600; text-transform: none;
          font-size: 1rem; padding: 14px 20px; cursor: pointer; transition: all 0.2s ease;
        }
        .mobile-btn:active { opacity: 0.7; }
        .mobile-btn-primary { background: ${THEME_PRIMARY}; color: #fff; border-color: ${THEME_PRIMARY}; }
        .mobile-btn-accent { background: ${THEME_ACCENT}; color: #fff; border-color: ${THEME_ACCENT}; }

        .filter-pill {
          border: 3px solid #000; padding: 10px 20px; font-weight: 700;
          font-size: 0.9rem; background: #fff; cursor: pointer;
          font-family: ${FONT_STACK}; text-transform: none;
        }
        .filter-pill.active { background: ${THEME_PRIMARY}; color: #fff; }

        .task-card {
          border: 3px solid #000; background: #fff; margin-bottom: 12px;
          position: relative; transition: transform 0.2s ease;
        }

        .category-pill {
          border: 1px solid rgba(0,0,0,0.2); border-radius: 16px; padding: 8px 16px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; background: #f5f5f5;
          font-family: ${FONT_STACK}; transition: all 0.2s ease;
        }
        .category-pill.selected { background: ${THEME_PRIMARY}; color: #fff; border-color: ${THEME_PRIMARY}; }

        input, textarea, select {
          width: 100%; border: 1px solid rgba(0,0,0,0.2); border-radius: 8px;
          padding: 12px; font-size: 1rem; font-family: ${FONT_STACK}; background: #fff;
        }
        input:focus, textarea:focus, select:focus {
          outline: none; border-color: ${THEME_PRIMARY};
          box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }

        .color-bar { height: 12px; width: 100%; background: #F8B4D9; }
    `}</style>
);

export default React.memo(MobileStyles);
