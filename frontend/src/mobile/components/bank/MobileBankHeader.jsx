import React from 'react';
import { ArrowLeft, FileDown } from 'lucide-react';
import { THEME } from '../../theme';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const MobileBankHeader = ({
    onBack,
    tabs,
    activeTabId,
    setActiveTabId,
    tabsLoading,
    handleCreateTab,
    exportTransactionsCSV,
    hasTransactions,
}) => {
    return (
        <div style={{
            background: '#fff',
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            paddingLeft: '16px',
            paddingRight: '16px',
            paddingBottom: '16px',
            paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'grid', gridTemplateColumns: '44px 1fr 44px', alignItems: 'center', marginBottom: '12px' }}>
                <button
                    onClick={onBack}
                    style={{
                        background: 'none', border: 'none', padding: '10px',
                        cursor: 'pointer', minWidth: '44px', minHeight: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                >
                    <ArrowLeft size={22} />
                </button>
                <div style={{ textAlign: 'center', justifySelf: 'center' }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                        Bank Transactions
                    </h1>
                    <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: 500 }}>
                        Cards, Cash &amp; Transfers
                    </span>
                </div>
                <button
                    onClick={exportTransactionsCSV}
                    disabled={!hasTransactions}
                    style={{
                        background: 'none', border: 'none', padding: '10px',
                        cursor: hasTransactions ? 'pointer' : 'not-allowed',
                        minWidth: '44px', minHeight: '44px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: hasTransactions ? 1 : 0.35,
                    }}
                    title="Export CSV"
                >
                    <FileDown size={22} color={THEME.primary} />
                </button>
            </div>

            {tabsLoading ? (
                <div style={{padding: '8px 0', color: THEME.muted, fontSize: '0.85rem'}}>
                    Loading tabs...
                </div>
            ) : tabs.length > 0 ? (
                <div style={{
                    display: 'flex', gap: '8px',
                    overflowX: 'auto', paddingBottom: '2px',
                    minHeight: '40px', alignItems: 'center',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {tabs.map(tab => {
                        const isActive = Number(activeTabId) === Number(tab.id);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTabId(Number(tab.id))}
                                style={{
                                    padding: '7px 16px',
                                    border: 'none',
                                    borderRadius: 20,
                                    background: isActive ? THEME.primary : 'rgba(0,0,0,0.06)',
                                    color: isActive ? '#fff' : '#555',
                                    fontWeight: isActive ? 600 : 500,
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    cursor: 'pointer',
                                    flexShrink: 0,
                                    transition: `background 200ms ${SPRING}, color 200ms ${SPRING}`
                                }}
                            >
                                {tab.name}
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={handleCreateTab}
                        style={{
                            padding: '7px 16px',
                            border: 'none',
                            borderRadius: 20,
                            background: 'rgba(0,0,0,0.06)',
                            color: '#555',
                            fontWeight: 500,
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
                <div style={{ padding: '8px 0', color: THEME.muted, fontSize: '0.85rem' }}>
                    No tabs yet. Create one below.
                </div>
            )}
        </div>
    );
};

export default MobileBankHeader;
