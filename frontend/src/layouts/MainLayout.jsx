import React from 'react';
import styles from './MainLayout.module.css';

export function MainLayout({ children, header, sidebar }) {
  return (
    <div className={styles.layout}>
      {header && <header className={styles.header}>{header}</header>}
      <div className={styles.main}>
        {sidebar && <aside className={styles.sidebar}>{sidebar}</aside>}
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
