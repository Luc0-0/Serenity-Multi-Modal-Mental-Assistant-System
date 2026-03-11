import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import styles from "./Onboarding.module.css";

const REASONS = [
  { id: "anxiety",     label: "Managing anxiety or stress" },
  { id: "overwhelmed", label: "Feeling overwhelmed" },
  { id: "grief",       label: "Processing grief or loss" },
  { id: "loneliness",  label: "Dealing with loneliness" },
  { id: "habits",      label: "Building better habits" },
  { id: "exploring",   label: "Just exploring — no reason needed" },
];

const SUPPORT_STYLES = [
  {
    id: "listen",
    label: "Just listen",
    desc: "I need someone to hear me without jumping to solutions",
  },
  {
    id: "guide",
    label: "Help me think",
    desc: "Walk me through it, ask me questions",
  },
  {
    id: "light",
    label: "Keep it light",
    desc: "Talk to me like a friend, not a therapist",
  },
];

const STEP_VARIANTS = {
  enter:  { opacity: 0, y: 26, scale: 0.984 },
  center: { opacity: 1, y: 0,  scale: 1 },
  exit:   { opacity: 0, y: -16, scale: 1.006 },
};

const STEP_TRANSITION = { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] };

// Character-by-character clip reveal — feels like it's being spoken
function CharReveal({ text, className, startDelay = 0.1 }) {
  return (
    <p className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={{ clipPath: "inset(110% 0 -10% 0)", opacity: 0 }}
          animate={{ clipPath: "inset(0% 0 -10% 0)", opacity: 1 }}
          transition={{
            delay: startDelay + i * 0.022,
            duration: 0.42,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ display: "inline-block" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </p>
  );
}

// Word-by-word reveal for long commitment text
function WordReveal({ text, className }) {
  return (
    <p className={className} aria-label={text}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.075, duration: 0.5, ease: "easeOut" }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

// Text-only button with sweep underline + sliding arrow
function PrimaryBtn({ children, onClick, disabled, appearDelay = 0 }) {
  return (
    <motion.button
      className={styles.primaryBtn}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: appearDelay, duration: 0.5 }}
    >
      <span className={styles.btnLabel}>{children}</span>
      <span className={styles.btnArrow} aria-hidden="true">→</span>
    </motion.button>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [reasons, setReasons] = useState([]);
  const [supportStyle, setSupportStyle] = useState(null);
  const [exiting, setExiting] = useState(false);

  const mousePos = useRef({ x: 0.5, y: 0.5 });
  const currentPos = useRef({ x: 0.5, y: 0.5 });
  const trackOrbRef = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("serenity_onboarded")) {
      navigate("/check-in", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  // Cursor-tracking ambient orb
  useEffect(() => {
    const onMouseMove = (e) => {
      mousePos.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMouseMove);

    let raf;
    const tick = () => {
      currentPos.current.x += (mousePos.current.x - currentPos.current.x) * 0.04;
      currentPos.current.y += (mousePos.current.y - currentPos.current.y) * 0.04;
      if (trackOrbRef.current) {
        trackOrbRef.current.style.left = `${currentPos.current.x * 100}%`;
        trackOrbRef.current.style.top  = `${currentPos.current.y * 100}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const complete = () => {
    localStorage.setItem("serenity_onboarded", "1");
    localStorage.setItem(
      "serenity_onboarding_data",
      JSON.stringify({ name: name.trim(), reasons, supportStyle })
    );
    setExiting(true);
    setTimeout(() => navigate("/check-in", { replace: true }), 900);
  };

  const toggleReason = (id) =>
    setReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  const progressPct = step === 0 ? 0 : (step / 4) * 100;

  return (
    <div className={styles.root}>
      {/* Static ambient orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      {/* Cursor-tracking orb */}
      <div ref={trackOrbRef} className={styles.orbTrack} aria-hidden="true" />

      {/* Top progress bar */}
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: "0%" }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      </div>

      {/* Amber bloom on exit */}
      <AnimatePresence>
        {exiting && (
          <motion.div
            className={styles.bloom}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.7, 0.7, 0] }}
            transition={{ duration: 0.9, times: [0, 0.25, 0.7, 1] }}
          />
        )}
      </AnimatePresence>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            className={styles.step}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_TRANSITION}
          >
            <div className={styles.logoRow}>
              <img src="/images/serenity.png" alt="Serenity" className={styles.logo} />
              <span className={styles.logoText}>SERENITY</span>
            </div>
            <motion.div
              className={styles.rule}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.85, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{ originX: 0 }}
            />
            <p className={styles.tagline}>Your space to breathe.</p>
            <PrimaryBtn onClick={() => setStep(1)} appearDelay={1.8}>
              Begin
            </PrimaryBtn>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            className={styles.step}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_TRANSITION}
          >
            <CharReveal text="What should I call you?" className={styles.question} />
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              maxLength={40}
              onKeyDown={(e) => e.key === "Enter" && name.trim() && setStep(2)}
            />
            <PrimaryBtn onClick={() => setStep(2)} disabled={!name.trim()} appearDelay={0.4}>
              Continue
            </PrimaryBtn>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            className={styles.step}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_TRANSITION}
          >
            <CharReveal text="I'm here because..." className={styles.question} />
            <motion.p
              className={styles.subtext}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.75, duration: 0.5 }}
            >
              Select all that apply
            </motion.p>
            <div className={styles.cardList}>
              {REASONS.map((r, i) => (
                <motion.button
                  key={r.id}
                  className={`${styles.card} ${reasons.includes(r.id) ? styles.selected : ""}`}
                  onClick={() => toggleReason(r.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 + i * 0.07, duration: 0.45 }}
                  whileHover={{ y: -2, transition: { type: "spring", stiffness: 380, damping: 22 } }}
                >
                  {r.label}
                </motion.button>
              ))}
            </div>
            <PrimaryBtn onClick={() => setStep(3)} appearDelay={1.25}>
              {reasons.length > 0 ? "Continue" : "Skip for now"}
            </PrimaryBtn>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            className={styles.step}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_TRANSITION}
          >
            <CharReveal text="When things get heavy, I prefer..." className={styles.question} />
            <div className={styles.cardList}>
              {SUPPORT_STYLES.map((s, i) => (
                <motion.button
                  key={s.id}
                  className={`${styles.card} ${styles.cardTall} ${
                    supportStyle === s.id ? styles.selected : ""
                  }`}
                  onClick={() => setSupportStyle(s.id)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.65 + i * 0.09, duration: 0.45 }}
                  whileHover={{ y: -2, transition: { type: "spring", stiffness: 380, damping: 22 } }}
                >
                  <span className={styles.cardTitle}>{s.label}</span>
                  <span className={styles.cardDesc}>{s.desc}</span>
                </motion.button>
              ))}
            </div>
            <PrimaryBtn onClick={() => setStep(4)} appearDelay={1.1}>
              {supportStyle ? "Continue" : "Skip for now"}
            </PrimaryBtn>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div
            key="step4"
            className={styles.step}
            variants={STEP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={STEP_TRANSITION}
          >
            <WordReveal
              text="This is your space. No judgment. No advice you didn't ask for. Everything you share stays between you and Serenity."
              className={styles.commitment}
            />
            <PrimaryBtn onClick={complete} appearDelay={2.6}>
              I'm ready
            </PrimaryBtn>
          </motion.div>
        )}
      </AnimatePresence>

      {step > 1 && !exiting && (
        <button
          className={styles.backBtn}
          onClick={() => setStep((s) => s - 1)}
          aria-label="Go back"
        >
          ←
        </button>
      )}
    </div>
  );
}
