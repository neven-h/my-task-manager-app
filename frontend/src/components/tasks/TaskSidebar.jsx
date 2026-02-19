import React from 'react';
import TaskFilterPanel from './TaskFilterPanel';
import TaskExportButtons from './TaskExportButtons';

const TaskSidebar = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="sidebar" style={{width: 'var(--sidebar-width, 320px)', padding: '32px 24px', transition: 'all 0.3s ease', flexShrink: 0}}>
            <TaskFilterPanel />
            <div style={{marginTop: '48px'}}>
                <TaskExportButtons />
            </div>
        </div>
    );
};

export default TaskSidebar;
