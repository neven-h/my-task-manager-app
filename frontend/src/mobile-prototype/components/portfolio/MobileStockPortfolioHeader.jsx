import React from 'react';
import { ArrowLeft } from 'lucide-react';

const MobileStockPortfolioHeader = ({
    onBack,
    tabs,
    activeTabId,
    setActiveTabId,
    handleCreateTab,
    theme,
    headerStyle,
    backButtonStyle
}) => (
    <div
        style={{
            ...(headerStyle || {}),
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)',
            paddingLeft: '16px',
            paddingRight: '16px'
        }}
    >
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 44px',
                alignItems: 'center',
                columnGap: '12px',
                marginBottom: '12px'
            }}
        >
            <button
                onClick={onBack}
                aria-label="Back"
                style={{
                    ...(backButtonStyle || {}),
                    width: '44px',
                    height: '44px',
                    minWidth: '44px',
                    minHeight: '44px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <ArrowLeft size={24} />
            </button>

            <h1
                style={{
                    fontSize: '1.75rem',
                    fontWeight: 900,
                    margin: 0,
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    justifySelf: 'center'
                }}
            >
                STOCK PORTFOLIO
            </h1>

            <div style={{ width: '44px', height: '44px' }} />
        </div>

        {tabs.length > 0 ? (
            <div style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                minHeight: '44px',
                alignItems: 'center',
                WebkitOverflowScrolling: 'touch'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTabId(Number(tab.id))}
                        style={{
                            padding: '8px 16px',
                            border: '3px solid #000',
                            background: Number(activeTabId) === Number(tab.id) ? theme.primary : '#fff',
                            color: Number(activeTabId) === Number(tab.id) ? '#fff' : '#000',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            flexShrink: 0
                        }}
                    >
                        {tab.name}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={handleCreateTab}
                    style={{
                        padding: '8px 16px',
                        border: '3px solid #000',
                        background: theme.secondary,
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        flexShrink: 0
                    }}
                >
                    + Tab
                </button>
            </div>
        ) : (
            <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: theme.muted, margin: 0 }}>Loading tabs...</p>
            </div>
        )}
    </div>
);

export default MobileStockPortfolioHeader;
