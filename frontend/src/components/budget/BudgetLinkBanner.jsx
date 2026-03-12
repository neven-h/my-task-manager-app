import React, { useEffect, useState } from 'react';
import { Link2, X } from 'lucide-react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';

const SYS = { primary: '#0000FF', border: '#000', light: '#666', text: '#000' };

/**
 * BudgetLinkBanner — banner to link/unlink a budget tab to a bank transaction tab.
 * Props: budgetTabId, linkedTab, onSetLink(txTabId), onRemoveLink
 */
const BudgetLinkBanner = ({ budgetTabId, linkedTab, onSetLink, onRemoveLink }) => {
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

    const pill = {
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700,
        border: `2px solid ${SYS.border}`, cursor: 'pointer',
        textTransform: 'uppercase', letterSpacing: '0.4px',
    };

    if (linkedTab) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Link2 size={14} color={SYS.primary} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: SYS.light, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Linked to
                </span>
                <span style={{ ...pill, background: SYS.primary, color: '#fff' }}>
                    {linkedTab.transaction_tab_name}
                    <X size={12} style={{ cursor: 'pointer' }} onClick={onRemoveLink} />
                </span>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
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
                <span style={{ fontSize: '0.78rem', color: SYS.light }}>No bank transaction tabs found</span>
            )}
        </div>
    );
};

export default BudgetLinkBanner;
