import { useState, useEffect } from "react";
import styles from "./ScrollIndicator.module.css";

export function ScrollIndicator({ scrollContainerId = "scroll-container" }) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const isWindowScroll = scrollContainerId === "landing-scroll-container";

    const checkScroll = () => {
      if (isWindowScroll) {
        const scrollTop = window.scrollY;
        const windowHeight = window.innerHeight;
        const docHeight = document.documentElement.scrollHeight;
        const nearBottom = scrollTop + windowHeight >= docHeight - 500;
        setGone(nearBottom);
      } else {
        const container = document.getElementById(scrollContainerId);
        if (!container) return;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const nearBottom = scrollTop + clientHeight >= scrollHeight - 500;
        setGone(nearBottom);
      }
    };

    if (isWindowScroll) {
      window.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => window.removeEventListener("scroll", checkScroll);
    } else {
      const container = document.getElementById(scrollContainerId);
      if (!container) return;
      container.addEventListener("scroll", checkScroll, { passive: true });
      checkScroll();
      return () => container.removeEventListener("scroll", checkScroll);
    }
  }, [scrollContainerId]);

  const nudge = () => {
    const isWindowScroll = scrollContainerId === "landing-scroll-container";
    
    if (isWindowScroll) {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    } else {
      const container = document.getElementById(scrollContainerId);
      if (container) {
        container.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      }
    }
  };

  return (
    <div
      className={`${styles.si} ${gone ? styles.gone : ""}`}
      onClick={nudge}
      role="button"
      aria-label="Scroll down"
    >
      <span className={styles.siLabel}>scroll</span>
      <div className={styles.pill}>
        <div className={styles.ring} />
        <div className={styles.ring} />
        <div className={styles.dot} />
      </div>
      <div className={styles.drips}>
        <div className={styles.drip} />
        <div className={styles.drip} />
        <div className={styles.drip} />
      </div>
    </div>
  );
}

export default ScrollIndicator;
