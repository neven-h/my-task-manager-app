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
    <div style={headerStyle}>
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '44px 1fr 44px',
                alignItems: 'center',
                columnGap: '8px',
                paddingTop: '4px',
                paddingBottom: '8px'
            }}
        >
            <button
                onClick={onBack}
                aria-label="Back"
                style={{
                    ...(backButtonStyle || {}),
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    width: '44px',
                    height: '44px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    WebkitTapHighlightColor: 'transparent',
                    color: '#007AFF',
                }}
            >
                <ArrowLeft size={24} />
            </button>

            <h1
                style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    margin: 0,
                    textAlign: 'center',
                    justifySelf: 'center',
                    letterSpacing: '-0.3px',
                }}
            >
                Stock Portfolio
            </h1>

            <div style={{ width: '44px', height: '44px' }} />
        </div>

        {tabs.length > 0 ? (
            <div style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                paddingTop: '6px',
                paddingBottom: '4px',
                WebkitOverflowScrolling: 'touch'
            }}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTabId(Number(tab.id))}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            border: 'none',
                            background: Number(activeTabId) === Number(tab.id) ? '#007AFF' : '#f2f2f7',
                            color: Number(activeTabId) === Number(tab.id) ? '#fff' : '#000',
                            fontWeight: 500,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 200ms ease, transform 150ms ease'
                        }}
                    >
                        {tab.name}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={handleCreateTab}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#e5e5ea',
                        color: '#000',
                        fontWeight: 500,
                        fontSize: '0.8rem',
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
