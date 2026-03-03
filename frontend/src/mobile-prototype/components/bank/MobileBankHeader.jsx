import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { THEME, BAUHAUS } from '../../theme';

const MobileBankHeader = ({
    onBack,
    tabs,
    activeTabId,
    setActiveTabId,
    tabsLoading,
    handleCreateTab
}) => {
    return (
        <div style={{
            background: '#fff',
            borderBottom: '3px solid #000',
            padding: '16px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px'}}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '12px',
                        cursor: 'pointer',
                        minWidth: '44px',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={24}/>
                </button>
                <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                    BANK TRANSACTIONS
                </h1>
            </div>

            {tabsLoading ? (
                <div style={{padding: '8px 0', color: THEME.muted, fontSize: '0.85rem'}}>
                    Loading tabs...
                </div>
            ) : tabs.length > 0 ? (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    minHeight: '44px',
                    alignItems: 'center'
                }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTabId(Number(tab.id))}
                            style={{
                                padding: '8px 16px',
                                border: '3px solid #000',
                                background: Number(activeTabId) === Number(tab.id) ? THEME.primary : '#fff',
                                color: Number(activeTabId) === Number(tab.id) ? '#fff' : '#000',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap',
                                cursor: 'pointer'
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
                            background: THEME.secondary,
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
                <div style={{padding: '8px 0', color: THEME.muted, fontSize: '0.85rem'}}>
                    No tabs yet. Create one below.
                </div>
            )}
        </div>
    );
};

export default MobileBankHeader;
