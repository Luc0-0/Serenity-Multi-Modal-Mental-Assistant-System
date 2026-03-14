/**
 * OrbLayout.jsx
 * CSS clip-path based layout for orb + surrounding buttons
 * Simpler, more reliable approach
 */

import styles from "./OrbLayout.module.css";

export function OrbLayout({ children, width = "100%", height = "100%" }) {
  return (
    <div className={styles.orbLayoutWrapper} style={{ width, height }}>
      {/* Center content (orb) */}
      <div className={styles.orbCenter}>
        {children}
      </div>
    </div>
  );
}

export function OrbButton({ 
  position = "left", 
  children, 
  className = "", 
  onClick,
  ...props 
}) {
  return (
    <div
      className={`${styles.orbButton} ${styles[position]} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
