import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { ScrollIndicator } from "../components/ScrollIndicator";
import styles from "./Landing.module.css";

gsap.registerPlugin(ScrollTrigger);

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
    if (i < words.length - 1) {
      el.appendChild(document.createTextNode("\u00A0"));
    }
  });

  return spans;
}

const PILLARS = [
  {
    num: "01",
    title: "Talk",
    text: "Say what you can't say anywhere else. No judgment. No agenda. Just a space that listens, without keeping score.",
    pills: ["Emotion-aware", "Private", "3am ready"],
    supporting: "No script. No agenda. Just space.",
    visual: "waveform",
  },
  {
    num: "02",
    title: "Reflect",
    text: "Your journal captures what matters, quietly and without asking. Words become clarity over time — even the ones you couldn't finish.",
    pills: ["Auto-journal", "Pattern capture", "No prompts"],
    supporting: "Words become mirrors over time.",
    visual: "lines",
  },
  {
    num: "03",
    title: "Understand",
    text: "Your emotional patterns surface slowly. Not as data — as understanding. Your landscape, finally readable on your own terms.",
    pills: ["30-day arc", "Emotion map", "Quiet insights"],
    supporting: "Not data. Recognition.",
    visual: "constellation",
  },
];

const TESTIMONIALS = [
  "I've never been able to say this out loud to anyone.",
  "It didn't tell me what to feel. It just stayed.",
  "Three weeks in, I noticed I was sleeping better. I don't know when that changed.",
  "I thought I was fine. The journal showed me I was lying to myself.",
];

export function Landing() {
  const navigate = useNavigate();
  const [activePillar, setActivePillar] = useState(0);

  const heroRef = useRef(null);
  const videoBgRef = useRef(null);
  const treeOverlayRef = useRef(null);
  const fogLayerRef = useRef(null);
  const heroContentRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const heroCtasRef = useRef(null);
  const breathOrbRef = useRef(null);
  const pillarsSectionRef = useRef(null);
  const pillarsTrackRef = useRef(null);
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
  const testimonialsSectionRef = useRef(null);
  const stat1Ref = useRef(null);
  const stat2Ref = useRef(null);
  const stat3Ref = useRef(null);
  const branchOverlayRef = useRef(null);

  // Smooth scroll
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

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return () => lenis.destroy();
  }, []);

  // Torch cursor
  useEffect(() => {
    const torch = torchRef.current;
    if (!torch) return;
    let mouseX = 0, mouseY = 0;
    let currentX = 0, currentY = 0;

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    function animateTorch() {
      currentX += (mouseX - currentX) * 0.07;
      currentY += (mouseY - currentY) * 0.07;
      torch.style.left = `${currentX}px`;
      torch.style.top = `${currentY}px`;
      requestAnimationFrame(animateTorch);
    }

    window.addEventListener("mousemove", handleMouseMove);
    requestAnimationFrame(animateTorch);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Film grain opacity
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
        const currentX = 90 + scrollProgress * (5 - 90);
        const treeScale = 1.1 + scrollProgress * 0.9;
        // Fade in during hero, then fade out
        let treeOpacity;
        if (scrollY <= heroHeight) {
          treeOpacity = Math.min(scrollProgress * 1.4, 0.85);
        } else {
          const fadeOut = (scrollY - heroHeight) / (heroHeight * 0.4);
          treeOpacity = Math.max(0, 0.85 * (1 - fadeOut));
        }
        treeOverlayRef.current.style.left = `${currentX}vw`;
        treeOverlayRef.current.style.transform = `translateY(-50%) scale(${treeScale}) scaleX(-1)`;
        treeOverlayRef.current.style.opacity = treeOpacity;
      }

      if (fogLayerRef.current) {
        fogLayerRef.current.style.opacity = Math.min(scrollProgress * 1.2, 0.4);
      }

      if (heroContentRef.current) {
        heroContentRef.current.style.opacity = Math.max(0, 1 - scrollProgress * 1.3);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Quiet section background
  useEffect(() => {
    const quietBg = quietBgRef.current;
    const quietSection = quietSectionRef.current;
    if (!quietBg || !quietSection) return;

    const handleScroll = () => {
      const rect = quietSection.getBoundingClientRect();
      const viewportH = window.innerHeight;
      if (rect.bottom < 0 || rect.top > viewportH) return;
      const progress = (viewportH - rect.top) / (viewportH + rect.height);
      quietBg.style.transform = `translateY(${(progress - 0.5) * rect.height * 0.18}px) scale(${1 + progress * 0.04})`;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero title reveal, breathing orb, and scroll line
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

      const tl = gsap.timeline({ delay: 0.5 });
      tl.to(titleEl.querySelectorAll("span"), {
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
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.2, ease: "power2.out" },
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

    if (scrollLineRef.current) {
      gsap.fromTo(
        scrollLineRef.current,
        { scaleY: 0, opacity: 0.7, transformOrigin: "top center" },
        { scaleY: 1, opacity: 0, duration: 2.2, ease: "power1.inOut", repeat: -1, repeatDelay: 0.6 },
      );
    }

    if (breathOrbRef.current) {
      gsap.to(breathOrbRef.current, {
        scale: 1.31,
        duration: 12,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });
    }
  }, []);

  // Horizontal scroll pillars
  useEffect(() => {
    const section = pillarsSectionRef.current;
    const track = pillarsTrackRef.current;
    if (!section || !track) return;

    const mm = gsap.matchMedia();

    mm.add("(min-width: 769px)", () => {
      const panels = gsap.utils.toArray(`.${styles.pillarPanel}`, track);
      const snapPoints = panels.map((_, i) => i / (panels.length - 1));

      const mainTween = gsap.to(track, {
        x: () => -(track.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1.5,
          snap: {
            snapTo: snapPoints,
            duration: { min: 0.6, max: 1.2 },
            delay: 0.7,
            ease: "power2.inOut",
          },
          end: () => "+=" + (track.scrollWidth - window.innerWidth),
          onUpdate: (self) => {
            setActivePillar(Math.round(self.progress * (panels.length - 1)));
          },
        },
      });

      // Content reveal
      // Panel 0 text visibility
      // Panels 1-2 animation
      panels.forEach((panel, idx) => {
        const number = panel.querySelector(`.${styles.pillarNumber}`);
        const divider = panel.querySelector(`.${styles.pillarDivider}`);
        const title = panel.querySelector(`.${styles.pillarTitle}`);
        const body = panel.querySelector(`.${styles.pillarText}`);
        const pills = panel.querySelectorAll(`.${styles.pillarPill}`);
        const supporting = panel.querySelector(`.${styles.pillarSupportingLine}`);
        const visual = panel.querySelector(`.${styles.pillarVisual}`);

        const stConfig = idx === 0
          ? { trigger: section, start: "top 65%", once: true }
          : { trigger: panel, containerAnimation: mainTween, start: "left 85%", toggleActions: "play none none reverse" };

        const tl = gsap.timeline({ scrollTrigger: stConfig });

        // Panel 0 depth
        if (idx === 0) {
          const inner = panel.querySelector(`.${styles.pillarPanelInner}`);
          if (inner) {
            tl.fromTo(inner,
              { transformPerspective: 900, z: -50, scale: 0.97 },
              { z: 0, scale: 1, duration: 1.2, ease: "power3.out" },
              0
            );
          }
        }

        if (number) tl.fromTo(number, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, idx === 0 ? 0.1 : ">");
        if (divider) tl.fromTo(divider, { scaleY: 0, transformOrigin: "top" }, { scaleY: 1, duration: 0.7, ease: "power2.out" }, "-=0.2");
        if (title) tl.fromTo(title, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.3");
        if (body) tl.fromTo(body, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" }, "-=0.4");
        if (pills.length) tl.fromTo(pills, { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.08, duration: 0.5, ease: "power2.out" }, "-=0.3");
        if (supporting) tl.fromTo(supporting, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power2.out" }, "-=0.2");
        if (visual) tl.fromTo(visual, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 1.0, ease: "power2.out" }, "-=0.6");
      });

      // Horizontal parallax
      track.querySelectorAll(`.${styles.pillarGhostBg}`).forEach((ghost) => {
        gsap.fromTo(
          ghost,
          { x: -50 },
          {
            x: 50,
            ease: "none",
            scrollTrigger: {
              trigger: ghost.closest(`.${styles.pillarPanel}`),
              containerAnimation: mainTween,
              start: "left right",
              end: "right left",
              scrub: true,
            },
          },
        );
      });

      return () => mainTween.scrollTrigger?.kill();
    });

    // Mobile layout
    mm.add("(max-width: 768px)", () => {
      const panels = track.querySelectorAll(`.${styles.pillarPanel}`);
      panels.forEach((panel) => {
        const number = panel.querySelector(`.${styles.pillarNumber}`);
        const divider = panel.querySelector(`.${styles.pillarDivider}`);
        const title = panel.querySelector(`.${styles.pillarTitle}`);
        const body = panel.querySelector(`.${styles.pillarText}`);
        const pills = panel.querySelectorAll(`.${styles.pillarPill}`);
        const supporting = panel.querySelector(`.${styles.pillarSupportingLine}`);

        const tl = gsap.timeline({
          scrollTrigger: { trigger: panel, start: "top 85%", once: true },
        });

        // Card unfold
        tl.fromTo(panel,
          { clipPath: "inset(0 0 100% 0)", opacity: 0 },
          { clipPath: "inset(0 0 0% 0)", opacity: 1, duration: 0.7, ease: "power3.out" }
        );

        // Content reveal
        if (number) tl.fromTo(number, { opacity: 0, x: -10 }, { opacity: 1, x: 0, duration: 0.4, ease: "power2.out" }, "-=0.2");
        if (divider) tl.fromTo(divider, { scaleY: 0, transformOrigin: "top" }, { scaleY: 1, duration: 0.4, ease: "power2.out" }, "-=0.2");
        if (title) tl.fromTo(title, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.15");
        if (body) tl.fromTo(body, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, "-=0.25");
        if (pills.length) tl.fromTo(pills, { opacity: 0, y: 6 }, { opacity: 1, y: 0, stagger: 0.06, duration: 0.35, ease: "power2.out" }, "-=0.2");
        if (supporting) tl.fromTo(supporting, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, "-=0.15");
      });
    });

    return () => mm.revert();
  }, []);

  // Insight text and mockup reveal
  useEffect(() => {
    if (insightTextRef.current) {
      const heading = insightTextRef.current.querySelector(`.${styles.insightHeading}`);
      const subtext = insightTextRef.current.querySelector(`.${styles.insightSubtext}`);
      const body = insightTextRef.current.querySelector(`.${styles.insightBody}`);
      const eyebrow = insightTextRef.current.querySelector(`.${styles.sectionEyebrow}`);

      const tl = gsap.timeline({
        scrollTrigger: { trigger: insightSectionRef.current, start: "top 55%", once: true },
      });

      tl.set(insightTextRef.current, { opacity: 1 });
      tl.fromTo(eyebrow, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" });
      tl.fromTo(heading, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }, "-=0.3");
      tl.to({}, { duration: 0.7 });
      tl.fromTo(subtext, { clipPath: "inset(0 100% 0 0)", opacity: 1 }, { clipPath: "inset(0 0% 0 0)", duration: 0.9, ease: "power2.out" });
      if (body) tl.fromTo(body, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, "-=0.3");
    }

    if (mockupRef.current) {
      gsap.set(mockupRef.current, { opacity: 0, rotateY: 12, rotateX: 4, scale: 0.92, transformPerspective: 1200 });
      gsap.to(mockupRef.current, {
        opacity: 1, rotateY: 0, rotateX: 0, scale: 1, duration: 1.6, ease: "power3.out",
        scrollTrigger: { trigger: insightSectionRef.current, start: "top 55%", once: true },
      });
      ScrollTrigger.create({
        trigger: insightSectionRef.current,
        start: "top 55%",
        once: true,
        onEnter: () => {
          gsap.delayedCall(1.6, () => {
            gsap.to(mockupRef.current, { y: -14, duration: 4, ease: "sine.inOut", repeat: -1, yoyo: true });
          });
        },
      });
    }
  }, []);

  // Steps numbers
  useEffect(() => {
    document.querySelectorAll(`.${styles.stepItem}`).forEach((item) => {
      gsap.timeline({
        scrollTrigger: { trigger: item, start: "top 68%", once: true },
      }).fromTo(item, { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 1.0, ease: "power3.out" });
    });

    document.querySelectorAll(`.${styles.stepNumberGhost}`).forEach((ghost) => {
      gsap.fromTo(ghost, { y: 40 }, {
        y: -80, ease: "none",
        scrollTrigger: { trigger: ghost.parentElement, start: "top bottom", end: "bottom top", scrub: 1.2 },
      });
    });

    const stepsEyebrow = stepsSectionRef.current?.querySelector(`.${styles.sectionEyebrow}`);
    if (stepsEyebrow) {
      gsap.fromTo(stepsEyebrow, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: stepsSectionRef.current, start: "top 68%", once: true },
      });
    }
  }, []);

  // SVG connecting line
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
      const clampedProgress = Math.max(0, Math.min(1, (viewportH - rect.top) / (viewportH + rect.height)));
      path.style.strokeDashoffset = pathLength * (1 - clampedProgress);
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

  // Quiet section text blur
  useEffect(() => {
    const quoteEl = quietQuoteRef.current;
    if (!quoteEl) return;
    const wordSpans = splitIntoWords(quoteEl, { blur: true });
    gsap.to(wordSpans, {
      opacity: 1, filter: "blur(0px)", duration: 0.8, stagger: 0.14, ease: "power2.out",
      scrollTrigger: { trigger: quietSectionRef.current, start: "top 55%", once: true },
    });
  }, []);

  // Closing quote and CTA
  useEffect(() => {
    const line1 = document.querySelector(`.${styles.quoteLine1}`);
    const line2 = document.querySelector(`.${styles.quoteLine2}`);
    if (!line1 || !line2) return;

    const tl = gsap.timeline({
      scrollTrigger: { trigger: closingSectionRef.current, start: "top 55%", once: true },
    });

    tl.fromTo(line1, { opacity: 0, y: 30, filter: "blur(2px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out" });
    tl.to({}, { duration: 0.6 });
    tl.fromTo(line2, { opacity: 0, y: 25, filter: "blur(2px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "power2.out" });

    if (closingCtasRef.current) {
      tl.fromTo(
        closingCtasRef.current,
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" },
        "+=1.2",
      );
    }
  }, []);

  // Social proof headline and counters
  useEffect(() => {
    const trigger = socialProofSectionRef.current;
    if (!trigger) return;

    const headline = trigger.querySelector(`.${styles.socialProofHeadline}`);
    if (headline) {
      const wordSpans = splitIntoWords(headline);
      gsap.to(wordSpans, {
        opacity: 1, y: 0, duration: 0.6, stagger: 0.09, ease: "power2.out",
        scrollTrigger: { trigger, start: "top 70%", once: true },
      });
    }

    gsap.fromTo(
      trigger.querySelectorAll(`.${styles.socialStatItem}`),
      { opacity: 0, y: 32 },
      { opacity: 1, y: 0, duration: 0.85, stagger: 0.18, ease: "power3.out", scrollTrigger: { trigger, start: "top 65%", once: true } },
    );

    if (stat1Ref.current) {
      gsap.fromTo(stat1Ref.current, { clipPath: "inset(0 100% 0 0)", opacity: 1 }, {
        clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "power2.out",
        scrollTrigger: { trigger, start: "top 65%", once: true },
      });
    }

    [{ ref: stat2Ref, val: 75 }, { ref: stat3Ref, val: 60 }].forEach(({ ref, val }) => {
      if (!ref.current) return;
      const obj = { v: 0 };
      gsap.to(obj, {
        v: val, duration: val === 75 ? 1.8 : 1.6, ease: "power2.out",
        scrollTrigger: { trigger, start: "top 65%", once: true },
        onUpdate() { if (ref.current) ref.current.textContent = `${Math.round(obj.v)}%`; },
      });
    });
  }, []);

  // Testimonials text blur
  useEffect(() => {
    const trigger = testimonialsSectionRef.current;
    if (!trigger) return;

    const eyebrow = trigger.querySelector(`.${styles.sectionEyebrow}`);
    if (eyebrow) {
      gsap.fromTo(eyebrow, { opacity: 0, y: 20 }, {
        opacity: 1, y: 0, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger, start: "top 70%", once: true },
      });
    }

    trigger.querySelectorAll(`.${styles.testimonialQuote}`).forEach((el) => {
      const spans = splitIntoWords(el, { blur: true });
      gsap.to(spans, {
        opacity: 1, filter: "blur(0px)", duration: 0.7, stagger: 0.1, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 70%", once: true },
      });
    });

    trigger.querySelectorAll(`.${styles.testimonialRule}`).forEach((rule) => {
      gsap.fromTo(rule, { scaleX: 0 }, {
        scaleX: 1, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: rule, start: "top 85%", once: true },
      });
    });
  }, []);

  // Branch overlay
  useEffect(() => {
    const branch = branchOverlayRef.current;
    const pillarsSection = pillarsSectionRef.current;
    const socialProof = socialProofSectionRef.current;
    if (!branch) return;

    gsap.set(branch, {
      opacity: 0,
      scale: 0.4,
      rotate: 15,
      transformOrigin: "top right",
    });

    // Initialization delay
    const sproutTl = gsap.timeline({ delay: 3 });
    sproutTl.to(branch, {
      opacity: 1,
      scale: 1,
      rotate: 0,
      duration: 1.8,
      ease: "power3.out",
    });

    // Animation
    sproutTl.add(() => {
      gsap.to(branch, {
        keyframes: [
          { rotate: -1.2, scale: 1.008, y: 2, duration: 2, ease: "sine.inOut" },
          { rotate: 1.5, scale: 0.995, y: -1, duration: 2, ease: "sine.inOut" },
          { rotate: -0.8, scale: 1.005, y: 1.5, duration: 2, ease: "sine.inOut" },
          { rotate: 0, scale: 1, y: 0, duration: 2, ease: "sine.inOut" },
        ],
        repeat: -1,
      });
    });

    // Fade out
    let fadeOutSt;
    if (pillarsSection) {
      fadeOutSt = ScrollTrigger.create({
        trigger: pillarsSection,
        start: "top 90%",
        end: "top 30%",
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(branch, { opacity: 1 - self.progress });
        },
      });
    }

    // Re-appear on scroll
    let fadeInSt;
    if (socialProof) {
      fadeInSt = ScrollTrigger.create({
        trigger: socialProof,
        start: "top 90%",
        end: "top 40%",
        scrub: 1,
        onUpdate: (self) => {
          gsap.set(branch, { opacity: self.progress });
        },
      });
    }

    return () => {
      sproutTl.kill();
      fadeOutSt?.kill();
      fadeInSt?.kill();
    };
  }, []);

  // CTA animation
  useEffect(() => {
    document.querySelectorAll(`.${styles.ctaPrimary}, .${styles.glassBtn}`).forEach((btn) => {
      gsap.to(btn, { scale: 1.025, duration: 3.5, ease: "sine.inOut", repeat: -1, yoyo: true });
    });
  }, []);

  // Moon orb temperature shift
  useEffect(() => {
    document.querySelectorAll(`.${styles.moonOrb}`).forEach((orb) => {
      gsap.to(orb, {
        backgroundColor: "rgba(180, 200, 255, 0.35)",
        boxShadow: "0 0 40px 15px rgba(180, 200, 255, 0.12)",
        scrollTrigger: { trigger: orb, start: "top 80%", end: "bottom 20%", scrub: 2 },
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

      <img ref={treeOverlayRef} className={styles.treeOverlay} src="/images/tree.png" alt="" />
      <img ref={branchOverlayRef} className={styles.branchOverlay} src="/images/branch.png" alt="" />

      {/* Hero */}
      <section ref={heroRef} className={styles.hero}>
        <video
          ref={videoBgRef}
          className={styles.heroBg}
          autoPlay loop muted playsInline
          poster="/images/hero-poster.jpg"
          src="/videos/hero-water-background.mp4"
        />
        <img ref={fogLayerRef} className={styles.fogLayer} src="/images/fog.png" alt="" />
        <div className={styles.heroMask} />
        <div ref={breathOrbRef} className={styles.breathOrb} />
        <div ref={heroContentRef} className={styles.heroContent}>
          <h1 ref={heroTitleRef} className={styles.heroTitle}>Serenity</h1>
          <p ref={heroSubtitleRef} className={styles.heroSubtitle}>a quieter place for your mind</p>
          <div ref={heroCtasRef} className={styles.heroCtas}>
            <button className={styles.ctaPrimary} onClick={handleBegin}>Begin</button>
            <button className={styles.ctaSecondary} onClick={handleWelcomeBack}>Welcome back</button>
          </div>
        </div>
        <div className={styles.scrollIndicator}>
          <div ref={scrollLineRef} className={styles.scrollLine} />
        </div>
      </section>

      {/* Fog transition: Hero → Pillars */}
      <div className={styles.transitionHeroToPillars}>
        <img className={styles.fogTransitionImg} src="/images/fog-transition-top.jpg" alt="" />
      </div>

      {/* Pillars (full-viewport horizontal scroll) */}
      <section ref={pillarsSectionRef} className={styles.pillarsHorizontal}>
        <img className={styles.pillarTreeUnderlay} src="/images/tree.png" alt="" />
        <div ref={pillarsTrackRef} className={styles.pillarsTrack}>
          {PILLARS.map((pillar, idx) => (
            <div key={pillar.num} className={styles.pillarPanel} data-index={idx}>
              <div className={styles.textureOverlay} />
              <div className={styles.pillarGhostBg}>{pillar.num}</div>

              <div className={styles.pillarPanelInner}>
                {/* Left: text content */}
                <div className={styles.pillarPanelLeft}>
                  <span className={styles.pillarNumber}>{pillar.num}</span>
                  <div className={styles.pillarDivider} />
                  <h3 className={styles.pillarTitle}>{pillar.title}</h3>
                  <p className={styles.pillarText}>{pillar.text}</p>
                  <div className={styles.pillarFeaturePills}>
                    {pillar.pills.map((pill) => (
                      <span key={pill} className={styles.pillarPill}>{pill}</span>
                    ))}
                  </div>
                  <p className={styles.pillarSupportingLine}>{pillar.supporting}</p>
                </div>

                {/* Right: visual */}
                <div className={styles.pillarVisual}>
                  {pillar.visual === "waveform" && (
                    <div className={styles.pillarVisualWaveform}>
                      {Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className={styles.waveBar} style={{ animationDelay: `${i * 0.13}s` }} />
                      ))}
                    </div>
                  )}

                  {pillar.visual === "lines" && (
                    <svg className={styles.pillarVisualLines} viewBox="0 0 420 280" fill="none" xmlns="http://www.w3.org/2000/svg">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <line
                          key={i}
                          x1={i % 2 === 0 ? "0" : "40"}
                          y1={24 + i * 28}
                          x2={i % 2 === 0 ? "380" : "420"}
                          y2={24 + i * 28}
                          stroke="rgba(180,200,255,0.22)"
                          strokeWidth="1.5"
                          className={styles.writingLine}
                          style={{ animationDelay: `${i * 0.35}s` }}
                        />
                      ))}
                    </svg>
                  )}

                  {pillar.visual === "constellation" && (
                    <svg className={styles.pillarVisualConstellation} viewBox="0 0 480 360" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <line x1="80" y1="60" x2="220" y2="140" stroke="rgba(180,200,255,0.1)" strokeWidth="1" />
                      <line x1="220" y1="140" x2="360" y2="80" stroke="rgba(180,200,255,0.1)" strokeWidth="1" />
                      <line x1="220" y1="140" x2="300" y2="260" stroke="rgba(180,200,255,0.1)" strokeWidth="1" />
                      <line x1="80" y1="60" x2="140" y2="200" stroke="rgba(180,200,255,0.07)" strokeWidth="1" />
                      <line x1="360" y1="80" x2="420" y2="220" stroke="rgba(180,200,255,0.07)" strokeWidth="1" />
                      <line x1="140" y1="200" x2="300" y2="260" stroke="rgba(180,200,255,0.07)" strokeWidth="1" />
                      {[
                        [80, 60, 4], [220, 140, 5], [360, 80, 3.5],
                        [140, 200, 3], [300, 260, 4], [420, 220, 2.5],
                        [50, 200, 2], [400, 300, 2], [160, 50, 2.5],
                      ].map(([cx, cy, r], i) => (
                        <circle
                          key={i}
                          cx={cx} cy={cy} r={r}
                          fill="rgba(197,168,124,0.55)"
                          className={styles.constellationDot}
                          style={{ animationDelay: `${i * 0.4}s` }}
                        />
                      ))}
                    </svg>
                  )}
                </div>
              </div>

              {/* Scroll hint on first panel only */}
              {idx === 0 && (
                <div className={styles.pillarsScrollHint}>
                  <span>scroll to explore</span>
                  <svg width="24" height="10" viewBox="0 0 24 10" fill="none">
                    <path d="M0 5h22M18 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className={styles.pillarsDots}>
          {PILLARS.map((_, i) => (
            <div
              key={i}
              className={`${styles.pillarDot} ${activePillar === i ? styles.pillarDotActive : ""}`}
            />
          ))}
        </div>
      </section>

      {/* Fog transition: Pillars → Social Proof */}
      <div className={styles.transitionPillarsToInsight}>
        <img className={styles.fogTransitionImg} src="/images/fog-transition-bottom.jpg" alt="" />
      </div>

      {/* Social Proof Strip */}
      <section ref={socialProofSectionRef} className={styles.socialProofSection}>
        <div className={styles.textureOverlay} />
        <p className={styles.socialProofHeadline}>Most of it goes unsaid.</p>
        <div className={styles.socialStats}>
          <div className={styles.socialStatItem}>
            <span ref={stat1Ref} className={styles.socialStatNumber}>1 in 4</span>
            <span className={styles.socialStatLabel}>adults go through a mental health condition every year</span>
            <span className={styles.socialStatSource}>WHO, 2022</span>
          </div>
          <div className={styles.socialStatDivider} />
          <div className={styles.socialStatItem}>
            <span ref={stat2Ref} className={styles.socialStatNumber}>0%</span>
            <span className={styles.socialStatLabel}>never say a word to anyone about what they're going through</span>
          </div>
          <div className={styles.socialStatDivider} />
          <div className={styles.socialStatItem}>
            <span ref={stat3Ref} className={styles.socialStatNumber}>0%</span>
            <span className={styles.socialStatLabel}>have never reached out for any kind of help</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsSectionRef} className={styles.testimonialsSection}>
        <div className={styles.textureOverlay} />
        <p className={styles.sectionEyebrow}>what people carry</p>
        <div className={styles.testimonialsTrack}>
          {TESTIMONIALS.map((quote, i) => (
            <div key={i} className={styles.testimonialBlock}>
              <p className={styles.testimonialQuote}>&#8220;{quote}&#8221;</p>
              {i < TESTIMONIALS.length - 1 && <div className={styles.testimonialRule} />}
            </div>
          ))}
        </div>
      </section>

      {/* Insight */}
      <section ref={insightSectionRef} className={styles.insightSection}>
        <div className={styles.textureOverlay} />
        <div className={styles.moonOrb} style={{ right: "8%", top: "15%" }} />
        <div className={styles.insightAccentLine} />
        <div className={styles.insightFireflies}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={styles.fireflyGlobal}
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${6 + Math.random() * 8}s`,
              }}
            />
          ))}
        </div>
        <div className={styles.insightInner}>
          <div ref={insightTextRef} className={styles.insightText}>
            <p className={styles.sectionEyebrow} style={{ textAlign: "left", marginBottom: "2rem" }}>
              what you'll find
            </p>
            <h2 className={styles.insightHeading}>
              Your emotional patterns are closer to the surface than you think.
            </h2>
            <p className={styles.insightSubtext}>Serenity makes them visible.</p>
            <p className={styles.insightBody}>
              Every conversation, every journal entry — quietly mapped. Not to judge, but to show you what you already carry.
            </p>
          </div>
          <div ref={mockupRef} className={styles.mockupWrapper}>
            <img className={styles.mockupImg} src="/images/mockup.png" alt="Serenity app" />
            <div className={styles.mockupGlow} />
          </div>
        </div>
      </section>

      {/* Fog transition: Insight → Steps */}
      <div className={styles.transitionInsightToSteps}>
        <img className={styles.fogTransitionImg} src="/images/fog-transition-top.jpg" alt="" />
      </div>

      {/* Steps */}
      <section ref={stepsSectionRef} className={styles.stepsSection}>
        <div className={styles.textureOverlay} />
        <img className={styles.stepsTree} src="/images/tree.png" alt="" />
        <svg ref={svgLineRef} className={styles.connectingLine} viewBox="0 0 2 400" preserveAspectRatio="none">
          <defs>
            <filter id="lineGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <path d="M 1 0 L 1 400" stroke="rgba(180,200,255,0.4)" strokeWidth="1.5" fill="none" filter="url(#lineGlow)" />
          <circle ref={svgOrbRef} cx="1" cy="0" r="5" fill="rgba(180,200,255,0.8)" filter="url(#lineGlow)" style={{ opacity: 0, transition: "opacity 0.3s" }} />
        </svg>
        <div className={styles.stepsContent}>
          <p className={styles.sectionEyebrow}>the process</p>
          <div className={styles.stepsContainer}>
            {[
              { num: "01", title: "Open Serenity", text: "No prompts. No forms. Just an open space where you say whatever needs saying." },
              { num: "02", title: "It listens differently", text: "Emotion is detected quietly. Patterns are tracked without asking. Nothing is forced." },
              { num: "03", title: "You begin to understand", text: "Over days and weeks, your emotional landscape becomes visible. Clarity arrives on its own terms." },
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
        <img className={styles.fogTransitionImg} src="/images/fog-transition-bottom.jpg" alt="" />
      </div>

      {/* Quiet / Sakura */}
      <section ref={quietSectionRef} className={styles.quietSection}>
        <img ref={quietBgRef} className={styles.quietBg} src="/images/bluesakura.png" alt="" />
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
        <div className={styles.breathRingInner} />
        <div className={styles.breathRingOuter} />
        <p ref={quietQuoteRef} className={styles.quietQuote}>
          Some things are easier to say in the dark.
        </p>
      </section>

      {/* Fog transition: Quiet → Closing */}
      <div className={styles.transitionQuietToClosing}>
        <img className={styles.fogTransitionImg} src="/images/fog-transition-top.jpg" alt="" />
      </div>

      {/* Closing */}
      <section ref={closingSectionRef} className={styles.closingSection}>
        <video
          className={styles.closingBg}
          autoPlay loop muted playsInline
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
            <button className={styles.glassBtn} onClick={handleBegin}>Create your space</button>
            <button className={styles.glassBtnSecondary} onClick={handleWelcomeBack}>Welcome back</button>
          </div>
          <p className={styles.disclaimer}>Your space to reflect. Not a substitute for professional care.</p>
        </div>
      </section>
    </div>
  );
}

export default Landing;
