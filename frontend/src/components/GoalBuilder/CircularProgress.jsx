import { useMemo } from 'react';
import styles from './CircularProgress.module.css';

export function CircularProgress({
  value = 0,
  max = 100,
  min = 0,
  primaryColor = 'rgba(200, 169, 110, 1)',
  secondaryColor = 'rgba(200, 169, 110, 0.1)',
  size = 100,
  strokeWidth = 10,
  className = '',
  children,
}) {
  const { circumference, currentPercent, strokeDasharray } = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * radius;
    const percent = Math.round(((value - min) / (max - min)) * 100);
    const dasharray = `${(percent / 100) * circ} ${circ}`;
    return {
      circumference: circ,
      currentPercent: percent,
      strokeDasharray: dasharray,
    };
  }, [value, max, min, size, strokeWidth]);

  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  return (
    <div
      className={`${styles.circularProgress} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.svg}
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={secondaryColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={primaryColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className={styles.progressCircle}
          style={{
            transition: 'stroke-dasharray 1s ease',
          }}
        />
      </svg>
      <div className={styles.content}>
        {children || <span className={styles.percentage}>{currentPercent}%</span>}
      </div>
    </div>
  );
}
