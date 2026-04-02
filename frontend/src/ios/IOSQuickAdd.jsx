import React, { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useTaskContext } from '../context/TaskContext';
import { THEME, FONT_STACK } from './theme';

const IOSQuickAdd = () => {
    const { submitTask } = useTaskContext();
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);

    const handleSubmit = useCallback(async () => {
        const title = text.trim();
        if (!title || saving) return;
        setSaving(true);
        try {
            await submitTask({
                title,
                description: '',
                categories: [],
                client: '',
                task_date: new Date().toISOString().split('T')[0],
                task_time: new Date().toTimeString().slice(0, 8),
                duration: '',
                status: 'uncompleted',
                tags: [],
                notes: '',
                shared: false,
                newAttachments: [],
                removedAttachmentIds: [],
            }, null);
            setText('');
            inputRef.current?.blur();
        } catch {
            // submitTask handles errors via context setError
        } finally {
            setSaving(false);
        }
    }, [text, saving, submitTask]);

    return (
        <div style={{
            position: 'sticky', bottom: 0, left: 0, right: 0, zIndex: 50,
            background: '#fff', borderTop: '3px solid #000',
            padding: '10px 16px',
            paddingBottom: 'calc(env(safe-area-inset-bottom, 8px) + 10px)',
            display: 'flex', gap: 8, alignItems: 'center',
        }}>
            <input
                ref={inputRef} dir="auto" type="text"
                value={text} onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                placeholder="Quick add task..."
                style={{
                    flex: 1, border: '2px solid #000', padding: '12px',
                    fontSize: '1rem', fontFamily: FONT_STACK, fontWeight: 600,
                    unicodeBidi: 'plaintext',
                }}
            />
            <button
                onClick={handleSubmit}
                disabled={!text.trim() || saving}
                style={{
                    border: '2px solid #000', background: THEME.primary, color: '#fff',
                    padding: '12px 16px', cursor: 'pointer', fontWeight: 700,
                    opacity: (!text.trim() || saving) ? 0.4 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 48, minHeight: 48,
                }}
            >
                <Plus size={20} />
            </button>
        </div>
    );
};

export default React.memo(IOSQuickAdd);
