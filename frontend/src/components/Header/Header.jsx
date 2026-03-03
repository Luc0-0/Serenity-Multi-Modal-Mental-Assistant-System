import React from 'react';
import styles from './Header.module.css';

export function Header({ title, subtitle, children }) {
    return (
        <header className={styles.header}>
            <div className={styles.content}>
                {title && <h1 className={styles.title}>{title}</h1>}
                {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                {children}
            </div>
        </header>
    );
}
