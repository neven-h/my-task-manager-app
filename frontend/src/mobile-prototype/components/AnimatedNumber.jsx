import React, { useEffect, useRef, useState } from 'react';

/**
 * Spring-physics animated number counter.
 * Uses requestAnimationFrame with velocity + damping for a natural settle.
 *
 * Props:
 *   value     – target numeric value
 *   formatter – fn(number) → string, e.g. formatCurrency
 *   stiffness – spring stiffness (default 120)
 *   damping   – spring damping (default 20)
 */
const AnimatedNumber = ({ value, formatter = v => String(Math.round(v)), stiffness = 120, damping = 20 }) => {
    const [display, setDisplay] = useState(value);
    const rafRef = useRef(null);
    const stateRef = useRef({ position: value, velocity: 0 });

    useEffect(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        let lastTime = null;

        const animate = (time) => {
            if (!lastTime) { lastTime = time; }
            const dt = Math.min((time - lastTime) / 1000, 0.05); // cap at 50ms per frame
            lastTime = time;

            const { position, velocity } = stateRef.current;
            const delta = value - position;
            const force = stiffness * delta - damping * velocity;
            const newVelocity = velocity + force * dt;
            const newPosition = position + newVelocity * dt;

            stateRef.current = { position: newPosition, velocity: newVelocity };
            setDisplay(newPosition);

            if (Math.abs(delta) > 0.01 || Math.abs(newVelocity) > 0.01) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                stateRef.current = { position: value, velocity: 0 };
                setDisplay(value);
            }
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [value, stiffness, damping]);

    return <span>{formatter(display)}</span>;
};

export default AnimatedNumber;
