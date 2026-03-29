import React from 'react';
import { THEME, FONT_STACK } from './theme';

const IOSStyles = () => (
    <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');

        * {
          -webkit-tap-highlight-color: transparent;
          overscroll-behavior: none;
        }

        html, body {
          background: #fff;
          font-family: ${FONT_STACK};
        }

        .mobile-btn {
          border: 2px solid #000;
          border-radius: 0;
          background: #fff;
          color: #000;
          font-family: ${FONT_STACK};
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          font-size: 0.85rem;
          padding: 14px 20px;
          cursor: pointer;
        }

        .mobile-btn:active {
          background: #000;
          color: #fff;
        }

        .mobile-btn-primary {
          background: ${THEME.primary};
          color: #fff;
          border-color: #000;
        }

        .mobile-btn-accent {
          background: ${THEME.accent};
          color: #fff;
          border-color: #000;
        }

        .filter-pill {
          border: 3px solid #000;
          border-radius: 0;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 0.85rem;
          background: #fff;
          cursor: pointer;
          font-family: ${FONT_STACK};
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        .filter-pill.active {
          background: ${THEME.primary};
          color: #fff;
        }

        .task-card {
          border: 3px solid #000;
          border-radius: 0;
          background: #fff;
          margin-bottom: 12px;
          position: relative;
        }

        .category-pill {
          border: 2px solid #000;
          border-radius: 0;
          padding: 8px 16px;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          cursor: pointer;
          background: #fff;
          font-family: ${FONT_STACK};
        }

        .category-pill.selected {
          background: ${THEME.primary};
          color: #fff;
        }

        input, textarea, select {
          width: 100%;
          border: 2px solid #000;
          border-radius: 0;
          padding: 12px;
          font-size: 1rem;
          font-family: ${FONT_STACK};
          background: #fff;
        }

        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: ${THEME.primary};
          box-shadow: none;
        }

        .color-bar {
          height: 12px;
          width: 100%;
          background: ${THEME.primary};
        }
    `}</style>
);

export default React.memo(IOSStyles);
