import { useState, useEffect, useMemo } from 'react';
import API_BASE from '../../config';
import { getAuthHeaders } from '../../api.js';
import { BAUHAUS } from '../theme';

const PIE_COLORS = BAUHAUS.pieColors;

const useMobileStats = (authUser, authRole) => {
    const [stats, setStats] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const statsRes = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
                if (statsRes.ok) {
                    const data = await statsRes.json();
                    const overall = data.overall || {};
                    const totalTasks = overall.total_tasks || 0;
                    const completedTasks = overall.completed_tasks || 0;
                    setStats({
                        total_tasks: totalTasks,
                        done_count: completedTasks,
                        active_count: overall.uncompleted_tasks || 0,
                        completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                        total_hours: overall.total_duration || 0,
                        total_revenue: overall.total_revenue,
                        by_category: data.by_category || [],
                        by_client: data.by_client || [],
                        monthly: data.monthly || []
                    });
                }
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                // Unblock the UI as soon as stats are ready — tasks load in background
                setLoading(false);
            }

            // Fetch full task list in background for the expandable breakdown
            try {
                const tasksRes = await fetch(`${API_BASE}/tasks`, { headers: getAuthHeaders() });
                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    setTasks(Array.isArray(tasksData) ? tasksData : tasksData.tasks || []);
                }
            } catch (err) {
                console.error('Error fetching tasks for breakdown:', err);
            }
        };
        fetchData();
    }, [authUser, authRole]);

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
