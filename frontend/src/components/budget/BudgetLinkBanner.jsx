import React, { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SYS = { primary: '#0000FF', border: '#000', light: '#666', text: '#000' };

const formatDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * BudgetLinkBanner — banner to link/unlink a budget tab to a bank transaction tab.
 * Props: budgetTabId, linkedTab, onSetLink(txTabId), onRemoveLink
 */
const BudgetLinkBanner = ({ budgetTabId, linkedTab, linkError, onSetLink, onRemoveLink }) => {
    const [txTabs, setTxTabs] = useState([]);
    const [expanded, setExpanded] = useState(false);
    const [syncInfo, setSyncInfo] = useState(null);

    useEffect(() => {
        if (!expanded) return;
        fetch(`${API_BASE}/transaction-tabs`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : [])
            .then(d => setTxTabs(Array.isArray(d) ? d : []))
            .catch(() => setTxTabs([]));
    }, [expanded]);

    useEffect(() => {
        if (!linkedTab || !budgetTabId) { setSyncInfo(null); return; }
        fetch(`${API_BASE}/budget-tabs/${budgetTabId}/sync-status`, { headers: getAuthHeaders() })
            .then(r => r.ok ? r.json() : null)
            .then(d => setSyncInfo(d && d.linked ? d : null))
            .catch(() => setSyncInfo(null));
    }, [linkedTab, budgetTabId]);

    if (!budgetTabId) return null;

    const pill = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700,
        border: `2px solid ${SYS.border}`, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.4px',
    };

    if (linkedTab) {
        const parts = [];
        if (syncInfo) {
            parts.push(`${syncInfo.transaction_count} bank transactions synced`);
            const fmt = formatDate(syncInfo.last_transaction_date);
            if (fmt) parts.push(`Last: ${fmt}`);
        }
        return (
            <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Link2 size={14} color={SYS.primary} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        Linked to
                    </span>
                    <span style={{ ...pill, background: SYS.primary, color: '#fff' }}>
                        {linkedTab.transaction_tab_name}
                        <X size={12} style={{ cursor: 'pointer' }} onClick={onRemoveLink} />
                    </span>
                </div>
                {parts.length > 0 && (
                    <div style={{ marginTop: 4, marginLeft: 24, fontSize: '0.74rem', color: '#999' }}>
                        {parts.join(' \u00B7 ')}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setExpanded(e => !e)}
                    style={{ ...pill, background: expanded ? '#f5f5f5' : '#fff' }}>
                    <Link2 size={14} />
                    {expanded ? 'Cancel' : 'Link bank tab'}
                </button>
                {expanded && txTabs.map(tab => (
                    <button key={tab.id} type="button"
                        onClick={() => { onSetLink(tab.id); setExpanded(false); }}
                        style={{ ...pill, background: '#fff' }}>
                        {tab.name}
                    </button>
                ))}
                {expanded && txTabs.length === 0 && (
                    <span style={{ fontSize: '0.78rem', color: SYS.light }}>
                        No bank transaction tabs found — create one in the Bank Transactions tab first
                    </span>
                )}
            </div>
            {linkError && (
                <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#CC0000', fontWeight: 600 }}>
                    {linkError}
                </div>
            )}
        </div>
    );
};

export default BudgetLinkBanner;
