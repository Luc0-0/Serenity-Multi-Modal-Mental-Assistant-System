import { useNavigate, useLocation } from "react-router-dom";
import styles from "./Navbar.module.css";

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <nav className={styles.navbar}>
            <div
                className={styles.logo}
                onClick={() => navigate("/check-in")}
            >
                Serenity
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
                <button className={styles.resourcesDropdown}>
                    Resources ▾
                </button>
                <button
                    className={styles.settingsButton}
                    aria-label="Settings"
                    onClick={() => navigate("/profile")} /* Assuming profile is settings */
                >
                    ⚙
                </button>
            </div>
        </nav>
    );
}
