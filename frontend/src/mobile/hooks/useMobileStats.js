import { useMemo } from 'react';
import { useTaskContext } from '../../context/TaskContext';
import { BAUHAUS } from '../theme';

const PIE_COLORS = BAUHAUS.pieColors;

const useMobileStats = () => {
    const { stats: rawStats, tasks, loading } = useTaskContext();

    const stats = useMemo(() => {
        if (!rawStats) return null;
        const overall = rawStats.overall || {};
        const totalTasks = overall.total_tasks || 0;
        const completedTasks = overall.completed_tasks || 0;
        return {
            total_tasks: totalTasks,
            done_count: completedTasks,
            active_count: overall.uncompleted_tasks || 0,
            completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
            total_hours: overall.total_duration || 0,
            total_revenue: overall.total_revenue,
            by_category: rawStats.by_category || [],
            by_client: rawStats.by_client || [],
            monthly: rawStats.monthly || []
        };
    }, [rawStats]);

    const categoryChartData = useMemo(() => {
        if (!stats?.by_category?.length) return null;
        const sorted = [...stats.by_category]
            .sort((a, b) => (b.task_count || 0) - (a.task_count || 0))
            .slice(0, 5);
        return sorted.map(c => ({ label: c.category || 'Uncategorized', value: c.task_count || 0 }));
    }, [stats?.by_category]);

    const monthlyMax = useMemo(() => {
        if (!stats?.monthly?.length) return 0;
        return Math.max(...stats.monthly.map(m => m.task_count || 0), 1);
    }, [stats?.monthly]);

    return { stats, tasks, loading, categoryChartData, monthlyMax, PIE_COLORS };
};

export default useMobileStats;
