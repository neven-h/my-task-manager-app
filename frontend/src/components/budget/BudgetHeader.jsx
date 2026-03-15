import React from 'react';
import { FileDown } from 'lucide-react';

const SYS = {
    primary: '#0000FF',
    success: '#00AA00',
    accent:  '#FF0000',
    bg:      '#fff',
    border:  '#000',
};

export const BudgetHeader = ({ onBackToTasks, exportBudgetCSV, activeTabId, entriesCount, openAdd }) => (
    <div style={{
        background: SYS.bg,
        borderBottom: `3px solid ${SYS.border}`,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
    }}>
        <button onClick={onBackToTasks}
            style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: SYS.primary, fontWeight: 700, fontSize: '0.85rem',
                textTransform: 'uppercase', letterSpacing: '0.4px', padding: 0,
            }}>
            ← Tasks
        </button>
        <h1 style={{
            flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 800,
            textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
            Budget Planner
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => exportBudgetCSV(activeTabId)}
                disabled={entriesCount === 0}
                style={{
                    padding: '7px 14px', border: `2px solid ${SYS.border}`,
                    background: SYS.primary, color: '#fff',
                    fontWeight: 700, fontSize: '0.78rem', cursor: entriesCount === 0 ? 'not-allowed' : 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    opacity: entriesCount === 0 ? 0.5 : 1,
                    display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <FileDown size={14} /> CSV
            </button>
            <button onClick={() => openAdd('income')}
                style={{
                    padding: '7px 14px', border: `2px solid ${SYS.border}`,
                    background: SYS.success, color: '#fff',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                + Income
            </button>
            <button onClick={() => openAdd('outcome')}
                style={{
                    padding: '7px 14px', border: `2px solid ${SYS.border}`,
                    background: SYS.accent, color: '#fff',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                }}>
                + Expense
            </button>
        </div>
    </div>
);

export default BudgetHeader;
