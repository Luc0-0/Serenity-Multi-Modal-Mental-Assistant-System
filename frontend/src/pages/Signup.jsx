import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { validateSignup } from "../utils/validation";
import { Button } from "../components/Button";
import { PasswordStrengthMeter } from "../components/PasswordStrengthMeter";
import styles from "./Signup.module.css";

// Inline SVG icons
const UserIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const MailIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
const LockIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const ShieldIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const LoaderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={styles.spinIcon}
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
);

// Floating particles
function Particles({ count = 30 }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 20 + 15,
      delay: Math.random() * -20,
      opacity: Math.random() * 0.3 + 0.05,
    })),
  ).current;

  return (
    <div className={styles.particleField} aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className={styles.particle}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Ambient cursor glow
function AmbientGlow({ containerRef }) {
  const glowRef = useRef(null);
  const pos = useRef({ x: 0.5, y: 0.5 });
  const raf = useRef(null);

  const lerp = (a, b, t) => a + (b - a) * t;

  const animate = useCallback(() => {
    const el = glowRef.current;
    if (!el) return;
    const { x, y } = pos.current;
    el.style.background = `radial-gradient(600px circle at ${x * 100}% ${y * 100}%, rgba(168, 130, 80, 0.06), transparent 60%)`;
    raf.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleMove = (e) => {
      const rect = container.getBoundingClientRect();
      pos.current = {
        x: lerp(pos.current.x, (e.clientX - rect.left) / rect.width, 0.08),
        y: lerp(pos.current.y, (e.clientY - rect.top) / rect.height, 0.08),
      };
    };
    container.addEventListener("mousemove", handleMove);
    raf.current = requestAnimationFrame(animate);
    return () => {
      container.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf.current);
    };
  }, [containerRef, animate]);

  return (
    <div ref={glowRef} className={styles.ambientGlow} aria-hidden="true" />
  );
}

// Step indicator
function StepIndicator({ step }) {
  return (
    <div className={styles.stepIndicator} aria-hidden="true">
      {[1, 2, 3, 4].map((s) => (
        <span
          key={s}
          className={`${styles.stepDot} ${s <= step ? styles.stepDotActive : ""}`}
        />
      ))}
    </div>
  );
}

// Main Signup component
export function Signup() {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  const { error: showError } = useNotification();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);
  const cardRef = useRef(null);

  const filledCount = [
    formData.name,
    formData.email,
    formData.password,
    formData.confirmPassword,
  ].filter(Boolean).length;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // 3D tilt effect
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    let cx = 0,
      cy = 0,
      tx = 0,
      ty = 0,
      raf;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      card.style.transform = `perspective(1200px) rotateX(${cy}deg) rotateY(${cx}deg)`;
      raf = requestAnimationFrame(tick);
    };
    const move = (e) => {
      const r = card.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 5;
      ty = ((e.clientY - r.top) / r.height - 0.5) * -5;
    };
    const leave = () => {
      tx = 0;
      ty = 0;
    };
    card.addEventListener("mousemove", move);
    card.addEventListener("mouseleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      card.removeEventListener("mousemove", move);
      card.removeEventListener("mouseleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validation = validateSignup(
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.name,
    );
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    try {
      await signup(formData.email, formData.password, formData.name);
      navigate("/check-in");
    } catch (err) {
      showError("Signup failed. Please try again.");
    }
  };

  const fields = [
    {
      id: "name",
      type: "text",
      label: "Full Name",
      placeholder: "Your name",
      icon: <UserIcon />,
      autoComplete: "name",
    },
    {
      id: "email",
      type: "email",
      label: "Email",
      placeholder: "you@example.com",
      icon: <MailIcon />,
      autoComplete: "email",
    },
    {
      id: "password",
      type: "password",
      label: "Password",
      placeholder: "At least 8 characters",
      icon: <LockIcon />,
      autoComplete: "new-password",
    },
    {
      id: "confirmPassword",
      type: "password",
      label: "Confirm Password",
      placeholder: "Re-enter password",
      icon: <ShieldIcon />,
      autoComplete: "new-password",
    },
  ];

  return (
    <div ref={containerRef} className={styles.container}>
      <div className={styles.bgImage} aria-hidden="true" />
      <div className={styles.bgOverlay} aria-hidden="true" />
      <div className={styles.vignetteOverlay} aria-hidden="true" />
      <Particles count={30} />
      <AmbientGlow containerRef={containerRef} />

      <p
        className={`${styles.ambientQuote} ${mounted ? styles.ambientQuoteVisible : ""}`}
        aria-hidden="true"
      >
        Begin your journey inward.
      </p>

      <div
        ref={cardRef}
        className={`${styles.card} ${mounted ? styles.cardVisible : ""}`}
      >
        <div className={styles.cardGlow} aria-hidden="true" />

        <h1 className={styles.title}>
          <span className={styles.titleWord} style={{ animationDelay: "0.3s" }}>
            Join
          </span>{" "}
          <span className={styles.titleWord} style={{ animationDelay: "0.5s" }}>
            Serenity
          </span>
        </h1>
        <p className={styles.subtitle}>Create your account to get started</p>

        <StepIndicator step={filledCount} />

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {fields.map((field, idx) => (
            <div
              key={field.id}
              className={styles.formGroup}
              style={{ animationDelay: `${0.4 + idx * 0.08}s` }}
            >
              <label htmlFor={field.id} className={styles.label}>
                {field.label}
              </label>
              <div
                className={`${styles.inputWrapper} ${focusedField === field.id ? styles.focused : ""}`}
              >
                <span className={styles.inputIcon}>{field.icon}</span>
                <input
                  id={field.id}
                  type={field.type}
                  name={field.id}
                  value={formData[field.id]}
                  onChange={handleChange}
                  onFocus={() => setFocusedField(field.id)}
                  onBlur={() => setFocusedField(null)}
                  className={`${styles.input} ${errors[field.id] ? styles.inputError : ""}`}
                  placeholder={field.placeholder}
                  disabled={isLoading}
                  autoComplete={field.autoComplete}
                />
                <span className={styles.inputLine} />
              </div>
              {field.id === "password" && (
                <PasswordStrengthMeter password={formData.password} />
              )}
              {errors[field.id] && (
                <span className={styles.error}>{errors[field.id]}</span>
              )}
            </div>
          ))}

          <Button
            type="submit"
            fullWidth
            disabled={isLoading}
            className={styles.submitBtn}
          >
            {isLoading ? (
              <span className={styles.loadingState}>
                <LoaderIcon />
                <span>Creating account...</span>
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className={styles.footer}>
          <p>
            {"Already have an account? "}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => navigate("/login")}
              disabled={isLoading}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
