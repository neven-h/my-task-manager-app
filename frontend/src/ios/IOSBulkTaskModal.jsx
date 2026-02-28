import React, { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import CustomAutocomplete from '../components/CustomAutocomplete';
import { useTaskContext } from '../context/TaskContext';
import storage, { STORAGE_KEYS } from '../utils/storage';
import { THEME, FONT_STACK } from './theme';

const labelStyle = {
    display: 'block', marginBottom: '8px', fontWeight: 700,
    fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
};

const parseBulkTasks = (text) => {
    const lines = text.split('\n');
    const tasks = [];
    let currentTask = '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const numbered = trimmed.match(/^(\d+)[.)]\s+(.+)$/);
        if (numbered) {
            if (currentTask) tasks.push(currentTask.trim());
            currentTask = numbered[2];
        } else if (currentTask) {
            currentTask += '\n' + trimmed;
        } else {
            tasks.push(trimmed);
        }
    }
    if (currentTask) tasks.push(currentTask.trim());
    return tasks;
};

const IOSBulkTaskModal = () => {
    const { showBulkInput, setShowBulkInput, submitBulkTasks, allCategories, clients, loading } = useTaskContext();

    const [bulkText, setBulkText] = useState('');
    const [bulkCategory, setBulkCategory] = useState([]);
    const [bulkClient, setBulkClient] = useState('');

    // Load draft when modal opens
    useEffect(() => {
        if (showBulkInput) {
            const draft = storage.get(STORAGE_KEYS.MOBILE_BULK_DRAFT) || '';
            if (draft && !bulkText) setBulkText(draft);
        }
    }, [showBulkInput]);

    // Auto-save draft (1s debounce)
    useEffect(() => {
        if (!showBulkInput || !bulkText) return;
        const timer = setTimeout(() => {
            storage.set(STORAGE_KEYS.MOBILE_BULK_DRAFT, bulkText);
        }, 1000);
        return () => clearTimeout(timer);
    }, [bulkText, showBulkInput]);

    const handleSubmit = useCallback(async () => {
        if (!bulkText.trim()) return;
        const taskTitles = parseBulkTasks(bulkText);
        if (taskTitles.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().slice(0, 5);
        const success = await submitBulkTasks(taskTitles, bulkCategory, bulkClient, today, time);
        if (success) {
            setBulkText('');
            setBulkCategory([]);
            setBulkClient('');
            storage.remove(STORAGE_KEYS.MOBILE_BULK_DRAFT);
            setShowBulkInput(false);
        }
    }, [bulkText, bulkCategory, bulkClient, submitBulkTasks, setShowBulkInput]);

    const handleCancel = () => {
        setBulkText('');
        setBulkCategory([]);
        setBulkClient('');
        storage.remove(STORAGE_KEYS.MOBILE_BULK_DRAFT);
        setShowBulkInput(false);
    };

    if (!showBulkInput) return null;

    const parsedCount = parseBulkTasks(bulkText).length;

    return (
        <div
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.5)', zIndex: 200,
                display: 'flex', alignItems: 'flex-end', padding: 0
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowBulkInput(false); }}
        >
            <div style={{
                width: '100%', maxHeight: '94vh', height: '94vh', background: '#fff',
                borderRadius: '16px 16px 0 0', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
                display: 'flex', flexDirection: 'column', boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                paddingBottom: 'env(safe-area-inset-bottom, 0)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px', paddingTop: 'max(16px, env(safe-area-inset-top, 0))',
                    borderBottom: '1px solid rgba(0,0,0,0.1)', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center',
                    position: 'sticky', top: 0, background: THEME.accent, zIndex: 1
                }}>
                    <h2 style={{ fontSize: '1.3rem', fontWeight: 900, margin: 0, textTransform: 'uppercase', fontFamily: FONT_STACK, color: '#000' }}>
                        Bulk Add Tasks
                    </h2>
                    <button onClick={() => setShowBulkInput(false)} style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer' }}>
                        <X size={28} color="#000" />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '16px', paddingBottom: 'max(32px, calc(env(safe-area-inset-bottom, 0px) + 24px))' }}>
                    <p style={{ marginBottom: '16px', fontSize: '0.9rem', color: '#666', lineHeight: '1.5' }}>
                        Enter each task on a new line. You can use numbered lists (1., 2.) or just plain text.
                    </p>

                    {/* Textarea */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Tasks ({parsedCount})</label>
                        <textarea
                            rows={10} value={bulkText} onChange={e => setBulkText(e.target.value)}
                            placeholder={"1. First task\n2. Second task\n3. Third task"}
                            style={{
                                width: '100%', padding: '14px', border: '3px solid #000', borderRadius: '0',
                                fontSize: '1rem', fontFamily: 'monospace', lineHeight: '1.6',
                                boxSizing: 'border-box', resize: 'vertical', minHeight: '200px'
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Categories */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Category (Optional)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {allCategories.map(cat => (
                                <div
                                    key={cat.id}
                                    className={`category-pill ${bulkCategory.includes(cat.id) ? 'selected' : ''}`}
                                    onClick={() => setBulkCategory(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])}
                                >
                                    {cat.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Client */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={labelStyle}>Client (Optional)</label>
                        <CustomAutocomplete
                            value={bulkClient}
                            onChange={value => setBulkClient(value)}
                            options={clients.map(c => typeof c === 'string' ? c : String(c))}
                            placeholder="Client name..."
                        />
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button onClick={handleCancel} className="mobile-btn" style={{ flex: 1 }} disabled={loading}>Cancel</button>
                        <button onClick={handleSubmit} className="mobile-btn mobile-btn-accent" style={{ flex: 1 }} disabled={loading || !bulkText.trim()}>
                            {loading ? 'Creating...' : `Create ${parsedCount} Tasks`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IOSBulkTaskModal;
