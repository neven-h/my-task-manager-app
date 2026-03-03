import React from 'react';
import { THEME, FONT_STACK, IOS_BLEND } from '../theme';

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
        .mobile-btn-primary { background: ${THEME.primary}; color: #fff; border-color: ${THEME.primary}; }
        .mobile-btn-accent { background: ${THEME.accent}; color: #fff; border-color: ${THEME.accent}; }

        .filter-pill {
          border: 3px solid #000; padding: 10px 20px; font-weight: 700;
          font-size: 0.9rem; background: #fff; cursor: pointer;
          font-family: ${FONT_STACK}; text-transform: none;
        }
        .filter-pill.active { background: ${THEME.primary}; color: #fff; }

        .task-card {
          border: 3px solid #000; background: #fff; margin-bottom: 12px;
          position: relative; transition: transform 0.15s ease;
        }
        .task-card:active { transform: scale(0.98); }

        .category-pill {
          border: 1px solid rgba(0,0,0,0.2); border-radius: 16px; padding: 8px 16px;
          font-size: 0.9rem; font-weight: 600; cursor: pointer; background: #f5f5f5;
          font-family: ${FONT_STACK}; transition: all 0.2s ease;
        }
        .category-pill.selected { background: ${THEME.primary}; color: #fff; border-color: ${THEME.primary}; }

        input, textarea, select {
          width: 100%; border: 1px solid rgba(0,0,0,0.2); border-radius: 8px;
          padding: 12px; font-size: 1rem; font-family: ${FONT_STACK}; background: #fff;
        }
        input:focus, textarea:focus, select:focus {
          outline: none; border-color: ${THEME.primary};
          box-shadow: 0 0 0 3px rgba(102,126,234,0.1);
        }

        .color-bar { height: 12px; width: 100%; background: #F8B4D9; }

        /* ── iOS View Transition Animations ── */
        .view-transition-container {
          position: relative; width: 100%; min-height: 100vh; overflow: hidden;
        }
        .view-layer {
          position: absolute; top: 0; left: 0; width: 100%; min-height: 100vh;
          background: #fff; will-change: transform, opacity;
        }

        /* Push (navigate forward): new view slides in from right */
        @keyframes viewPushIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes viewPushBgOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-30%); opacity: 0.6; }
        }
        .view-push-in {
          animation: viewPushIn ${IOS_BLEND.transitionDuration} ${IOS_BLEND.transitionEasing} forwards;
        }
        .view-push-bg-out {
          animation: viewPushBgOut ${IOS_BLEND.transitionDuration} ${IOS_BLEND.transitionEasing} forwards;
        }

        /* Pop (navigate back): view slides out to right */
        @keyframes viewPopOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes viewPopBgIn {
          from { transform: translateX(-30%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        .view-pop-out {
          animation: viewPopOut ${IOS_BLEND.transitionDuration} ${IOS_BLEND.transitionEasing} forwards;
        }
        .view-pop-bg-in {
          animation: viewPopBgIn ${IOS_BLEND.transitionDuration} ${IOS_BLEND.transitionEasing} forwards;
        }

        /* Sidebar slide-in */
        @keyframes sidebarSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes sidebarSlideOut {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        .sidebar-slide-in {
          animation: sidebarSlideIn 0.3s ${IOS_BLEND.transitionEasing} forwards;
        }
        .sidebar-slide-out {
          animation: sidebarSlideOut 0.3s ${IOS_BLEND.transitionEasing} forwards;
        }

        /* iOS Grouped Sections (for sidebar) */
        .ios-grouped-section {
          background: ${IOS_BLEND.groupedSectionBg};
          border-radius: ${IOS_BLEND.groupedSectionRadius};
          overflow: hidden;
        }
        .ios-grouped-item {
          padding: 14px 16px;
          min-height: ${IOS_BLEND.minTapTarget};
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .ios-grouped-item:active { background: #f0f0f0; }
        .ios-grouped-item + .ios-grouped-item {
          border-top: 1px solid ${IOS_BLEND.separatorColor};
        }

        /* Dimming overlay for swipe-back gesture */
        .swipe-back-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.15); pointer-events: none;
          z-index: 50;
        }
    `}</style>
);

export default React.memo(MobileStyles);
