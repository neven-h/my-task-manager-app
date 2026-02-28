import React from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const IOSTaskActions = () => {
    const { openNewTaskForm, setShowBulkInput, tasks, loading } = useTaskContext();

    return (
        <div style={{ padding: '16px', paddingBottom: '24px' }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                <button
                    onClick={openNewTaskForm}
                    disabled={loading}
                    style={{
                        fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.5px', fontSize: '0.85rem', padding: '14px 20px',
                        border: '3px solid #000', background: THEME.accent, color: '#fff',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Plus size={20} strokeWidth={3} />
                    New Task
                </button>
                <button
                    onClick={() => setShowBulkInput(true)}
                    disabled={loading}
                    style={{
                        fontFamily: FONT_STACK, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.5px', fontSize: '0.85rem', padding: '14px 20px',
                        border: '3px solid #000', background: THEME.secondary, color: '#000',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                    }}
                >
                    <Plus size={18} strokeWidth={3} />
                    Bulk Add
                </button>
            </div>

            {/* Date and task count */}
            <p style={{
                fontFamily: FONT_STACK,
                fontSize: 'clamp(1rem, 3vw, 1.25rem)',
                fontWeight: 700, color: THEME.text, margin: '0 0 4px 0'
            }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p style={{
                fontFamily: FONT_STACK, fontSize: '0.9rem',
                color: THEME.muted, margin: '0 0 16px 0'
            }}>
                {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </p>
        </div>
    );
};

export default React.memo(IOSTaskActions);
