import React from 'react';
import { RefreshCw } from 'lucide-react';
import usePullToRefresh from './hooks/usePullToRefresh';
import { FONT_STACK } from './theme';

const REFRESH_HEIGHT = 48;

const IOSPullToRefresh = ({ onRefresh, children }) => {
    const { pullY, refreshing, threshold, containerRef } = usePullToRefresh({ onRefresh });
    const height = refreshing ? REFRESH_HEIGHT : pullY;
    const progress = Math.min(pullY / threshold, 1);
    const ready = pullY >= threshold;

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div
                aria-live="polite"
                style={{
                    height,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    overflow: 'hidden',
                    opacity: refreshing ? 1 : progress,
                    transition: pullY > 0 ? 'none' : 'height 250ms ease-out, opacity 250ms ease-out',
                }}
            >
                <RefreshCw
                    size={18}
                    style={{
                        color: ready || refreshing ? '#111' : '#999',
                        animation: refreshing ? 'iosSpin 700ms linear infinite' : undefined,
                        transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
                    }}
                />
                <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.4px',
                    color: ready || refreshing ? '#111' : '#999', fontFamily: FONT_STACK,
                }}>
                    {refreshing ? 'Refreshing' : ready ? 'Release to refresh' : 'Pull to refresh'}
                </span>
            </div>
            <style>{`@keyframes iosSpin { to { transform: rotate(360deg); } }`}</style>
            {children}
        </div>
    );
};

export default React.memo(IOSPullToRefresh);
