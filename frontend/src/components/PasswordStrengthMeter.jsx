import styles from "../pages/Login.module.css";

export function PasswordStrengthMeter({ password }) {
  const calculateStrength = () => {
    if (!password) return { width: 0, color: "transparent", level: 0, label: "" };
    
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 25;
    
    let color, label;
    if (strength <= 25) {
      color = "rgba(180, 120, 120, 0.7)"; // Muted red
      label = "Weak";
    } else if (strength <= 50) {
      color = "rgba(180, 150, 100, 0.7)"; // Muted yellow
      label = "Fair";
    } else if (strength <= 75) {
      color = "rgba(180, 165, 120, 0.7)"; // Muted gold
      label = "Good";
    } else {
      color = "rgba(140, 160, 120, 0.7)"; // Muted green
      label = "Strong";
    }
    
    return { width: strength, color, level: strength, label };
  };

  const { width, color, label } = calculateStrength();

  if (!password) return null;

  return (
    <div>
      <div className={styles.strengthMeter}>
        <div
          className={styles.strengthBar}
          style={{
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <span style={{
        fontSize: "0.75rem",
        color: "rgba(212, 175, 55, 0.4)",
        letterSpacing: "0.05em",
        fontFamily: "inherit",
      }}>
        {label}
      </span>
    </div>
  );
}
