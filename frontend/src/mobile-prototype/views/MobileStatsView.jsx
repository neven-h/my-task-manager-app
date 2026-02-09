import React, {useState, useEffect} from 'react';
import { ArrowLeft } from 'lucide-react';
import API_BASE from '../../config';

const MobileStatsView = ({authUser, authRole, onBack}) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await fetch(`${API_BASE}/stats?username=${authUser}&role=${authRole}`);
                if (!response.ok) throw new Error(`Stats fetch failed: ${response.status}`);
                const data = await response.json();
                const overall = data.overall || {};
                const totalTasks = overall.total_tasks || 0;
                const completedTasks = overall.completed_tasks || 0;
                const uncompletedTasks = overall.uncompleted_tasks || 0;
                const totalDuration = overall.total_duration || 0;
                setStats({
                    total_tasks: totalTasks,
                    done_count: completedTasks,
                    active_count: uncompletedTasks,
                    completion_rate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
                    total_hours: totalDuration,
                    by_category: data.by_category || [],
                    by_client: data.by_client || [],
                    monthly: data.monthly || []
                });
            } catch (err) {
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [authUser, authRole]);

    return (
        <div style={{minHeight: '100vh', background: '#fff', fontFamily: 'Inter, system-ui, sans-serif'}}>
            {/* Header */}
            <div style={{background: '#fff', borderBottom: '3px solid #000', padding: '16px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px'}}>
                    <button onClick={onBack} style={{background: 'none', border: 'none', padding: 0}}>
                        <ArrowLeft size={24}/>
                    </button>
                    <h1 style={{fontSize: '1.75rem', fontWeight: 900, margin: 0, textTransform: 'uppercase'}}>
                        STATS
                    </h1>
                </div>
            </div>

            {/* Content */}
            <div style={{padding: '16px'}}>
                {loading ? (
                    <div style={{textAlign: 'center', padding: '40px'}}>Loading...</div>
                ) : stats ? (
                    <>
                        {/* Completion Rate */}
                        <div style={{
                            background: '#f8f8f8',
                            border: '3px solid #000',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}>
                                Completion Rate
                            </h3>
                            <div style={{fontSize: '2rem', fontWeight: 900}}>
                                {stats.completion_rate?.toFixed(1) || 0}%
                            </div>
                            <div style={{color: '#666', fontSize: '0.85rem', marginTop: '8px'}}>
                                {stats.done_count || 0} of {stats.total_tasks || 0} tasks completed
                            </div>
                        </div>

                        {/* Total Hours */}
                        <div style={{
                            background: '#FFD500',
                            border: '3px solid #000',
                            padding: '20px',
                            marginBottom: '16px'
                        }}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}>
                                Total Hours
                            </h3>
                            <div style={{fontSize: '2rem', fontWeight: 900}}>
                                {stats.total_hours?.toFixed(1) || 0}h
                            </div>
                        </div>

                        {/* Revenue */}
                        {stats.total_revenue !== undefined && (
                            <div style={{
                                background: '#0000FF',
                                color: '#fff',
                                border: '3px solid #000',
                                padding: '20px',
                                marginBottom: '16px'
                            }}>
                                <h3 style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    marginBottom: '12px'
                                }}>
                                    Total Revenue
                                </h3>
                                <div style={{fontSize: '2rem', fontWeight: 900}}>
                                    ₪{stats.total_revenue?.toFixed(2) || 0}
                                </div>
                            </div>
                        )}

                        {/* Task Breakdown */}
                        <div style={{background: '#fff', border: '3px solid #000', padding: '20px'}}>
                            <h3 style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                marginBottom: '16px'
                            }}>
                                Task Breakdown
                            </h3>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Active Tasks</span>
                                    <span style={{fontWeight: 700}}>{stats.active_count || 0}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Completed</span>
                                    <span style={{fontWeight: 700}}>{stats.done_count || 0}</span>
                                </div>
                                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                                    <span>Total</span>
                                    <span style={{fontWeight: 700}}>{stats.total_tasks || 0}</span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{textAlign: 'center', padding: '40px'}}>No stats available</div>
                )}
            </div>
        </div>
    );
};

export default MobileStatsView;
