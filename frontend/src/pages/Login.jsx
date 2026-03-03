import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { validateLogin } from "../utils/validation";
import { Button } from "../components/Button";
import styles from "./Login.module.css";

// Inline SVG icons
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
const CheckIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
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

// Main Login component
export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { error: showError } = useNotification();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const emailInputRef = useRef(null);

  // Entrance animation + auto-focus email
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    const focusTimer = setTimeout(() => emailInputRef.current?.focus(), 600);
    return () => {
      clearTimeout(t);
      clearTimeout(focusTimer);
    };
  }, []);

  // 3D tilt effect (disabled on touch devices)
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    // Skip tilt effect on touch devices
    const isTouchDevice = 'ontouchstart' in window;
    if (isTouchDevice) return;

    let currentX = 0,
      currentY = 0,
      targetX = 0,
      targetY = 0;
    let raf;

    const tick = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      card.style.transform = `perspective(1200px) rotateX(${currentY}deg) rotateY(${currentX}deg)`;
      raf = requestAnimationFrame(tick);
    };

    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = x * 6;
      targetY = y * -6;
    };

    const handleLeave = () => {
      targetX = 0;
      targetY = 0;
    };

    card.addEventListener("mousemove", handleMove);
    card.addEventListener("mouseleave", handleLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      card.removeEventListener("mousemove", handleMove);
      card.removeEventListener("mouseleave", handleLeave);
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
    const validation = validateLogin(formData.email, formData.password);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    try {
      await login(formData.email, formData.password);
      setIsSuccess(true);
      setTimeout(() => navigate("/check-in"), 800);
    } catch (err) {
      showError("Login failed. Please check your credentials.");
    }
  };

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
        Return to stillness.
      </p>

      <div
        ref={cardRef}
        className={`${styles.card} ${mounted ? styles.cardVisible : ""}`}
      >
        <div className={styles.cardGlow} aria-hidden="true" />

        <h1 className={styles.title}>
          <span className={styles.titleWord} style={{ animationDelay: "0.3s" }}>
            Welcome
          </span>{" "}
          <span className={styles.titleWord} style={{ animationDelay: "0.5s" }}>
            Back
          </span>
        </h1>
        <p className={styles.subtitle}>Sign in to your Serenity account</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.formGroup}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <div
              className={`${styles.inputWrapper} ${focusedField === "email" ? styles.focused : ""}`}
            >
              <span className={styles.inputIcon}>
                <MailIcon />
              </span>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
                placeholder="you@example.com"
                disabled={isLoading}
                autoComplete="email"
              />
              <span className={styles.inputLine} />
            </div>
            {errors.email && (
              <span className={styles.error}>{errors.email}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <div
              className={`${styles.inputWrapper} ${focusedField === "password" ? styles.focused : ""}`}
            >
              <span className={styles.inputIcon}>
                <LockIcon />
              </span>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <span className={styles.inputLine} />
            </div>
            {errors.password && (
              <span className={styles.error}>{errors.password}</span>
            )}
          </div>

          <div className={styles.submitArea}>
            <Button
              type="submit"
              fullWidth
              disabled={isLoading || isSuccess}
              className={`${styles.submitBtn} ${isSuccess ? styles.submitBtnHidden : ""}`}
            >
              {isLoading ? (
                <span className={styles.loadingState}>
                  <LoaderIcon />
                  <span>Signing in...</span>
                </span>
              ) : (
                "Sign In"
              )}
            </Button>
            {isSuccess && (
              <div className={styles.successOverlay}>
                <span className={styles.checkmark}>
                  <CheckIcon />
                </span>
              </div>
            )}
          </div>
        </form>

        <div className={styles.footer}>
          <p>
            {"Don't have an account? "}
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => navigate("/signup")}
              disabled={isLoading}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
