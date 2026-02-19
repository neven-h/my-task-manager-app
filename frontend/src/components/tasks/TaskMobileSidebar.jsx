import React from 'react';
import { X } from 'lucide-react';
import TaskFilterPanel from './TaskFilterPanel';
import TaskExportButtons from './TaskExportButtons';

const TaskMobileSidebar = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 199
                }}
            />

            {/* Filters Side Panel */}
            <div
                className="filters-panel"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '320px',
                    maxWidth: '85vw',
                    background: '#f8f8f8',
                    zIndex: 200,
                    overflowY: 'auto',
                    padding: '20px',
                    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
                    animation: 'slideInRight 0.3s ease-out',
                    boxSizing: 'border-box'
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <h2 style={{margin: 0, fontSize: '1.5rem', fontWeight: 900}}>Filters & Export</h2>
                    <button
                        onClick={onClose}
                        className="btn btn-white"
                        style={{padding: '10px', minWidth: 'auto'}}
                    >
                        <X size={24}/>
                    </button>
                </div>

                <TaskFilterPanel />

                <div style={{marginBottom: '24px'}}>
                    <TaskExportButtons onActionComplete={onClose} />
                </div>

                <button className="btn btn-red" onClick={onClose}
                        style={{width: '100%', marginTop: '20px'}}>Apply & Close
                </button>
            </div>
        </>
    );
};

export default TaskMobileSidebar;
