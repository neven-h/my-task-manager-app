/**
 * Shared design tokens for the mobile prototype.
 * Single source of truth — replaces the local THEME/FONT_STACK
 * declarations previously duplicated across 12+ files.
 */

export const THEME = {
    bg: '#fff',
    primary: '#0000FF',
    secondary: '#FFD500',
    accent: '#FF0000',
    text: '#000',
    muted: '#666',
    success: '#00AA00',
    border: '#000'
};

export const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

/** Design tokens for SaaS/dashboard views (Portfolio, Transactions, Stats) */
export const BAUHAUS = {
    headerBorderWidth: '3px',
    cardBorder: '3px solid #000',
    subCardBorder: '2px solid #000',
    cardBg: '#fff',
    cardSecondaryBg: '#f8f8f8',
    stickyHeaderZIndex: 100,
    tabPadding: '8px 16px',
    tabFontSize: '0.85rem',
    labelFontSize: '0.85rem',
    labelWeight: 700,
    headingFontSize: '1.75rem',
    headingWeight: 900,
    inputBorder: '3px solid #000',
    inputPadding: '12px',
    inputFontSize: '1rem',
    fabSize: '64px',
    fabBorder: '3px solid #000',
    fabShadow: '4px 4px 0px #000',
    modalRadius: '16px 16px 0 0',
    spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px', xxl: '24px' },
    pieColors: ['#0000FF', '#FF0000', '#FFD500', '#00AA00', '#FF6B35']
};

/** Design tokens for iOS-native blend views (Home, Sidebar) */
export const IOS_BLEND = {
    headerBorderWidth: '4px',
    accentBarHeight: '12px',
    accentBarColor: '#F8B4D9',
    cardBorder: '3px solid #000',
    minTapTarget: '44px',
    sidebarWidth: '85%',
    sidebarMaxWidth: '350px',
    groupedSectionRadius: '12px',
    groupedSectionBg: '#f8f8f8',
    separatorColor: 'rgba(0,0,0,0.1)',
    transitionDuration: '0.35s',
    transitionEasing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
};
