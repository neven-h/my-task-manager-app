import React from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const FONT_STACK = "'Inter', 'Helvetica Neue', Calibri, sans-serif";

const MobileTaskActions = () => {
    const { openNewTaskForm, setShowBulkInput, tasks, loading } = useTaskContext();

    return (
        <div style={{ padding: '16px', paddingBottom: '24px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <button onClick={openNewTaskForm} disabled={loading} style={{
                    fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.5px', fontSize: '0.85rem', padding: '14px 20px',
                    border: '3px solid #000', background: '#FF0000', color: '#fff',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}>
                    <Plus size={20} strokeWidth={3} /> New Task
                </button>
                <button onClick={() => setShowBulkInput(true)} disabled={loading} style={{
                    fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.5px', fontSize: '0.85rem', padding: '14px 20px',
                    border: '3px solid #000', background: '#FFD500', color: '#000',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}>
                    <Plus size={18} strokeWidth={3} /> Bulk Add
                </button>
            </div>
            <p style={{ fontFamily: FONT_STACK, fontSize: 'clamp(1rem, 3vw, 1.25rem)', fontWeight: 700, color: '#000', margin: '0 0 4px 0' }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style={{ fontFamily: FONT_STACK, fontSize: '0.9rem', color: '#666', margin: '0 0 16px 0' }}>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
};

export default React.memo(MobileTaskActions);
