import React, { useMemo } from 'react';
import { useTaskContext } from '../context/TaskContext';
import IOSTaskCard from './IOSTaskCard';
import { THEME } from './theme';

const IOSTaskList = ({ filterMode }) => {
    const { tasks, loading } = useTaskContext();

    const filteredTasks = useMemo(() => {
        if (filterMode === 'active') return tasks.filter(t => t.status !== 'completed');
        if (filterMode === 'done') return tasks.filter(t => t.status === 'completed');
        return tasks;
    }, [tasks, filterMode]);

    return (
        <div style={{ padding: '0 16px 16px 16px' }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    Loading...
                </div>
            ) : filteredTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    No tasks found
                </div>
            ) : (
                filteredTasks.map(task => (
                    <IOSTaskCard key={task.id} task={task} />
                ))
            )}
        </div>
    );
};

export default React.memo(IOSTaskList);
