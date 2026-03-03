import React from 'react';
import styles from './Button.module.css';

export function Button({
    children,
    variant = 'primary',
    size = 'base',
    fullWidth = false,
    className = '',
    disabled = false,
    ...props
}) {
    return (
        <button
            className={`
        ${styles.button}
        ${styles[variant]}
        ${styles[size]}
        ${fullWidth ? styles.fullWidth : ''}
        ${disabled ? styles.disabled : ''}
        ${className}
      `}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}
