import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, BarChart3, Filter, Settings, LogOut } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';

const TaskMobileMenu = ({ isOpen, onClose, onOpenMobileSidebar }) => {
    const navigate = useNavigate();
    const {
        isAdmin, isSharedUser, isLimitedUser, authUser,
        view, setView, onLogout,
        openNewTaskForm, setShowBulkInput
    } = useTaskContext();

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
                    zIndex: 150
                }}
            />

            {/* Side Panel */}
            <div
                className="mobile-menu-panel"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '280px',
                    maxWidth: '80vw',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    zIndex: 151,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.3)',
                    animation: 'slideInLeft 0.3s ease-out'
                }}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <X size={24}/>
                </button>

                <div style={{marginTop: '60px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto'}}>
                    {/* Show user info */}
                    <div style={{
                        color: '#fff',
                        fontSize: '1rem',
                        fontWeight: '600',
                        marginBottom: '12px',
                        textAlign: 'center'
                    }}>
                        👤 {authUser} {isAdmin ? '(admin)' : isSharedUser ? '(shared view)' : '(limited)'}
                    </div>
                    {isAdmin && (
                        <button className="btn btn-red" onClick={() => {
                            openNewTaskForm();
                            onClose();
                        }} style={{width: '100%'}}>
                            <Plus size={18} style={{marginRight: '8px'}}/>
                            New Task
                        </button>
                    )}
                    {isAdmin && (
                        <button className="btn btn-white" onClick={() => {
                            setShowBulkInput(true);
                            onClose();
                        }} style={{width: '100%'}}>
                            <Plus size={18} style={{marginRight: '8px'}}/>
                            Bulk Add
                        </button>
                    )}
                    <button className="btn btn-yellow" onClick={() => {
                        setView(view === 'list' ? 'stats' : 'list');
                        onClose();
                    }} style={{width: '100%'}}>
                        {view === 'list' ? (
                            <><BarChart3 size={18} style={{marginRight: '8px'}}/>Stats</>
                        ) : (
                            <>Tasks</>
                        )}
                    </button>
                    <button className="btn btn-white" onClick={() => {
                        onOpenMobileSidebar();
                        onClose();
                    }} style={{width: '100%'}}>
                        <Filter size={18} style={{marginRight: '8px'}}/>
                        Filters & Export
                    </button>
                    <button className="btn btn-white" onClick={() => {
                        navigate('/settings');
                        onClose();
                    }} style={{width: '100%', marginTop: '20px'}}>
                        <Settings size={18} style={{marginRight: '8px'}}/>
                        Settings
                    </button>
                    {onLogout && (
                        <button className="btn btn-white" onClick={() => {
                            onLogout();
                            onClose();
                        }} style={{width: '100%'}}>
                            <LogOut size={18} style={{marginRight: '8px'}}/>
                            Logout
                        </button>
                    )}
                </div>
            </div>
        </>
    );
};

export default TaskMobileMenu;
