import { motion } from 'framer-motion';
import styles from './GlassCard.module.css';

export function GlassCard({
  children,
  className = '',
  variant = 'default', // default | gold | success | danger
  glow = false,
  hover = true,
  ...props
}) {
  return (
    <motion.div
      className={`${styles.glassCard} ${styles[variant]} ${glow ? styles.glow : ''} ${hover ? styles.hover : ''} ${className}`}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      {...props}
    >
      <div className={styles.glassEffect} />
      <div className={styles.content}>{children}</div>
    </motion.div>
  );
}
