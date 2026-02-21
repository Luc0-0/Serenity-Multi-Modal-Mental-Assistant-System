import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const LARGE_PAGES = ["/", "/login", "/signup"];

export function CustomCursor() {
    const dotRef = useRef(null);
    const glowRef = useRef(null);
    const location = useLocation();
    const isLarge = LARGE_PAGES.includes(location.pathname);

    useEffect(() => {
        const dot = dotRef.current;
        const glow = glowRef.current;
        if (!dot || !glow) return;

        let x = -100, y = -100;

        const onMove = (e) => {
            x = e.clientX;
            y = e.clientY;
            dot.style.transform = `translate(${x}px, ${y}px)`;
            glow.style.transform = `translate(${x}px, ${y}px)`;
        };

        const onLeave = () => {
            dot.style.opacity = "0";
            glow.style.opacity = "0";
        };

        const onEnter = () => {
            dot.style.opacity = "1";
            glow.style.opacity = "1";
        };

        window.addEventListener("mousemove", onMove);
        document.addEventListener("mouseleave", onLeave);
        document.addEventListener("mouseenter", onEnter);

        return () => {
            window.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseleave", onLeave);
            document.removeEventListener("mouseenter", onEnter);
        };
    }, []);

    const dotSize = isLarge ? 16 : 8;
    const glowSize = isLarge ? 120 : 50;

    return (
        <>
            <div
                ref={dotRef}
                style={{
                    position: "fixed",
                    top: -dotSize / 2,
                    left: -dotSize / 2,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: "50%",
                    background: "rgba(212, 180, 131, 0.5)",
                    boxShadow: "0 0 8px rgba(212, 180, 131, 0.2)",
                    pointerEvents: "none",
                    zIndex: 99999,
                    transition: "opacity 0.2s, width 0.3s, height 0.3s",
                    willChange: "transform",
                }}
            />
            <div
                ref={glowRef}
                style={{
                    position: "fixed",
                    top: -glowSize / 2,
                    left: -glowSize / 2,
                    width: glowSize,
                    height: glowSize,
                    borderRadius: "50%",
                    background: `radial-gradient(circle, rgba(212, 180, 131, ${isLarge ? 0.22 : 0.12}) 0%, rgba(212, 180, 131, 0.05) 50%, transparent 70%)`,
                    pointerEvents: "none",
                    zIndex: 99998,
                    transition: "opacity 0.2s, width 0.3s, height 0.3s",
                    willChange: "transform",
                    mixBlendMode: "screen",
                }}
            />
        </>
    );
}
