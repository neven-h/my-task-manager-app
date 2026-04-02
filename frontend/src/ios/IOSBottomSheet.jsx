import React, { useRef, useState } from 'react';
import useSwipeDown from './hooks/useSwipeDown';

const SPRING = 'cubic-bezier(0.22,1,0.36,1)';

const IOSBottomSheet = ({ isOpen, onClose, children, maxHeight = '85dvh', height }) => {
    const scrollRef = useRef(null);
    const [closing, setClosing] = useState(false);

    const handleClose = () => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 260);
    };

    const { dragY, handlers: swipeHandlers } = useSwipeDown({ onClose: handleClose, scrollRef });

    if (!isOpen && !closing) return null;

    const visible = isOpen && !closing;
    const backdropOpacity = visible ? Math.max(0, 1 - dragY / 300) : 0;

    return (
        <>
            <div
                onClick={handleClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    opacity: backdropOpacity,
                    transition: dragY > 0 ? 'none' : `opacity 260ms ${SPRING}`,
                    zIndex: 300,
                }}
            />
            <div style={{
                position: 'fixed', left: 0, right: 0, bottom: 0,
                background: '#fff', borderTop: '3px solid #000',
                maxHeight: height || maxHeight, height: height || 'auto',
                overflowY: 'hidden', display: 'flex', flexDirection: 'column',
                transform: visible ? `translateY(${dragY}px)` : 'translateY(100%)',
                transition: dragY > 0 ? 'none' : `transform 260ms ${SPRING}`,
                zIndex: 301,
                paddingBottom: 'env(safe-area-inset-bottom, 0)',
                animation: visible && dragY === 0 ? 'iosSheetUp 250ms ease-out' : undefined,
            }}>
                <style>{`@keyframes iosSheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

                {/* Drag handle */}
                <div
                    {...swipeHandlers}
                    style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px', touchAction: 'none', cursor: 'grab', flexShrink: 0 }}
                >
                    <div style={{ width: 36, height: 5, background: 'rgba(0,0,0,0.18)', borderRadius: 3 }} />
                </div>

                {/* Scrollable content */}
                <div ref={scrollRef} style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {children}
                </div>
            </div>
        </>
    );
};

export default React.memo(IOSBottomSheet);
