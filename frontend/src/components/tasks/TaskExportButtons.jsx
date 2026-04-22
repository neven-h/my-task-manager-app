import React, { useRef, useState } from 'react';
import { Download, Upload, RefreshCw } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import TaskExportPanel from './TaskExportPanel';

const TaskExportButtons = ({ onActionComplete }) => {
    const { tasks, loading, exportToCSV, exportHoursReport, importHoursReport, fetchTasks, fetchStats, buildFilterParams, allCategories } = useTaskContext();
    const fileInputRef = useRef(null);
    const [showPanel, setShowPanel] = useState(false);

    const handlePanelExport = async (overrides) => {
        const params = buildFilterParams({
            search: '', client: '', tags: [], hasAttachment: false,
            dateStart: overrides.dateStart || '',
            dateEnd: overrides.dateEnd || '',
            status: overrides.status || 'all',
            category: overrides.category || 'all',
        });
        await exportToCSV(params);
        setShowPanel(false);
        if (onActionComplete) onActionComplete();
    };

    const handleAction = (action) => async () => {
        await action();
        if (onActionComplete) onActionComplete();
    };

    const handleImport = async (e) => {
        await importHoursReport(e);
        if (onActionComplete) onActionComplete();
    };

    return (
        <div>
            <h3 style={{
                fontSize: '0.75rem',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '16px'
            }}>Export / Import</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                <button className="btn btn-yellow" onClick={handleAction(exportHoursReport)}
                        disabled={tasks.length === 0} style={{width: '100%'}}>
                    <Download size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                    Export Tasks
                </button>
                <button className="btn btn-yellow"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading} style={{width: '100%'}}>
                    <Upload size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                    Import Tasks
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleImport}
                    style={{display: 'none'}}
                />
                <button className="btn btn-blue" onClick={() => setShowPanel(s => !s)}
                        disabled={tasks.length === 0} style={{width: '100%'}}>
                    <Download size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                    Export CSV
                </button>
                {showPanel && (
                    <TaskExportPanel
                        allCategories={allCategories}
                        onExport={handlePanelExport}
                        onCancel={() => setShowPanel(false)}
                    />
                )}
                <button className="btn btn-white" onClick={handleAction(async () => {
                    await fetchTasks();
                    await fetchStats();
                })} disabled={loading} style={{width: '100%'}}>
                    <RefreshCw size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: '8px'}}/>
                    Refresh
                </button>
            </div>
        </div>
    );
};

export default TaskExportButtons;
