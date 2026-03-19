/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 */

import { motion } from 'framer-motion';
import styles from './MomentumBar.module.css';

export function MomentumBar({ percentage = 0 }) {
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const isHigh = clamped >= 80;
  const isComplete = clamped >= 100;

  return (
    <div className={styles.track}>
      <motion.div
        className={`${styles.fill} ${isHigh ? styles.pulse : ''} ${isComplete ? styles.shimmer : ''}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </div>
  );
}

export default MomentumBar;
