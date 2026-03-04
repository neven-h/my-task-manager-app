import React, { useState, useEffect, useRef, useCallback } from 'react';
import useSwipeBack from '../hooks/useSwipeBack';

/**
 * iOS-style view transition container.
 *
 * Wraps the home view and the active sub-view, providing:
 * - Push animation when navigating to a sub-view (slides in from right)
 * - Pop animation when going back (slides out to right)
 * - Swipe-from-left-edge gesture to go back
 * - Dimming overlay on the background during transitions
 *
 * Props:
 *   currentView  — string, the active view key (e.g. 'tasks', 'stats')
 *   homeView     — string, the "home" view key (default: 'tasks')
 *   onBack       — callback to navigate back to home
 *   children     — the sub-view content (rendered when currentView !== homeView)
 *   homeContent  — the home view content (always mounted for smooth animation)
 */
const ViewTransitionContainer = ({
    currentView,
    homeView = 'tasks',
    onBack,
    children,
    homeContent
}) => {
    const isHome = currentView === homeView;
    const [transitioning, setTransitioning] = useState(false);
    const [direction, setDirection] = useState(null); // 'push' | 'pop'
    const [visibleSubView, setVisibleSubView] = useState(isHome ? null : currentView);
    const [subContent, setSubContent] = useState(isHome ? null : children);
    const prevViewRef = useRef(currentView);
    const animTimerRef = useRef(null);

    const ANIM_DURATION = 350; // ms, matches CSS

    // Handle view changes
    useEffect(() => {
        const prev = prevViewRef.current;
        prevViewRef.current = currentView;

        if (prev === currentView) return;

        // Clear any pending timer
        if (animTimerRef.current) {
            clearTimeout(animTimerRef.current);
            animTimerRef.current = null;
        }

        if (prev === homeView && currentView !== homeView) {
            // Push: going from home to sub-view
            setSubContent(children);
            setVisibleSubView(currentView);
            setDirection('push');
            setTransitioning(true);

            animTimerRef.current = setTimeout(() => {
                setTransitioning(false);
                setDirection(null);
            }, ANIM_DURATION);

        } else if (prev !== homeView && currentView === homeView) {
            // Pop: going back to home
            setDirection('pop');
            setTransitioning(true);

            animTimerRef.current = setTimeout(() => {
                setTransitioning(false);
                setDirection(null);
                setVisibleSubView(null);
                setSubContent(null);
            }, ANIM_DURATION);

        } else if (prev !== homeView && currentView !== homeView) {
            // Direct switch between sub-views — quick swap
            setSubContent(children);
            setVisibleSubView(currentView);
            setDirection('push');
            setTransitioning(true);

            animTimerRef.current = setTimeout(() => {
                setTransitioning(false);
                setDirection(null);
            }, ANIM_DURATION);
        }

        return () => {
            if (animTimerRef.current) {
                clearTimeout(animTimerRef.current);
            }
        };
    }, [currentView, homeView, children]);

    // Keep sub-content updated when not transitioning
    useEffect(() => {
        if (!transitioning && !isHome && children) {
            setSubContent(children);
        }
    }, [children, transitioning, isHome]);

    // Swipe-back gesture
    const handleSwipeBack = useCallback(() => {
        if (onBack && !isHome) {
            onBack();
        }
    }, [onBack, isHome]);

    const { swipeProgress, isActive, handlers } = useSwipeBack({
        onBack: handleSwipeBack,
        enabled: !isHome && !transitioning
    });

    const showSubView = visibleSubView !== null || (!isHome && !transitioning);

    // Compute inline transform for gesture-driven animation
    const gestureSubTransform = isActive
        ? `translateX(${swipeProgress * 100}%)`
        : undefined;
    const gestureBgTransform = isActive
        ? `translateX(${-30 + swipeProgress * 30}%)`
        : undefined;
    const gestureBgOpacity = isActive
        ? 0.6 + swipeProgress * 0.4
        : undefined;

    // Determine CSS animation classes
    let bgClass = '';
    let subClass = '';
    if (transitioning && !isActive) {
        if (direction === 'push') {
            bgClass = 'view-push-bg-out';
            subClass = 'view-push-in';
        } else if (direction === 'pop') {
            bgClass = 'view-pop-bg-in';
            subClass = 'view-pop-out';
        }
    }

    return (
        <div
            className="view-transition-container"
            {...handlers}
            style={{ position: 'relative', width: '100%', minHeight: '100vh', overflow: 'hidden' }}
        >
            {/* Home layer (always mounted) */}
            <div
                className={bgClass || undefined}
                style={{
                    position: showSubView ? 'absolute' : 'relative',
                    top: 0,
                    left: 0,
                    width: '100%',
                    minHeight: '100vh',
                    background: '#fff',
                    // Hide completely when fully behind sub-view — browser skips paint/layout
                    display: (showSubView && !transitioning && !isActive) ? 'none' : undefined,
                    willChange: isActive || transitioning ? 'transform, opacity' : undefined,
                    transform: isActive ? gestureBgTransform : (!showSubView ? undefined : (transitioning ? undefined : 'translateX(-30%)')),
                    opacity: isActive ? gestureBgOpacity : (!showSubView ? 1 : (transitioning ? undefined : 0.6)),
                    pointerEvents: showSubView ? 'none' : undefined,
                    zIndex: 1
                }}
            >
                {homeContent}
            </div>

            {/* Sub-view layer */}
            {showSubView && (
                <div
                    className={subClass || undefined}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        minHeight: '100vh',
                        background: '#fff',
                        willChange: isActive || transitioning ? 'transform' : undefined,
                        transform: isActive ? gestureSubTransform : (transitioning ? undefined : 'translateX(0)'),
                        zIndex: 2
                    }}
                >
                    {subContent || children}
                </div>
            )}

            {/* Dimming overlay during swipe */}
            {isActive && (
                <div
                    className="swipe-back-overlay"
                    style={{ opacity: 1 - swipeProgress }}
                />
            )}
        </div>
    );
};

export default ViewTransitionContainer;
