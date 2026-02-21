import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Landing.module.css";

const SHLOKAS = [
  "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन",
  "योगः कर्मसु कौशलम्",
  "नैनं छिन्दन्ति शस्त्राणि",
  "वासांसि जीर्णानि यथा विहाय",
  "यदा यदा हि धर्मस्य",
  "सर्वधर्मान्परित्यज्य",
  "ध्यायतो विषयान्पुंसः",
  "श्रद्धावाँल्लभते ज्ञानम्",
  "ईश्वरः सर्वभूतानाम्",
  "उद्धरेदात्मनात्मानम्",
  "समोऽहं सर्वभूतेषु",
  "अनन्याश्चिन्तयन्तो माम्",
  "न हि ज्ञानेन सदृशम्",
  "परित्राणाय साधूनाम्",
  "विनाशाय च दुष्कृताम्",
  "नात्यश्नतस्तु योगोऽस्ति",
  "यत्र योगेश्वरः कृष्णः",
  "अहिंसा परमो धर्मः",
];

const HIDDEN_WORDS = [];
const cols = 6;
const rows = 16;
for (let r = 0; r < rows; r++) {
  for (let c = 0; c < cols; c++) {
    HIDDEN_WORDS.push({
      text: SHLOKAS[(r * cols + c) % SHLOKAS.length],
      x: (c / cols) * 90 + 2 + (r % 2) * 5,
      y: (r / rows) * 94 + 2,
    });
  }
}

export function Landing() {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1, y: -1 });
  const particlesRef = useRef([]);
  const animFrameRef = useRef(null);

  const initParticles = useCallback((w, h) => {
    const count = Math.floor((w * h) / 12000);
    return Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -Math.random() * 0.4 - 0.1,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      pulse: Math.random() * Math.PI * 2,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    let w = container.clientWidth;
    let h = container.clientHeight;
    canvas.width = w;
    canvas.height = h;
    particlesRef.current = initParticles(w, h);

    const onResize = () => {
      w = container.clientWidth;
      h = container.clientHeight;
      canvas.width = w;
      canvas.height = h;
      particlesRef.current = initParticles(w, h);
    };

    const onMove = (e) => {
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      mouseRef.current.x = mx;
      mouseRef.current.y = my;
      container.style.setProperty("--x", `${mx}px`);
      container.style.setProperty("--y", `${my}px`);
    };

    const onLeave = () => {
      mouseRef.current.x = -1;
      mouseRef.current.y = -1;
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      particlesRef.current.forEach((p) => {
        p.pulse += 0.015;
        p.x += p.vx;
        p.y += p.vy;

        if (mx > 0 && my > 0) {
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            const force = ((150 - dist) / 150) * 0.3;
            p.x -= dx * force * 0.02;
            p.y -= dy * force * 0.02;
          }
        }

        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const flicker = 0.5 + 0.5 * Math.sin(p.pulse);
        const alpha = p.opacity * flicker;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 190, 150, ${alpha})`;
        ctx.fill();

        if (p.size > 1.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(212, 190, 150, ${alpha * 0.15})`;
          ctx.fill();
        }
      });

      animFrameRef.current = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", onResize);
    container.addEventListener("mousemove", onMove);
    container.addEventListener("mouseleave", onLeave);
    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMove);
      container.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initParticles]);

  return (
    <div ref={containerRef} className={styles.container}>
      <canvas ref={canvasRef} className={styles.particleCanvas} />

      <div className={styles.breatheGlow} />
      <div className={styles.cursorSpotlight} />
      <div className={styles.spotlightCone} />

      <div className={styles.hiddenTextLayer}>
        {HIDDEN_WORDS.map((word, i) => (
          <span
            key={i}
            className={styles.hiddenWord}
            style={{ left: `${word.x}%`, top: `${word.y}%` }}
          >
            {word.text}
          </span>
        ))}
      </div>

      <div className={styles.spotlightTextLayer}>
        {HIDDEN_WORDS.map((word, i) => (
          <span
            key={i}
            className={styles.spotlightWord}
            style={{ left: `${word.x}%`, top: `${word.y}%` }}
          >
            {word.text}
          </span>
        ))}
      </div>

      <div className={styles.content}>
        <button className={styles.enterBtn} onClick={() => navigate("/login")}>
          <span className={styles.ringOuter} />
          <span className={styles.ringInner} />
          <span className={styles.enterText}>Enter</span>
        </button>
      </div>
    </div>
  );
}

export default Landing;
