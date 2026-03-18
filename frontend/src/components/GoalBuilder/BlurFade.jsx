import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import styles from './BlurFade.module.css';

export function BlurFade({
  children,
  className = '',
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = 'down',
  inView = false,
  inViewMargin = '-50px',
  blur = '6px',
  ...props
}) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, { once: true, margin: inViewMargin });
  const isInView = !inView || inViewResult;

  const directionOffset = {
    up: { y: offset },
    down: { y: -offset },
    left: { x: offset },
    right: { x: -offset },
  };

  const variants = {
    hidden: {
      ...directionOffset[direction],
      opacity: 0,
      filter: `blur(${blur})`,
    },
    visible: {
      x: 0,
      y: 0,
      opacity: 1,
      filter: 'blur(0px)',
    },
  };

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      exit="hidden"
      variants={variants}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: 'easeOut',
      }}
      className={`${styles.blurFade} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
