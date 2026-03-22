import React from 'react';
import { Wrench, Plus } from 'lucide-react';
import { SYS } from './renovationConstants';

const RenovationHeader = ({ onBackToTasks, showAddForm, setShowAddForm, itemCount: _itemCount }) => (
    <div style={{
        background: SYS.bg, borderBottom: `4px solid ${SYS.border}`,
        padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
    }}>
        {onBackToTasks && (
            <button onClick={onBackToTasks} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: SYS.primary, fontWeight: 700, fontSize: '0.85rem',
                textTransform: 'uppercase', letterSpacing: '0.4px', padding: 0,
            }}>
                ← Back
            </button>
        )}
        <Wrench size={20} color={SYS.primary} />
        <h1 style={{
            flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
            Renovation Tracker
        </h1>
        <button onClick={() => setShowAddForm(s => !s)} style={{
            padding: '8px 16px', border: `2px solid ${SYS.border}`,
            background: showAddForm ? SYS.border : SYS.primary, color: '#fff',
            cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem',
            textTransform: 'uppercase', letterSpacing: '0.4px', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 6,
        }}>
            <Plus size={15} /> Add Item
        </button>
    </div>
);

export default RenovationHeader;
