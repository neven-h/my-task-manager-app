import React from 'react';
import { Calendar, Download, X } from 'lucide-react';
import { useTaskContext } from '../../context/TaskContext';
import { openInCalendar, downloadICS } from '../../utils/generateICS';

const CalendarChoiceModal = () => {
    const { calendarModal, closeCalendarModal } = useTaskContext();
    const { isOpen, task } = calendarModal;

    if (!isOpen || !task) return null;

    const isNative = !!(window.Capacitor?.isNativePlatform?.());

    const handleGoogle = () => {
        openInCalendar(task);
        closeCalendarModal();
    };

    const handleSystem = async () => {
        await downloadICS(task);
        closeCalendarModal();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={closeCalendarModal}
        >
            <div
                style={{
                    background: '#fff',
                    border: '3px solid #000',
                    maxWidth: '420px',
                    width: '90%',
                    boxShadow: '8px 8px 0 #000'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{
                    background: '#FFD500',
                    padding: '16px 24px',
                    borderBottom: '3px solid #000',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <h2 style={{
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        margin: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px'
                    }}>
                        Add to Calendar
                    </h2>
                    <button
                        onClick={closeCalendarModal}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px' }}>
                    <p style={{
                        color: '#666',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        marginTop: 0,
                        marginBottom: '20px'
                    }}>
                        Choose where to add "{task.title}"
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <button
                            onClick={handleGoogle}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 18px',
                                background: '#fff',
                                border: '2px solid #000',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                textAlign: 'left',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Calendar size={20} style={{ color: '#0000FF', flexShrink: 0 }} />
                            <div>
                                <div>{isNative ? 'Apple Calendar' : 'Google Calendar'}</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'none', marginTop: '2px' }}>
                                    {isNative ? 'Adds directly to your calendar' : 'Opens in a new tab'}
                                </div>
                            </div>
                        </button>

                        <button
                            onClick={handleSystem}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '14px 18px',
                                background: '#fff',
                                border: '2px solid #000',
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.4px',
                                textAlign: 'left',
                                transition: 'background 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
                        >
                            <Download size={20} style={{ color: '#000', flexShrink: 0 }} />
                            <div>
                                <div>System Calendar</div>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#666', textTransform: 'none', marginTop: '2px' }}>
                                    {isNative ? 'Adds directly to Apple Calendar' : 'Downloads .ics file (Apple Calendar, Outlook)'}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CalendarChoiceModal;
