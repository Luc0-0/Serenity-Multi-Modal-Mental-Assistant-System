import styles from './Card.module.css';

/**
 * Card Component.
 * Flexible container.
 */
export function Card({
  children,
  variant = 'subtle', // 'subtle' | 'bordered' | 'elevated'
  padding = 'base', // 'sm' | 'base' | 'lg'
  className = '',
  ...props
}) {
  return (
    <div
      className={`
        ${styles.card}
        ${styles[variant]}
        ${styles[`padding-${padding}`]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
