import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * CategoryDeleteButton
 *
 * A two-step delete button for category pills.
 * First click → enters a short "confirm" state with a red "Delete?" label.
 * Second click → calls onDelete(category.id).
 * Clicking anywhere else while confirming → cancels back to idle.
 *
 * Props:
 *   category   – { id, label }
 *   onDelete   – async (categoryId) => void
 *   disabled   – bool (e.g. while loading)
 */
const CategoryDeleteButton = ({ category, onDelete, disabled }) => {
    const [confirming, setConfirming] = useState(false);
    const timerRef = useRef(null);

    // Auto-cancel confirm state after 3 s so it doesn't linger
    useEffect(() => {
        if (confirming) {
            timerRef.current = setTimeout(() => setConfirming(false), 3000);
        }
        return () => clearTimeout(timerRef.current);
    }, [confirming]);

    const handleFirstClick = (e) => {
        e.stopPropagation(); // don't toggle category selection
        setConfirming(true);
    };

    const handleConfirm = (e) => {
        e.stopPropagation();
        setConfirming(false);
        onDelete(category.id);
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        setConfirming(false);
    };

    if (confirming) {
        return (
            <span
                style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={disabled}
                    title={`Confirm delete "${category.label}"`}
                    style={{
                        background: '#FF3B30',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 7px',
                        cursor: 'pointer',
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                    }}
                >
                    Delete?
                </button>
                <button
                    type="button"
                    onClick={handleCancel}
                    title="Cancel"
                    style={{
                        background: 'rgba(0,0,0,0.12)',
                        border: 'none',
                        borderRadius: '4px',
                        color: 'inherit',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 5px',
                        cursor: 'pointer',
                        lineHeight: 1.5,
                    }}
                >
                    ✕
                </button>
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={handleFirstClick}
            disabled={disabled}
            title={`Delete "${category.label}"`}
            style={{
                background: 'none',
                border: 'none',
                padding: '1px 3px',
                cursor: 'pointer',
                color: 'inherit',
                opacity: 0.55,
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: '3px',
                lineHeight: 1,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#FF3B30'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; e.currentTarget.style.color = 'inherit'; }}
        >
            <Trash2 size={11} />
        </button>
    );
};

export default CategoryDeleteButton;
