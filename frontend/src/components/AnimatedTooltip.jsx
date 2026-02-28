import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export function AnimatedTooltip({ content, placement = "top", delay = 300, children }) {
  const [visible, setVisible] = useState(false);
  const [isHoverDevice, setIsHoverDevice] = useState(false);
  const timerRef = useRef(null);
  const tooltipId = useId();
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsHoverDevice(mq.matches);
    const handler = (e) => setIsHoverDevice(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }, [delay]);

  const hide = useCallback(() => {
    clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  const getInitial = () => {
    const base = { opacity: 0, scale: 0.92 };
    if (placement === "top") return { ...base, y: 4 };
    if (placement === "bottom") return { ...base, y: -4 };
    if (placement === "left") return { ...base, x: 4 };
    if (placement === "right") return { ...base, x: -4 };
    return base;
  };

  const getPosition = () => {
    if (placement === "top") return { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
    if (placement === "bottom") return { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" };
    if (placement === "left") return { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
    if (placement === "right") return { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" };
  };

  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={isHoverDevice ? show : undefined}
      onMouseLeave={isHoverDevice ? hide : undefined}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={visible ? tooltipId : undefined}>
        {children}
      </span>
      <AnimatePresence>
        {visible && (
          <motion.span
            id={tooltipId}
            role="tooltip"
            initial={shouldReduceMotion ? { opacity: 0 } : getInitial()}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : { ...getInitial(), transition: { duration: 0.12 } }}
            transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
            style={{
              position: "absolute",
              ...getPosition(),
              zIndex: 9999,
              whiteSpace: "nowrap",
              padding: "0.35rem 0.75rem",
              background: "rgba(10, 8, 6, 0.92)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(197, 168, 124, 0.2)",
              borderRadius: "8px",
              color: "rgba(240, 235, 225, 0.85)",
              fontSize: "0.68rem",
              letterSpacing: "0.08em",
              fontFamily: "inherit",
              boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
              pointerEvents: "none",
            }}
          >
            {content}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
