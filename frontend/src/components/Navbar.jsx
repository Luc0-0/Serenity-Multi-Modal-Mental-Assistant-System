import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import styles from "./Navbar.module.css";

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
      {/* DESKTOP navbar — hide on mobile */}
      <nav className={styles.navbar}>
        <div className={styles.logo} onClick={() => navigate("/check-in")}>
          <img
            src="/images/logonav1.png"
            alt="Serenity logo"
            className={styles.logoImg}
          />
        </div>

        <div className={styles.navLinks}>
          <button
            className={`${styles.navLink} ${isActive("/check-in") ? styles.active : ""}`}
            onClick={() => navigate("/check-in")}
          >
            Check-in
          </button>
          <button
            className={`${styles.navLink} ${isActive("/journal") ? styles.active : ""}`}
            onClick={() => navigate("/journal")}
          >
            Journal
          </button>
          <button
            className={`${styles.navLink} ${isActive("/insights") ? styles.active : ""}`}
            onClick={() => navigate("/insights")}
          >
            Insights
          </button>
          <button
            className={`${styles.navLink} ${isActive("/meditate") ? styles.active : ""}`}
            onClick={() => navigate("/meditate")}
          >
            Meditate
          </button>
        </div>

        <div className={styles.rightGroup}>
          <button className={styles.resourcesDropdown}>Resources ▾</button>
          <button
            className={styles.settingsButton}
            aria-label="Settings"
            onClick={() => navigate("/profile")}
          >
            ⚙
          </button>
        </div>
      </nav>

      {/* MOBILE bottom tab bar — only visible on mobile */}
      <nav className={styles.mobileNav}>
        <button
          className={`${styles.mobileTab} ${isActive("/check-in") ? styles.mobileActive : ""}`}
          onClick={() => navigate("/check-in")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22C6.5 22 2 17.5 2 12S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/><path d="M8 12s1 2 4 2 4-2 4-2"/></svg>
          <span className={styles.mobileTabLabel}>Check-in</span>
        </button>
        <button
          className={`${styles.mobileTab} ${isActive("/journal") ? styles.mobileActive : ""}`}
          onClick={() => navigate("/journal")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
          <span className={styles.mobileTabLabel}>Journal</span>
        </button>
        <button
          className={`${styles.mobileTab} ${isActive("/insights") ? styles.mobileActive : ""}`}
          onClick={() => navigate("/insights")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/></svg>
          <span className={styles.mobileTabLabel}>Insights</span>
        </button>
        <button
          className={`${styles.mobileTab} ${isActive("/meditate") ? styles.mobileActive : ""}`}
          onClick={() => navigate("/meditate")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
          <span className={styles.mobileTabLabel}>Meditate</span>
        </button>
        <button
          className={`${styles.mobileTab} ${isActive("/profile") ? styles.mobileActive : ""}`}
          onClick={() => navigate("/profile")}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span className={styles.mobileTabLabel}>Profile</span>
        </button>
      </nav>
    </>
  );
}
