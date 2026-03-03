import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/Button";
import styles from "./Landing.module.css";

// Landing screen with parallax
export function Landing() {
  const navigate = useNavigate();
  const [parallaxOffset, setParallaxOffset] = useState({
    subtitle: 0,
    button: 0,
  });
  const containerRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (titleRef.current) titleRef.current.classList.add(styles.animateIn);
    if (subtitleRef.current)
      subtitleRef.current.classList.add(styles.animateIn);
    // Button animation is handled by the wrapper
  }, []);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;

    const { left, top, width, height } =
      containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    containerRef.current.style.setProperty("--x", `${x}%`);
    containerRef.current.style.setProperty("--y", `${y}%`);

    const centerY = height / 2;
    const offsetY = (e.clientY - centerY) * 0.02;

    setParallaxOffset({
      subtitle: offsetY * 0.5,
      button: offsetY * 0.8,
    });

    if (subtitleRef.current) {
      subtitleRef.current.style.transform = `translateY(${-20 + parallaxOffset.subtitle}px)`;
    }

    // Target the button wrapper for parallax
    if (buttonRef.current) {
      buttonRef.current.style.transform = `translateY(${parallaxOffset.button}px)`;
    }
  };

  const handleMouseLeave = () => {
    setParallaxOffset({ subtitle: 0, button: 0 });
    if (subtitleRef.current) {
      subtitleRef.current.style.transform = "translateY(-20px)";
    }
    if (buttonRef.current) {
      buttonRef.current.style.transform = "translateY(0)";
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.cursorGlow} />
      <div className={styles.overlayNoise} />
      <div className={styles.content}>
        <h1 ref={titleRef} className={styles.title}>
          Serenity
        </h1>

        <p ref={subtitleRef} className={styles.subtitle}>
          Welcome. I'm here to support your mental well-being.
        </p>

        <div ref={buttonRef} className={styles.buttonWrapper}>
          <Button
            size="lg"
            onClick={() => navigate("/login")}
            className={styles.landingBtn}
          >
            Begin
            <span className={styles.arrow}>→</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default Landing;
