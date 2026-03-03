import { useState, useEffect } from "react";
import styles from "./AppLoader.module.css";

const HOLD_MS = 2600;
const EXIT_MS = 800;

export function AppLoader() {
  const [phase, setPhase] = useState("visible"); // visible | exiting | done

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase("exiting"), HOLD_MS);
    const doneTimer = setTimeout(() => setPhase("done"), HOLD_MS + EXIT_MS);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div className={`${styles.overlay} ${phase === "exiting" ? styles.exiting : ""}`}>
      <div className={styles.ambientGlow} />
      <div className={styles.content}>
        <div className={styles.ring} />
        <span className={styles.brand}>Serenity</span>
        <div className={styles.line} />
        <span className={styles.subtitle}>preparing your space</span>
      </div>
    </div>
  );
}
