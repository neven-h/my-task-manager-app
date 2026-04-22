import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTaskContext } from '../context/TaskContext';
import IOSTaskCard from './IOSTaskCard';
import { THEME } from './theme';
import TaskMultiSelectBar from '../components/tasks/TaskMultiSelectBar';

const PAGE_SIZE = 30;

const IOSTaskList = ({ filterMode }) => {
    const {
        tasks, loading,
        selectedIds, clearSelection,
        exportSelectedTasks, shareSelectedTasks, deleteSelectedTasks,
    } = useTaskContext();
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef(null);

    const filteredTasks = useMemo(() => {
        if (filterMode === 'active') return tasks.filter(t => t.status !== 'completed');
        if (filterMode === 'done') return tasks.filter(t => t.status === 'completed');
        return tasks;
    }, [tasks, filterMode]);

    // Reset visible count when filter changes
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [filterMode]);

    const loadMore = useCallback(() => {
        setVisibleCount(c => Math.min(c + PAGE_SIZE, filteredTasks.length));
    }, [filteredTasks.length]);

    // Observe sentinel element to auto-load more on scroll
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) loadMore(); },
            { rootMargin: '200px' }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loadMore]);

    const visibleTasks = filteredTasks.slice(0, visibleCount);
    const hasMore = visibleCount < filteredTasks.length;

    return (
        <div style={{ padding: '0 16px 16px 16px' }}>
            <TaskMultiSelectBar
                count={selectedIds?.size || 0}
                onExport={exportSelectedTasks}
                onShare={shareSelectedTasks}
                onDelete={deleteSelectedTasks}
                onClear={clearSelection}
            />
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    Loading...
                </div>
            ) : filteredTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: THEME.muted }}>
                    No tasks found
                </div>
            ) : (
                <>
                    {visibleTasks.map(task => (
                        <IOSTaskCard key={task.id} task={task} />
                    ))}
                    {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
                </>
            )}
        </div>
    );
};

export default React.memo(IOSTaskList);
