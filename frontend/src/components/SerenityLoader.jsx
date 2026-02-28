import styles from "./SerenityLoader.module.css";

const WORD = "SERENITY";
const LAYERS = 9;

export function SerenityLoader({ visible = true }) {
  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(6, 5, 4, 1)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
    }}>
      <div className={styles.loader}>
        {Array.from({ length: LAYERS }).map((_, i) => (
          <div key={i} className={styles.text}>
            <span>{WORD}</span>
          </div>
        ))}
        <div className={styles.line} />
      </div>
    </div>
  );
}
