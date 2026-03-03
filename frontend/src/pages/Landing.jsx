import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import styles from "./Landing.module.css";

gsap.registerPlugin(ScrollTrigger);

export function Landing() {
  const navigate = useNavigate();

  const heroRef = useRef(null);
  const videoBgRef = useRef(null);
  const treeOverlayRef = useRef(null);
  const fogLayerRef = useRef(null);
  const heroContentRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const heroCtasRef = useRef(null);
  const pillarsSectionRef = useRef(null);
  const insightSectionRef = useRef(null);
  const stepsSectionRef = useRef(null);
  const quietSectionRef = useRef(null);
  const closingSectionRef = useRef(null);
  const svgLineRef = useRef(null);
  const closingQuoteRef = useRef(null);
  const closingCtasRef = useRef(null);
  const torchRef = useRef(null);
  const mockupRef = useRef(null);
  const insightTextRef = useRef(null);
  const quietBgRef = useRef(null);

  // ── Lenis smooth scroll ───────────────────────────────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    // Connect Lenis to GSAP ticker so ScrollTrigger stays in sync
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
      gsap.ticker.remove((time) => lenis.raf(time * 1000));
    };
  }, []);

  // ── Torch cursor ──────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (torchRef.current) {
        torchRef.current.style.left = `${e.clientX}px`;
        torchRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ── Hero video parallax + animated tree scroll ────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      const scrollProgress = Math.min(scrollY / heroHeight, 1);

      if (videoBgRef.current) {
        const videoScale = 1 + scrollProgress * 0.25;
        const videoPanX = scrollProgress * -15;
        const videoOpacity = Math.max(0.6, 1 - scrollProgress * 0.5);
        videoBgRef.current.style.transform = `scale(${videoScale}) translateX(${videoPanX}%)`;
        videoBgRef.current.style.opacity = videoOpacity;
      }

      if (treeOverlayRef.current) {
        const startX = 90;
        const endX = 5;
        const currentX = startX + scrollProgress * (endX - startX);
        const treeScale = 1.1 + scrollProgress * 0.9;
        const treeOpacity = Math.min(scrollProgress * 1.4, 0.85);
        treeOverlayRef.current.style.left = `${currentX}vw`;
        treeOverlayRef.current.style.transform = `translateY(-50%) scale(${treeScale}) scaleX(-1)`;
        treeOverlayRef.current.style.opacity = treeOpacity;
      }

      if (fogLayerRef.current) {
        const fogOpacity = Math.min(scrollProgress * 1.2, 0.4);
        fogLayerRef.current.style.opacity = fogOpacity;
      }

      if (heroContentRef.current) {
        const contentOpacity = Math.max(0, 1 - scrollProgress * 1.3);
        heroContentRef.current.style.opacity = contentOpacity;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Parallax on quiet/sakura bg image ────────────────────────────
  useEffect(() => {
    const quietBg = quietBgRef.current;
    const quietSection = quietSectionRef.current;
    if (!quietBg || !quietSection) return;

    const handleScroll = () => {
      const rect = quietSection.getBoundingClientRect();
      const viewportH = window.innerHeight;

      // Only run when section is in view
      if (rect.bottom < 0 || rect.top > viewportH) return;

      // How far the section has scrolled through the viewport (-1 to 1)
      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      // Shift image by 18% of section height — slower than viewport = parallax
      const shift = (progress - 0.5) * rect.height * 0.18;
      quietBg.style.transform = `translateY(${shift}px)`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // run once on mount to set initial position
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Hero entrance ─────────────────────────────────────────────────
  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo(
      heroTitleRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.3, ease: "power2.out" },
    );
    tl.fromTo(
      heroSubtitleRef.current,
      { opacity: 0, y: 25 },
      { opacity: 1, y: 0, duration: 1.1, ease: "power2.out" },
      "-=0.6",
    );
    tl.fromTo(
      heroCtasRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" },
      "-=0.5",
    );
  }, []);

  // ── Pillar cards — clip-path wipe reveal ─────────────────────────
  useEffect(() => {
    const cards = document.querySelectorAll(`.${styles.pillarCard}`);
    if (!cards.length) return;

    gsap.fromTo(
      cards,
      {
        clipPath: "inset(100% 0 0 0)",
        opacity: 1, // opacity stays 1; clip-path does the reveal
      },
      {
        clipPath: "inset(0% 0 0 0)",
        duration: 1.1,
        stagger: 0.18,
        ease: "power3.out",
        scrollTrigger: {
          trigger: pillarsSectionRef.current,
          start: "top 75%",
          once: true,
        },
      },
    );

    const pillarNumbers = document.querySelectorAll(`.${styles.pillarNumber}`);
    pillarNumbers.forEach((element, index) => {
      const targetNum = index + 1;
      gsap.fromTo(
        { value: 0 },
        { value: targetNum },
        {
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: pillarsSectionRef.current,
            start: "top 80%",
            once: true,
          },
          onUpdate: function () {
            element.textContent = String(
              Math.floor(this.targets()[0].value),
            ).padStart(2, "0");
          },
        },
      );
    });
  }, []);

  // ── Insight text + mockup ─────────────────────────────────────────
  useEffect(() => {
    if (insightTextRef.current) {
      gsap.set(insightTextRef.current, { opacity: 1 });
      const textElements = insightTextRef.current.querySelectorAll("p, h2");
      gsap.fromTo(
        textElements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.12,
          ease: "power2.out",
          scrollTrigger: {
            trigger: insightSectionRef.current,
            start: "top 65%",
            once: true,
          },
        },
      );
    }

    if (mockupRef.current) {
      // Entrance
      gsap.fromTo(
        mockupRef.current,
        { opacity: 0, x: 60 },
        {
          opacity: 1,
          x: 0,
          duration: 1.5,
          ease: "power3.out",
          scrollTrigger: {
            trigger: insightSectionRef.current,
            start: "top 60%",
            once: true,
            onComplete: () => {
              // Floating loop starts only after entrance finishes
              gsap.to(mockupRef.current, {
                y: -12,
                duration: 4,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
              });
            },
          },
        },
      );
    }
  }, []);

  // ── Steps ─────────────────────────────────────────────────────────
  useEffect(() => {
    gsap.fromTo(
      `.${styles.stepItem}`,
      { opacity: 0, x: -40 },
      {
        opacity: 1,
        x: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: stepsSectionRef.current,
          start: "top 75%",
          once: true,
        },
      },
    );
  }, []);

  // ── Quiet quote ───────────────────────────────────────────────────
  useEffect(() => {
    gsap.fromTo(
      `.${styles.quietQuote}`,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: quietSectionRef.current,
          start: "top 60%",
          once: true,
        },
      },
    );
  }, []);

  // ── Closing ───────────────────────────────────────────────────────
  useEffect(() => {
    gsap.fromTo(
      closingQuoteRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: {
          trigger: closingSectionRef.current,
          start: "top 60%",
          once: true,
        },
      },
    );
    gsap.fromTo(
      closingCtasRef.current,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 1.1,
        delay: 0.3,
        ease: "power2.out",
        scrollTrigger: {
          trigger: closingSectionRef.current,
          start: "top 60%",
          once: true,
        },
      },
    );
  }, []);

  // ── SVG connecting line ───────────────────────────────────────────
  useEffect(() => {
    const svg = svgLineRef.current;
    if (!svg) return;
    const path = svg.querySelector("path");
    if (!path) return;
    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;
    const handleScroll = () => {
      const steps = document.querySelector(`.${styles.stepsSection}`);
      if (!steps) return;
      const stepsTop = steps.offsetTop;
      const stepsHeight = steps.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      if (scrollY + windowHeight > stepsTop) {
        const progress =
          (scrollY + windowHeight - stepsTop) / (stepsHeight + windowHeight);
        path.style.strokeDashoffset =
          pathLength * (1 - Math.max(0, Math.min(1, progress)));
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBegin = () => navigate("/signup");
  const handleWelcomeBack = () => navigate("/login");

  return (
    <div className={styles.landing}>
      <div ref={torchRef} className={styles.torch} />
      <div className={styles.filmGrain} />

      <img
        ref={treeOverlayRef}
        className={styles.treeOverlay}
        src="/images/tree.png"
        alt=""
      />
      <img className={styles.rootsOverlay} src="/images/roots.png" alt="" />

      <section ref={heroRef} className={styles.hero}>
        <video
          ref={videoBgRef}
          className={styles.heroBg}
          autoPlay
          loop
          muted
          playsInline
          src="/videos/hero-water-background.mp4"
        />
        <img
          ref={fogLayerRef}
          className={styles.fogLayer}
          src="/images/fog.png"
          alt=""
        />
        <div className={styles.heroMask} />
        <div ref={heroContentRef} className={styles.heroContent}>
          <h1 ref={heroTitleRef} className={styles.heroTitle}>
            Serenity
          </h1>
          <p ref={heroSubtitleRef} className={styles.heroSubtitle}>
            a quieter place for your mind
          </p>
          <div ref={heroCtasRef} className={styles.heroCtas}>
            <button className={styles.ctaPrimary} onClick={handleBegin}>
              Begin
            </button>
            <button className={styles.ctaSecondary} onClick={handleWelcomeBack}>
              Welcome back
            </button>
          </div>
        </div>
        <div className={styles.scrollIndicator}>
          <span>↓</span>
        </div>
      </section>

      <div className={styles.transitionHeroToPillars} />

      <section ref={pillarsSectionRef} className={styles.pillarsSection}>
        <div className={styles.textureOverlay} />
        <img className={styles.treeBackground} src="/images/tree.png" alt="" />
        <div className={styles.pillarsContent}>
          <p className={styles.sectionEyebrow}>what lives inside</p>
          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <span className={styles.pillarNumber}>01</span>
              <div className={styles.pillarDivider} />
              <h3 className={styles.pillarTitle}>Talk</h3>
              <p className={styles.pillarText}>
                Say what you can't say anywhere else. No judgment. No agenda.
                Just a space that listens.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <span className={styles.pillarNumber}>02</span>
              <div className={styles.pillarDivider} />
              <h3 className={styles.pillarTitle}>Reflect</h3>
              <p className={styles.pillarText}>
                Your journal captures what matters, quietly and without asking.
                Words become clarity over time.
              </p>
            </div>
            <div className={styles.pillarCard}>
              <span className={styles.pillarNumber}>03</span>
              <div className={styles.pillarDivider} />
              <h3 className={styles.pillarTitle}>Understand</h3>
              <p className={styles.pillarText}>
                Your emotional patterns surface slowly. Not as data — as
                understanding. Your landscape, finally readable.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.pillarsQuote}>
          <div className={styles.pillarsQuoteLine} />
          <p className={styles.pillarsQuoteText}>
            "You are allowed to be both a masterpiece and a work in progress."
          </p>
          <span className={styles.pillarsQuoteAuthor}>— Sophia Bush</span>
        </div>
      </section>

      <div className={styles.transitionPillarsToInsight} />

      <section ref={insightSectionRef} className={styles.insightSection}>
        <div className={styles.textureOverlay} />
        <div className={styles.insightInner}>
          <div ref={insightTextRef} className={styles.insightText}>
            <p
              className={styles.sectionEyebrow}
              style={{ textAlign: "left", marginBottom: "2rem" }}
            >
              what you'll find
            </p>
            <h2 className={styles.insightHeading}>
              Your emotional patterns are closer to the surface than you think.
            </h2>
            <p className={styles.insightSubtext}>
              Serenity makes them visible.
            </p>
            <p className={styles.insightBody}>
              Every conversation, every journal entry — quietly mapped. Not to
              judge, but to show you what you already carry.
            </p>
          </div>
          <div ref={mockupRef} className={styles.mockupWrapper}>
            <img
              className={styles.mockupImg}
              src="/images/mockup.png"
              alt="Serenity app"
            />
            <div className={styles.mockupGlow} />
          </div>
        </div>
      </section>

      <div className={styles.transitionInsightToSteps} />

      <section ref={stepsSectionRef} className={styles.stepsSection}>
        <div className={styles.textureOverlay} />
        <img className={styles.stepsTree} src="/images/tree.png" alt="" />
        <svg
          ref={svgLineRef}
          className={styles.connectingLine}
          viewBox="0 0 2 400"
        >
          <path
            d="M 1 0 L 1 400"
            stroke="rgba(197,168,124,0.25)"
            strokeWidth="1"
            fill="none"
          />
        </svg>
        <div className={styles.stepsContent}>
          <p className={styles.sectionEyebrow}>the process</p>
          <div className={styles.stepsContainer}>
            <div className={styles.stepItem}>
              <span className={styles.stepNumber}>01</span>
              <div className={styles.stepInfo}>
                <h4 className={styles.stepTitle}>Open Serenity</h4>
                <p className={styles.stepText}>
                  No prompts. No forms. Just an open space where you say
                  whatever needs saying.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <span className={styles.stepNumber}>02</span>
              <div className={styles.stepInfo}>
                <h4 className={styles.stepTitle}>It listens differently</h4>
                <p className={styles.stepText}>
                  Emotion is detected quietly. Patterns are tracked without
                  asking. Nothing is forced.
                </p>
              </div>
            </div>
            <div className={styles.stepItem}>
              <span className={styles.stepNumber}>03</span>
              <div className={styles.stepInfo}>
                <h4 className={styles.stepTitle}>You begin to understand</h4>
                <p className={styles.stepText}>
                  Over days and weeks, your emotional landscape becomes visible.
                  Clarity arrives on its own terms.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.transitionStepsToQuiet} />

      <section ref={quietSectionRef} className={styles.quietSection}>
        <img
          ref={quietBgRef}
          className={styles.quietBg}
          src="/images/bluesakura.png"
          alt=""
        />
        <div className={styles.quietOverlay} />
        <p className={styles.quietQuote}>
          Some things are easier to say in the dark.
        </p>
      </section>

      <div className={styles.transitionQuietToClosing} />

      <section ref={closingSectionRef} className={styles.closingSection}>
        <video
          className={styles.closingBg}
          autoPlay
          loop
          muted
          playsInline
          src="/videos/closing.mp4"
        />
        <div className={styles.closingOverlay} />
        <img className={styles.closingTree} src="/images/tree.png" alt="" />
        <div className={styles.closingContent}>
          <div ref={closingQuoteRef} className={styles.closingQuote}>
            <p className={styles.quoteLine1}>The world will always be loud.</p>
            <p className={styles.quoteLine2}>You don't have to be.</p>
          </div>
          <div ref={closingCtasRef} className={styles.closingCtas}>
            <button className={styles.glassBtn} onClick={handleBegin}>
              Create your space
            </button>
            <button
              className={styles.glassBtnSecondary}
              onClick={handleWelcomeBack}
            >
              Welcome back
            </button>
          </div>
          <p className={styles.disclaimer}>
            Your space to reflect. Not a substitute for professional care.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Landing;
