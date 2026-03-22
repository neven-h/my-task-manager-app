import React from 'react';
import { SYS } from './renovationConstants';
import RenovationItem from './RenovationItem';

const RenovationAreaGroup = ({ area, items, onUpdate, onDelete }) => (
    <div style={{ marginBottom: 24 }}>
        <div style={{
            fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px',
            color: SYS.light, borderBottom: `2px solid ${SYS.border}`, paddingBottom: 4, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 8,
        }}>
            {area}
            <span style={{ fontWeight: 400, fontSize: '0.68rem' }}>({items.length})</span>
        </div>
        {items.map(item => (
            <RenovationItem key={item.id} item={item} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
    </div>
);

export default RenovationAreaGroup;
