import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import storage, { STORAGE_KEYS } from '../../utils/storage';

const BulkTaskModal = () => {
    const {
        showBulkInput, setShowBulkInput,
        allCategories, clients,
        loading, submitBulkTasks
    } = useTaskContext();

    const [bulkTasksText, setBulkTasksText] = useState('');
    const [bulkCategories, setBulkCategories] = useState([]);
    const [bulkClient, setBulkClient] = useState('');

    // Draft persistence
    const saveBulkDraft = () => {
        if (bulkTasksText.trim()) {
            storage.set(STORAGE_KEYS.TASK_BULK_DRAFT, bulkTasksText);
        }
    };

    const loadBulkDraft = () => {
        return storage.get(STORAGE_KEYS.TASK_BULK_DRAFT) || '';
    };

    const clearBulkDraft = () => {
        storage.remove(STORAGE_KEYS.TASK_BULK_DRAFT);
    };

    // Auto-save bulk tasks draft
    useEffect(() => {
        if (showBulkInput && bulkTasksText) {
            const timeoutId = setTimeout(() => {
                saveBulkDraft();
            }, 1000);
            return () => clearTimeout(timeoutId);
        }
    }, [bulkTasksText, showBulkInput]);

    // Load bulk draft when modal opens
    useEffect(() => {
        if (showBulkInput) {
            const draft = loadBulkDraft();
            if (draft) {
                setBulkTasksText(draft);
            }
            setBulkCategories([]);
            setBulkClient('');
        }
    }, [showBulkInput]);

    const parseBulkTasks = (text) => {
        const lines = text.split('\n');
        const tasksToCreate = [];
        let currentTask = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/);

            if (numberedMatch) {
                if (currentTask) {
                    tasksToCreate.push(currentTask.trim());
                }
                currentTask = numberedMatch[2];
            } else {
                if (currentTask) {
                    currentTask += '\n' + line;
                } else {
                    tasksToCreate.push(line);
                }
            }
        }

        if (currentTask) {
            tasksToCreate.push(currentTask.trim());
        }

        return tasksToCreate;
    };

    const handleBulkTaskSubmit = async () => {
        if (!bulkTasksText.trim()) return;

        const taskTitles = parseBulkTasks(bulkTasksText);
        if (taskTitles.length === 0) return;

        const today = new Date().toISOString().split('T')[0];
        const now = new Date().toTimeString().slice(0, 5);

        const success = await submitBulkTasks(taskTitles, bulkCategories, bulkClient, today, now);
        if (success) {
            setBulkTasksText('');
            clearBulkDraft();
            setBulkCategories([]);
            setBulkClient('');
            setShowBulkInput(false);
        }
    };

    const toggleBulkCategory = (categoryId) => {
        if (bulkCategories.includes(categoryId)) {
            setBulkCategories(bulkCategories.filter(c => c !== categoryId));
        } else {
            setBulkCategories([...bulkCategories, categoryId]);
        }
    };

    const handleClose = () => {
        setBulkTasksText('');
        clearBulkDraft();
        setBulkCategories([]);
        setBulkClient('');
        setShowBulkInput(false);
    };

    if (!showBulkInput) return null;

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') setShowBulkInput(false);
        }}>
            <div className="modal-content">
                <div style={{
                    padding: '32px',
                    borderBottom: '3px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#0000FF',
                    color: '#fff'
                }}>
                    <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase'}}>
                        Bulk Add Uncompleted Tasks
                    </h2>
                    <button onClick={() => setShowBulkInput(false)} style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#fff'
                    }}>
                        <X size={28}/>
                    </button>
                </div>

                <div style={{padding: '32px'}}>
                    <p style={{fontSize: '1rem', marginBottom: '16px', lineHeight: '1.6', color: '#666'}}>
                        Paste or type each task on a new line. All tasks will be created
                        as <strong>uncompleted</strong> with today's date.
                        <br/>
                        <strong>Tip:</strong> Use numbered lists (e.g., "1. Task" or "1) Task") for multi-line
                        task descriptions. Your draft is auto-saved.
                    </p>

                    {/* Category and Client Selection for Bulk Tasks */}
                    <div style={{
                        marginBottom: '24px',
                        padding: '20px',
                        background: '#f8f8f8',
                        border: '2px solid #000'
                    }}>
                        <div style={{marginBottom: '16px'}}>
                            <label style={{
                                display: 'block',
                                marginBottom: '12px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Categories (optional - applies to all tasks)
                            </label>
                            <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px'}}>
                                {allCategories.map(cat => (
                                    <div
                                        key={cat.id}
                                        className={`category-pill ${bulkCategories.includes(cat.id) ? 'selected' : ''}`}
                                        onClick={() => toggleBulkCategory(cat.id)}
                                    >
                                        {cat.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Client (optional - applies to all tasks)
                            </label>
                            <input
                                type="text"
                                placeholder="Client name..."
                                value={bulkClient}
                                onChange={(e) => setBulkClient(e.target.value)}
                                list="clients-list-bulk"
                            />
                            <datalist id="clients-list-bulk">
                                {clients.map(client => {
                                    const clientName = typeof client === 'string' ? client : client.name;
                                    return <option key={clientName} value={clientName}/>;
                                })}
                            </datalist>
                        </div>
                    </div>

                    <div style={{marginBottom: '24px'}}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            Tasks
                        </label>
                        <textarea
                            rows={12}
                            placeholder={"Simple tasks:\nTask 1\nTask 2\n\nNumbered tasks (multi-line):\n1. This is a long task\nthat spans multiple lines\n2. Another task"}
                            value={bulkTasksText}
                            onChange={(e) => setBulkTasksText(e.target.value)}
                            style={{fontFamily: "'Inter', sans-serif", fontSize: '0.95rem'}}
                        />
                        <p style={{fontSize: '0.85rem', color: '#666', marginTop: '8px'}}>
                            {parseBulkTasks(bulkTasksText).length} task(s) to create
                        </p>
                    </div>

                    <div className="form-buttons" style={{display: 'flex', gap: '12px', justifyContent: 'flex-end'}}>
                        <button
                            type="button"
                            className="btn btn-white"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-red"
                            onClick={handleBulkTaskSubmit}
                            disabled={loading || !bulkTasksText.trim()}
                        >
                            <Plus size={16}
                                  style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                            {loading ? 'Creating...' : 'Create All Tasks'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkTaskModal;
