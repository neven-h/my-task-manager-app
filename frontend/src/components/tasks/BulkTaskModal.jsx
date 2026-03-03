import React from 'react';
import { X, Plus } from 'lucide-react';
import useBulkTaskModal from '../../hooks/useBulkTaskModal';
import BulkTaskOptions from './BulkTaskOptions';

const BulkTaskModal = () => {
    const {
        showBulkInput, setShowBulkInput, allCategories, clients, loading,
        bulkTasksText, setBulkTasksText, bulkCategories, bulkClient, setBulkClient,
        parseBulkTasks, handleBulkTaskSubmit, toggleBulkCategory, handleClose
    } = useBulkTaskModal();

    if (!showBulkInput) return null;

    return (
        <div className="modal-overlay" onClick={(e) => {
            if (e.target.className === 'modal-overlay') setShowBulkInput(false);
        }}>
            <div className="modal-content">
                <div style={{
                    padding: '32px', borderBottom: '3px solid #000',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: '#0000FF', color: '#fff'
                }}>
                    <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase' }}>
                        Bulk Add Uncompleted Tasks
                    </h2>
                    <button onClick={() => setShowBulkInput(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>
                        <X size={28} />
                    </button>
                </div>

                <div style={{ padding: '32px' }}>
                    <p style={{ fontSize: '1rem', marginBottom: '16px', lineHeight: '1.6', color: '#666' }}>
                        Paste or type each task on a new line. All tasks will be created
                        as <strong>uncompleted</strong> with today's date.
                        <br />
                        <strong>Tip:</strong> Use numbered lists (e.g., "1. Task" or "1) Task") for multi-line
                        task descriptions. Your draft is auto-saved.
                    </p>

                    <BulkTaskOptions
                        allCategories={allCategories}
                        clients={clients}
                        bulkCategories={bulkCategories}
                        bulkClient={bulkClient}
                        setBulkClient={setBulkClient}
                        toggleBulkCategory={toggleBulkCategory}
                    />

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{
                            display: 'block', marginBottom: '8px', fontWeight: 700,
                            fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px'
                        }}>
                            Tasks
                        </label>
                        <textarea
                            rows={12}
                            placeholder={"Simple tasks:\nTask 1\nTask 2\n\nNumbered tasks (multi-line):\n1. This is a long task\nthat spans multiple lines\n2. Another task"}
                            value={bulkTasksText}
                            onChange={(e) => setBulkTasksText(e.target.value)}
                            style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.95rem' }}
                        />
                        <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '8px' }}>
                            {parseBulkTasks(bulkTasksText).length} task(s) to create
                        </p>
                    </div>

                    <div className="form-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-white" onClick={handleClose} disabled={loading}>Cancel</button>
                        <button
                            type="button" className="btn btn-red"
                            onClick={handleBulkTaskSubmit}
                            disabled={loading || !bulkTasksText.trim()}
                        >
                            <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                            {loading ? 'Creating...' : 'Create All Tasks'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BulkTaskModal;
