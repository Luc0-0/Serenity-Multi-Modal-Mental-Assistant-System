import { useState, useEffect, useRef } from "react";
import styles from "./PageTransition.module.css";

const DEPTH = {
  "/": 0,
  "/login": 1,
  "/signup": 1,
  "/onboarding": 1,
  "/checkin": 2,
  "/journal": 2,
  "/insights": 2,
  "/meditate": 2,
  "/profile": 2,
};

function getDepth(path) {
  return DEPTH[path] ?? 1;
}

export function PageTransition({ location }) {
  const [phase, setPhase] = useState("idle"); // idle | expand | fade
  const [direction, setDirection] = useState("forward"); // forward | back
  const prevPath = useRef(location.pathname);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevPath.current = location.pathname;
      return;
    }

    if (location.pathname === prevPath.current) return;

    const prevDepth = getDepth(prevPath.current);
    const nextDepth = getDepth(location.pathname);
    setDirection(nextDepth >= prevDepth ? "forward" : "back");
    prevPath.current = location.pathname;

    setPhase("expand");
  }, [location.pathname]);

  const handleAnimationEnd = () => {
    if (phase === "expand") {
      setPhase("fade");
    } else if (phase === "fade") {
      setPhase("idle");
    }
  };

  if (phase === "idle") return null;

  return (
    <div
      className={`${styles.overlay} ${styles[phase]} ${styles[direction]}`}
      onAnimationEnd={handleAnimationEnd}
    />
  );
}
