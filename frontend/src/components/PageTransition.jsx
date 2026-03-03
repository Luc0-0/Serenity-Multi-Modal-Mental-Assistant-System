import { useState, useEffect, useRef } from "react";
import styles from "./PageTransition.module.css";

/**
 * Radial light overlay that expands from the center on route change,
 * then fades out to reveal the new page.
 */
export function PageTransition({ location }) {
    const [phase, setPhase] = useState("idle"); // idle | expand | fade
    const prevPath = useRef(location.pathname);
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            prevPath.current = location.pathname;
            return;
        }

        if (location.pathname === prevPath.current) return;
        prevPath.current = location.pathname;

        // Phase 1: radial circle expands from center
        setPhase("expand");
    }, [location.pathname]);

    const handleAnimationEnd = () => {
        if (phase === "expand") {
            // Circle fully expanded — route already changed underneath.
            // Phase 2: fade overlay out to reveal new page
            setPhase("fade");
        } else if (phase === "fade") {
            setPhase("idle");
        }
    };

    if (phase === "idle") return null;

    return (
        <div
            className={`${styles.overlay} ${styles[phase]}`}
            onAnimationEnd={handleAnimationEnd}
        />
    );
}
