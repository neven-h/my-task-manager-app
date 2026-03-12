import React, { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import API_BASE from '../../../config';
import { getAuthHeaders } from '../../../api.js';

const IOS = {
    blue: '#007AFF', muted: '#8E8E93', separator: 'rgba(0,0,0,0.08)',
    card: '#fff', radius: 16, spring: 'cubic-bezier(0.22,1,0.36,1)',
};

/**
 * MobileBudgetLinkBanner — iOS-styled link/unlink banner for budget ↔ bank tabs.
 * NOTE: Requires MobileBudgetView to have tab support before wiring in.
 */
const MobileBudgetLinkBanner = ({ budgetTabId, linkedTab, onSetLink, onRemoveLink }) => {
    const [txTabs, setTxTabs] = useState([]);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        if (!expanded) return;
        fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : [])
            .then(d => setTxTabs(Array.isArray(d) ? d : []))
            .catch(() => setTxTabs([]));
    }, [expanded]);

    if (!budgetTabId) return null;

    if (linkedTab) {
        return (
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                margin: '0 16px 12px', padding: '10px 14px',
                background: IOS.card, borderRadius: IOS.radius,
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}>
                <Link2 size={14} color={IOS.blue} />
                <span style={{ fontSize: '0.82rem', fontWeight: 500, color: IOS.muted }}>Linked to</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: IOS.blue, flex: 1 }}>
                    {linkedTab.transaction_tab_name}
                </span>
                <button type="button" onClick={onRemoveLink}
                    style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>
                    <X size={14} color={IOS.muted} />
                </button>
            </div>
        );
    }

    return (
        <div style={{ margin: '0 16px 12px' }}>
            <button type="button" onClick={() => setExpanded(e => !e)}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, width: '100%', padding: '10px 14px',
                    background: IOS.card, borderRadius: IOS.radius, border: 'none',
                    fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 600,
                    color: IOS.blue, cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                <Link2 size={14} />
                {expanded ? 'Cancel' : 'Link bank transaction tab'}
            </button>
            {expanded && (
                <div style={{
                    marginTop: 8, background: IOS.card, borderRadius: IOS.radius,
                    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}>
                    {txTabs.length === 0 && (
                        <div style={{ padding: '14px 16px', fontSize: '0.82rem', color: IOS.muted, textAlign: 'center' }}>
                            No bank transaction tabs found
                        </div>
                    )}
                    {txTabs.map((tab, idx) => (
                        <button key={tab.id} type="button"
                            onClick={() => { onSetLink(tab.id); setExpanded(false); }}
                            style={{
                                display: 'block', width: '100%', padding: '13px 16px',
                                background: 'none', border: 'none',
                                borderBottom: idx < txTabs.length - 1 ? `0.5px solid ${IOS.separator}` : 'none',
                                textAlign: 'left', fontSize: '0.88rem', fontWeight: 500,
                                fontFamily: 'inherit', cursor: 'pointer', color: '#000',
                            }}>
                            {tab.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MobileBudgetLinkBanner;
