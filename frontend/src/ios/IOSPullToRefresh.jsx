import React from 'react';
import { RefreshCw } from 'lucide-react';
import usePullToRefresh from './hooks/usePullToRefresh';
import { FONT_STACK } from './theme';

const IOSPullToRefresh = ({ onRefresh, children }) => {
    const { pullY, refreshing, containerRef } = usePullToRefresh({ onRefresh });

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            {(pullY > 0 || refreshing) && (
                <div style={{
                    textAlign: 'center',
                    height: refreshing ? 40 : Math.min(pullY, 50),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    overflow: 'hidden',
                    transition: pullY > 0 ? 'none' : 'height 200ms ease-out',
                }}>
                    <RefreshCw
                        size={16}
                        style={{
                            color: '#999',
                            animation: refreshing ? 'iosSpin 600ms linear infinite' : undefined,
                            transform: !refreshing ? `rotate(${Math.min(pullY * 4, 360)}deg)` : undefined,
                        }}
                    />
                    <span style={{
                        marginLeft: 6, fontSize: '0.72rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        color: '#999', fontFamily: FONT_STACK,
                    }}>
                        {refreshing ? 'Refreshing' : pullY > 50 ? 'Release' : 'Pull'}
                    </span>
                </div>
            )}
            <style>{`@keyframes iosSpin { to { transform: rotate(360deg); } }`}</style>
            {children}
        </div>
    );
};

export default React.memo(IOSPullToRefresh);
