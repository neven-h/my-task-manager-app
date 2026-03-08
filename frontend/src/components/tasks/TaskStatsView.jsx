import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import ExpandableTaskBreakdown from './ExpandableTaskBreakdown';

const TaskStatsView = () => {
    const { stats, tasks, setView } = useTaskContext();

    return (
        <div style={{display: 'flex', flexDirection: 'column', gap: '32px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '16px'}}>
                <button
                    onClick={() => setView('list')}
                    className="btn btn-white"
                    style={{padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px'}}
                >
                    <ArrowLeft size={16}/> Tasks
                </button>
                <h2 style={{fontSize: '2rem', fontWeight: 900, margin: 0}}>Statistics</h2>
            </div>

            {stats && (
                <>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '20px'
                    }}>
                        <div style={{border: '3px solid #000', padding: '32px', background: '#fff'}}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 900
                            }}>{stats?.overall?.total_tasks ?? 0}</div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginTop: '8px'
                            }}>Total Tasks
                            </div>
                        </div>

                        <div style={{border: '3px solid #000', padding: '32px', background: '#FFD500'}}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 900
                            }}>{stats?.overall?.completed_tasks ?? 0}</div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginTop: '8px'
                            }}>Completed
                            </div>
                        </div>

                        <div style={{
                            border: '3px solid #000',
                            padding: '32px',
                            background: '#FF0000',
                            color: '#fff'
                        }}>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 900
                            }}>{stats?.overall?.uncompleted_tasks ?? 0}</div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginTop: '8px'
                            }}>Uncompleted
                            </div>
                        </div>

                        <div style={{border: '3px solid #000', padding: '32px', background: '#fff'}}>
                            <div style={{fontSize: '3rem', fontWeight: 900}}>
                                {stats?.overall?.total_duration != null ? Number(stats.overall.total_duration).toFixed(1) : '0'}h
                            </div>
                            <div style={{
                                fontSize: '0.85rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                marginTop: '8px'
                            }}>Total Hours
                            </div>
                        </div>
                    </div>

                    <ExpandableTaskBreakdown
                        tasks={tasks}
                        activeCount={stats?.overall?.uncompleted_tasks}
                        completedCount={stats?.overall?.completed_tasks}
                        totalCount={stats?.overall?.total_tasks}
                        variant="desktop"
                    />
                </>
            )}
        </div>
    );
};

export default TaskStatsView;
