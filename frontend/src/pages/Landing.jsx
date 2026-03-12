import { useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ScrollIndicator } from "../components/ScrollIndicator";
import styles from "./Landing.module.css";

gsap.registerPlugin(ScrollTrigger);

// Split text into word spans with proper spacing
function splitIntoWords(el, options = {}) {
  if (!el) return [];
  const text = el.textContent.trim();
  el.innerHTML = "";
  const words = text.split(/\s+/);
  const spans = [];

  words.forEach((word, i) => {
    const wordSpan = document.createElement("span");
    wordSpan.textContent = word;
    wordSpan.className = styles.wordSpan || "";
    if (options.blur) {
      wordSpan.style.filter = "blur(8px)";
      wordSpan.style.opacity = "0";
    } else {
      wordSpan.style.opacity = "0";
      wordSpan.style.transform = "translateY(10px)";
    }
    el.appendChild(wordSpan);
    spans.push(wordSpan);

    // Add a real space text node between words
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode("\u00A0"));
    }
  });

  return spans;
}

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
  const quietQuoteRef = useRef(null);
  const scrollLineRef = useRef(null);
  const svgOrbRef = useRef(null);
  const filmGrainRef = useRef(null);
  const socialProofSectionRef = useRef(null);
  const comparisonSectionRef = useRef(null);

  // Smooth scroll with Lenis
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Sync GSAP ScrollTrigger with Lenis
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Torch cursor following mouse
  useEffect(() => {
    const torch = torchRef.current;
    if (!torch) return;
    let mouseX = 0,
      mouseY = 0;
    let currentX = 0,
      currentY = 0;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    function animateTorch() {
      currentX += (mouseX - currentX) * 0.12;
      currentY += (mouseY - currentY) * 0.12;
      torch.style.left = `${currentX}px`;
      torch.style.top = `${currentY}px`;
      requestAnimationFrame(animateTorch);
    }

    window.addEventListener("mousemove", handleMouseMove);
    requestAnimationFrame(animateTorch);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Film grain opacity from scroll velocity
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTime = performance.now();
    let currentOpacity = 0.015;
    let rafId;

    const updateGrain = () => {
      const now = performance.now();
      const dt = now - lastTime;
      const dy = Math.abs(window.scrollY - lastScrollY);
      const velocity = dt > 0 ? dy / dt : 0;
      const targetOpacity = Math.min(0.06, 0.015 + velocity * 0.04);
      currentOpacity += (targetOpacity - currentOpacity) * 0.1;
      if (filmGrainRef.current) {
        filmGrainRef.current.style.opacity = currentOpacity;
      }
      lastScrollY = window.scrollY;
      lastTime = now;
      rafId = requestAnimationFrame(updateGrain);
    };
    rafId = requestAnimationFrame(updateGrain);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Hero video parallax and tree animation
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

  // Quiet section background parallax
  useEffect(() => {
    const quietBg = quietBgRef.current;
    const quietSection = quietSectionRef.current;
    if (!quietBg || !quietSection) return;

    const handleScroll = () => {
      const rect = quietSection.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportH) return;
      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      const shift = (progress - 0.5) * rect.height * 0.18;
      quietBg.style.transform = `translateY(${shift}px) scale(${1 + progress * 0.04})`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero title animation - character reveal
  useEffect(() => {
    const titleEl = heroTitleRef.current;
    if (titleEl) {
      const text = titleEl.textContent;
      titleEl.innerHTML = "";
      text.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.display = "inline-block";
        span.style.clipPath = "circle(0% at 50% 50%)";
        span.style.opacity = "0";
        titleEl.appendChild(span);
      });

      const chars = titleEl.querySelectorAll("span");
      const tl = gsap.timeline({ delay: 0.5 });

      tl.to(chars, {
        clipPath: "circle(100% at 50% 50%)",
        opacity: 1,
        duration: 1.2,
        stagger: 0.06,
        ease: "power3.out",
      });

      if (heroSubtitleRef.current) {
        tl.fromTo(
          heroSubtitleRef.current,
          { opacity: 0, y: 25, filter: "blur(4px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1.2,
            ease: "power2.out",
          },
          "-=0.5",
        );
      }
      if (heroCtasRef.current) {
        tl.fromTo(
          heroCtasRef.current,
          { opacity: 0, y: 25 },
          { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
          "-=0.6",
        );
      }
    }

    // Scroll indicator — line draws down, fades, repeats
    if (scrollLineRef.current) {
      gsap.fromTo(
        scrollLineRef.current,
        { scaleY: 0, opacity: 0.7, transformOrigin: "top center" },
        {
          scaleY: 1,
          opacity: 0,
          duration: 2.2,
          ease: "power1.inOut",
          repeat: -1,
          repeatDelay: 0.6,
        },
      );
    }
  }, []);

  // ── Pillar cards — clip-path wipe + hover depth ──────────────────
  useEffect(() => {
    const cards = document.querySelectorAll(`.${styles.pillarCard}`);
    if (!cards.length) return;

    // Staggered reveal from bottom
    cards.forEach((card, i) => {
      gsap.fromTo(
        card,
        { clipPath: "inset(100% 0 0 0)", opacity: 1 },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 1.2,
          delay: i * 0.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: pillarsSectionRef.current,
            start: "top 72%",
            once: true,
          },
        },
      );
    });

    // Luminous divider lines draw in after card reveals
    const dividers = document.querySelectorAll(`.${styles.pillarDivider}`);
    dividers.forEach((div, i) => {
      gsap.fromTo(
        div,
        { scaleY: 0, transformOrigin: "top center" },
        {
          scaleY: 1,
          duration: 1.4,
          delay: 0.6 + i * 0.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: pillarsSectionRef.current,
            start: "top 72%",
            once: true,
          },
        },
      );
    });

    // Internal parallax on hover
    cards.forEach((card) => {
      const number = card.querySelector(`.${styles.pillarNumber}`);
      const title = card.querySelector(`.${styles.pillarTitle}`);
      const divider = card.querySelector(`.${styles.pillarDivider}`);

      card.addEventListener("mouseenter", () => {
        gsap.to(number, { y: -10, duration: 0.5, ease: "power2.out" });
        gsap.to(title, { y: -5, duration: 0.5, ease: "power2.out" });
        if (divider)
          gsap.to(divider, { height: 36, duration: 0.5, ease: "power2.out" });
      });
      card.addEventListener("mouseleave", () => {
        gsap.to(number, { y: 0, duration: 0.5, ease: "power2.out" });
        gsap.to(title, { y: 0, duration: 0.5, ease: "power2.out" });
        if (divider)
          gsap.to(divider, { height: 28, duration: 0.5, ease: "power2.out" });
      });
    });

    // Counter animation on pillar numbers
    const pillarNumbers = document.querySelectorAll(`.${styles.pillarNumber}`);
    pillarNumbers.forEach((element, index) => {
      const targetNum = index + 1;
      gsap.fromTo(
        { value: 0 },
        { value: targetNum },
        {
          duration: 1.4,
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

    // Pillars quote — word-by-word fade with vertical drift (FIXED SPACING)
    const quoteText = document.querySelector(`.${styles.pillarsQuoteText}`);
    if (quoteText) {
      const wordSpans = splitIntoWords(quoteText);
      gsap.to(wordSpans, {
        opacity: 1,
        y: 0,
        transform: "translateY(0)",
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
        scrollTrigger: {
          trigger: quoteText,
          start: "top 85%",
          once: true,
        },
      });
    }

    // Quote attribution fade
    const quoteAuthor = document.querySelector(`.${styles.pillarsQuoteAuthor}`);
    if (quoteAuthor) {
      gsap.fromTo(
        quoteAuthor,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: quoteAuthor,
            start: "top 90%",
            once: true,
          },
        },
      );
    }

    // Quote line draws from center outward
    const quoteLine = document.querySelector(`.${styles.pillarsQuoteLine}`);
    if (quoteLine) {
      gsap.fromTo(
        quoteLine,
        { scaleX: 0 },
        {
          scaleX: 1,
          duration: 1.2,
          ease: "power2.out",
          scrollTrigger: {
            trigger: quoteLine,
            start: "top 90%",
            once: true,
          },
        },
      );
    }
  }, []);

  // ── Insight text — two-beat rhythm + mockup 3D reveal ────────────
  useEffect(() => {
    if (insightTextRef.current) {
      const heading = insightTextRef.current.querySelector(
        `.${styles.insightHeading}`,
      );
      const subtext = insightTextRef.current.querySelector(
        `.${styles.insightSubtext}`,
      );
      const body = insightTextRef.current.querySelector(
        `.${styles.insightBody}`,
      );
      const eyebrow = insightTextRef.current.querySelector(
        `.${styles.sectionEyebrow}`,
      );

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: insightSectionRef.current,
          start: "top 62%",
          once: true,
        },
      });

      // Make container visible first
      tl.set(insightTextRef.current, { opacity: 1 });

      // Eyebrow slides in
      tl.fromTo(
        eyebrow,
        { opacity: 0, x: -30 },
        { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
      );

      // Heading fades in with upward drift
      tl.fromTo(
        heading,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" },
        "-=0.3",
      );

      // THE BEAT — a deliberate 0.7s pause
      tl.to({}, { duration: 0.7 });

      // Subtext wipes in from left via clip-path
      tl.fromTo(
        subtext,
        { clipPath: "inset(0 100% 0 0)", opacity: 1 },
        { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power2.out" },
      );

      // Body text fades in
      if (body) {
        tl.fromTo(
          body,
          { opacity: 0, y: 20 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
          "-=0.3",
        );
      }
    }

    // Mockup — scroll-linked 3D tilt reveal
    if (mockupRef.current) {
      gsap.set(mockupRef.current, {
        opacity: 0,
        rotateY: 12,
        rotateX: 4,
        scale: 0.92,
        transformPerspective: 1200,
      });

      gsap.to(mockupRef.current, {
        opacity: 1,
        rotateY: 0,
        rotateX: 0,
        scale: 1,
        duration: 1.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: insightSectionRef.current,
          start: "top 55%",
          once: true,
        },
      });

      // Gentle float after reveal
      ScrollTrigger.create({
        trigger: insightSectionRef.current,
        start: "top 55%",
        once: true,
        onEnter: () => {
          gsap.delayedCall(1.6, () => {
            gsap.to(mockupRef.current, {
              y: -14,
              duration: 4,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
            });
          });
        },
      });
    }
  }, []);

  // ── Steps — ghost numbers + reveals ───────────────────────────────
  useEffect(() => {
    const stepItems = document.querySelectorAll(`.${styles.stepItem}`);

    stepItems.forEach((item, i) => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: item,
          start: "top 78%",
          once: true,
        },
      });

      // Step slides in from left with fade
      tl.fromTo(
        item,
        { opacity: 0, x: -60 },
        { opacity: 1, x: 0, duration: 1.0, ease: "power3.out" },
      );
    });

    // Ghost numbers — scroll parallax upward
    const stepGhosts = document.querySelectorAll(`.${styles.stepNumberGhost}`);
    stepGhosts.forEach((ghost) => {
      gsap.fromTo(
        ghost,
        { y: 40 },
        {
          y: -80,
          ease: "none",
          scrollTrigger: {
            trigger: ghost.parentElement,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        },
      );
    });

    // Eyebrow for steps section
    const stepsEyebrow = stepsSectionRef.current?.querySelector(
      `.${styles.sectionEyebrow}`,
    );
    if (stepsEyebrow) {
      gsap.fromTo(
        stepsEyebrow,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: stepsSectionRef.current,
            start: "top 75%",
            once: true,
          },
        },
      );
    }
  }, []);

  // ── SVG connecting line + traveling orb ───────────────────────────
  useEffect(() => {
    const svg = svgLineRef.current;
    if (!svg) return;
    const path = svg.querySelector("path");
    const orb = svgOrbRef.current;
    if (!path) return;

    const pathLength = path.getTotalLength();
    path.style.strokeDasharray = pathLength;
    path.style.strokeDashoffset = pathLength;

    const handleScroll = () => {
      const steps = stepsSectionRef.current;
      if (!steps) return;
      const rect = steps.getBoundingClientRect();
      const viewportH = window.innerHeight;
      // Calculate progress based on viewport intersection
      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      const clampedProgress = Math.max(0, Math.min(1, progress));
      path.style.strokeDashoffset = pathLength * (1 - clampedProgress);

      // Move orb along the path
      if (orb && clampedProgress > 0.01) {
        const point = path.getPointAtLength(clampedProgress * pathLength);
        orb.setAttribute("cx", point.x);
        orb.setAttribute("cy", point.y);
        orb.style.opacity = clampedProgress > 0.05 ? 1 : 0;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Quiet section — blur-to-sharp word reveal ─────────────────────
  useEffect(() => {
    const quoteEl = quietQuoteRef.current;
    if (!quoteEl) return;

    const wordSpans = splitIntoWords(quoteEl, { blur: true });

    gsap.to(wordSpans, {
      opacity: 1,
      filter: "blur(0px)",
      duration: 0.8,
      stagger: 0.14,
      ease: "power2.out",
      scrollTrigger: {
        trigger: quietSectionRef.current,
        start: "top 55%",
        once: true,
      },
    });
  }, []);

  // ── Closing — deliberate two-beat text pause ─────────────────────
  useEffect(() => {
    const line1 = document.querySelector(`.${styles.quoteLine1}`);
    const line2 = document.querySelector(`.${styles.quoteLine2}`);
    if (!line1 || !line2) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: closingSectionRef.current,
        start: "top 55%",
        once: true,
      },
    });

    // Line 1 fades in with upward drift
    tl.fromTo(
      line1,
      { opacity: 0, y: 30, filter: "blur(2px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power2.out",
      },
    );

    // Brief pause between lines
    tl.to({}, { duration: 0.6 });

    // Line 2 — the resolution
    tl.fromTo(
      line2,
      { opacity: 0, y: 25, filter: "blur(2px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.7,
        ease: "power2.out",
      },
    );

    // CTA container slides up after the quote lands
    if (closingCtasRef.current) {
      tl.fromTo(
        closingCtasRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "-=0.2",
      );
    }
  }, []);

  // ── Social proof strip — staggered stat fade-in ──────────────────
  useEffect(() => {
    const statItems = document.querySelectorAll(`.${styles.socialStatItem}`);
    if (!statItems.length) return;
    gsap.fromTo(
      statItems,
      { opacity: 0, y: 30 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: "power2.out",
        scrollTrigger: {
          trigger: socialProofSectionRef.current,
          start: "top 75%",
          once: true,
        },
      },
    );
    const headline = socialProofSectionRef.current?.querySelector(
      `.${styles.socialProofHeadline}`,
    );
    if (headline) {
      gsap.fromTo(
        headline,
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: {
            trigger: socialProofSectionRef.current,
            start: "top 80%",
            once: true,
          },
        },
      );
    }
  }, []);

  // ── Comparison rows — clip-path wipe ────────────────────────────
  useEffect(() => {
    const rows = document.querySelectorAll(`.${styles.comparisonRow}`);
    if (!rows.length) return;
    rows.forEach((row, i) => {
      gsap.fromTo(
        row,
        { clipPath: "inset(100% 0 0 0)", opacity: 1 },
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.7,
          delay: i * 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: comparisonSectionRef.current,
            start: "top 70%",
            once: true,
          },
        },
      );
    });
    const compHeading = comparisonSectionRef.current?.querySelector(
      `.${styles.comparisonHeading}`,
    );
    if (compHeading) {
      gsap.fromTo(
        compHeading,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power2.out",
          scrollTrigger: {
            trigger: comparisonSectionRef.current,
            start: "top 78%",
            once: true,
          },
        },
      );
    }
  }, []);

  // ── CTA breathing pulse (hero + closing synced) ─────────────────
  useEffect(() => {
    const allPrimary = document.querySelectorAll(
      `.${styles.ctaPrimary}, .${styles.glassBtn}`,
    );
    allPrimary.forEach((btn) => {
      gsap.to(btn, {
        scale: 1.025,
        duration: 3.5,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    });
  }, []);

  // ── Moon orb color temperature shift (warm gold → cool silver) ───
  useEffect(() => {
    const moonOrbs = document.querySelectorAll(`.${styles.moonOrb}`);
    moonOrbs.forEach((orb) => {
      gsap.to(orb, {
        backgroundColor: "rgba(180, 200, 255, 0.35)",
        boxShadow: "0 0 40px 15px rgba(180, 200, 255, 0.12)",
        scrollTrigger: {
          trigger: orb,
          start: "top 80%",
          end: "bottom 20%",
          scrub: 2,
        },
      });
    });
  }, []);

  const handleBegin = () => navigate("/signup");
  const handleWelcomeBack = () => navigate("/login");

  return (
    <div className={styles.landing} id="landing-scroll-container">
      <ScrollIndicator scrollContainerId="landing-scroll-container" />
      <div ref={torchRef} className={styles.torch} />
      <div ref={filmGrainRef} className={styles.filmGrain} />

      {/* Persistent firefly layer across dark sections */}
      <div className={styles.fireflyLayer}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className={styles.fireflyGlobal}
            style={{
              left: `${8 + Math.random() * 84}%`,
              top: `${15 + Math.random() * 70}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${8 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <img
        ref={treeOverlayRef}
        className={styles.treeOverlay}
        src="/images/tree.png"
        alt=""
      />
      <img className={styles.rootsOverlay} src="/images/roots.png" alt="" />

      {/* ─── Hero ─────────────────────────────────────────────── */}
      <section ref={heroRef} className={styles.hero}>
        <video
          ref={videoBgRef}
          className={styles.heroBg}
          autoPlay
          loop
          muted
          playsInline
          poster="/images/hero-poster.jpg"
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
          <div ref={scrollLineRef} className={styles.scrollLine} />
        </div>
      </section>

      {/* ─── Fog transition: Hero → Pillars ──────────────────── */}
      <div className={styles.transitionHeroToPillars}>
        <img
          className={styles.fogTransitionImg}
          src="/images/fog-transition-top.jpg"
          alt=""
        />
      </div>

      {/* ─── Pillars ─────────────────────────────────────────── */}
      <section ref={pillarsSectionRef} className={styles.pillarsSection}>
        <div className={styles.textureOverlay} />
        <img className={styles.treeBackground} src="/images/tree.png" alt="" />

        {/* Decorative moon orb — shifts from warm to cool */}
        <div className={styles.moonOrb} />

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

      {/* Fog transition: Pillars → Insight */}
      <div className={styles.transitionPillarsToInsight}>
        <img
          className={styles.fogTransitionImg}
          src="/images/fog-transition-bottom.jpg"
          alt=""
        />
      </div>

      {/* ─── Social Proof Strip ───────────────────────────────── */}
      <section ref={socialProofSectionRef} className={styles.socialProofSection}>
        <p className={styles.socialProofHeadline}>
          Built for the 1 in 4 people who carry things quietly.
        </p>
        <div className={styles.socialStats}>
          <div className={styles.socialStatItem}>
            <span className={styles.socialStatNumber}>1 in 4</span>
            <span className={styles.socialStatLabel}>
              adults experience a mental health condition each year
            </span>
            <span className={styles.socialStatSource}>WHO, 2022</span>
          </div>
          <div className={styles.socialStatDivider} />
          <div className={styles.socialStatItem}>
            <span className={styles.socialStatNumber}>75%</span>
            <span className={styles.socialStatLabel}>
              with mental health challenges never speak to anyone about it
            </span>
          </div>
          <div className={styles.socialStatDivider} />
          <div className={styles.socialStatItem}>
            <span className={styles.socialStatNumber}>60%</span>
            <span className={styles.socialStatLabel}>
              have never accessed any form of professional support
            </span>
          </div>
        </div>
      </section>

      {/* ─── Comparison Strip ────────────────────────────────── */}
      <section ref={comparisonSectionRef} className={styles.comparisonSection}>
        <p className={styles.sectionEyebrow}>why Serenity</p>
        <h2 className={styles.comparisonHeading}>
          Serenity vs. a text thread with a friend.
        </h2>
        <div className={styles.comparisonCard}>
          <div className={styles.comparisonHeader}>
            <div className={styles.comparisonFeatureCol}>Feature</div>
            <div className={styles.comparisonBrandCol}>Serenity</div>
            <div className={styles.comparisonOtherCol}>Friend text</div>
          </div>
          {[
            { feature: "Available at 3am", serenity: true, other: false },
            { feature: "No judgment, no unsolicited advice", serenity: true, other: false },
            { feature: "Tracks emotional patterns over time", serenity: true, other: false },
            { feature: "Remembers what you've shared", serenity: true, other: false },
            { feature: "Completely private", serenity: true, other: false },
            { feature: "Never gets tired of listening", serenity: true, other: false },
          ].map(({ feature, serenity, other }) => (
            <div key={feature} className={styles.comparisonRow}>
              <div className={styles.comparisonFeatureCol}>{feature}</div>
              <div className={styles.comparisonBrandCol}>
                <span className={styles.checkYes}>✓</span>
              </div>
              <div className={styles.comparisonOtherCol}>
                <span className={other ? styles.checkYes : styles.checkNo}>
                  {other ? "✓" : "✗"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Insight section */}
      <section ref={insightSectionRef} className={styles.insightSection}>
        <div className={styles.textureOverlay} />

        {/* Decorative moon orb */}
        <div className={styles.moonOrb} style={{ right: "8%", top: "15%" }} />

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

      {/* Fog transition: Insight → Steps */}
      <div className={styles.transitionInsightToSteps}>
        <img
          className={styles.fogTransitionImg}
          src="/images/fog-transition-top.jpg"
          alt=""
        />
      </div>

      {/* Steps section */}
      <section ref={stepsSectionRef} className={styles.stepsSection}>
        <div className={styles.textureOverlay} />
        <img className={styles.stepsTree} src="/images/tree.png" alt="" />
        <svg
          ref={svgLineRef}
          className={styles.connectingLine}
          viewBox="0 0 2 400"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M 1 0 L 1 400"
            stroke="rgba(180,200,255,0.4)"
            strokeWidth="1.5"
            fill="none"
            filter="url(#lineGlow)"
          />
          <circle
            ref={svgOrbRef}
            cx="1"
            cy="0"
            r="5"
            fill="rgba(180,200,255,0.8)"
            filter="url(#lineGlow)"
            style={{ opacity: 0, transition: "opacity 0.3s" }}
          />
        </svg>
        <div className={styles.stepsContent}>
          <p className={styles.sectionEyebrow}>the process</p>
          <div className={styles.stepsContainer}>
            {[
              {
                num: "01",
                title: "Open Serenity",
                text: "No prompts. No forms. Just an open space where you say whatever needs saying.",
              },
              {
                num: "02",
                title: "It listens differently",
                text: "Emotion is detected quietly. Patterns are tracked without asking. Nothing is forced.",
              },
              {
                num: "03",
                title: "You begin to understand",
                text: "Over days and weeks, your emotional landscape becomes visible. Clarity arrives on its own terms.",
              },
            ].map((step) => (
              <div key={step.num} className={styles.stepItem}>
                <div className={styles.stepNumberGhost}>{step.num}</div>
                <span className={styles.stepNumber}>{step.num}</span>
                <div className={styles.stepInfo}>
                  <h4 className={styles.stepTitle}>{step.title}</h4>
                  <p className={styles.stepText}>{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fog transition: Steps → Quiet */}
      <div className={styles.transitionStepsToQuiet}>
        <img
          className={styles.fogTransitionImg}
          src="/images/fog-transition-bottom.jpg"
          alt=""
        />
      </div>

      {/* Quiet section */}
      <section ref={quietSectionRef} className={styles.quietSection}>
        <img
          ref={quietBgRef}
          className={styles.quietBg}
          src="/images/bluesakura.png"
          alt=""
        />
        <div className={styles.quietOverlay} />

        <div className={styles.fireflyContainer}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={styles.firefly}
              style={{
                left: `${12 + Math.random() * 76}%`,
                top: `${8 + Math.random() * 55}%`,
                animationDelay: `${Math.random() * 6}s`,
                animationDuration: `${4 + Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        <div className={styles.waterRipple} />

        <p ref={quietQuoteRef} className={styles.quietQuote}>
          Some things are easier to say in the dark.
        </p>
      </section>

      {/* Fog transition: Quiet → Closing */}
      <div className={styles.transitionQuietToClosing}>
        <img
          className={styles.fogTransitionImg}
          src="/images/fog-transition-top.jpg"
          alt=""
        />
      </div>

      {/* Closing section */}
      <section ref={closingSectionRef} className={styles.closingSection}>
        <video
          className={styles.closingBg}
          autoPlay
          loop
          muted
          playsInline
          poster="/images/closing-poster.jpg"
          src="/videos/closing.mp4"
        />
        <div className={styles.closingOverlay} />
        <div className={styles.moonbeamShimmer} />
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
