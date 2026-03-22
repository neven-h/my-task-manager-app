import React from 'react';
import { formatCurrency } from '../../utils/formatCurrency';

const TransactionHistoryRows = ({ history, colors }) => (
    <>
        {history.map(h => (
            <tr key={h.id} style={{ borderBottom: `1px solid ${colors.border}`, background: '#f9f9f9' }}>
                <td />
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                    {new Date(h.transaction_date).toLocaleDateString('he-IL')}
                </td>
                <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.9rem', color: colors.textLight }}>
                    {h.description}
                </td>
                <td />
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                    <span style={{ padding: '0.3rem 0.6rem', background: h.transaction_type === 'cash' ? colors.success : colors.accent, color: '#fff', fontSize: '0.8rem', fontWeight: '600', border: `2px solid ${colors.border}`, fontFamily: '"Inter", sans-serif', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        {h.transaction_type === 'cash' ? 'Cash' : 'Credit'}
                    </span>
                </td>
                <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: '700', fontFamily: 'Consolas, "Courier New", monospace', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.05em', fontSize: '0.95rem', color: h.amount < 0 ? colors.accent : colors.textLight }}>
                    {formatCurrency(h.amount)}
                </td>
                <td style={{ padding: '0.65rem 0.75rem' }} />
            </tr>
        ))}
    </>
);

export default TransactionHistoryRows;
