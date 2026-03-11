import { useState, useEffect } from "react";
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
  enter: { opacity: 0, y: 28 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
};

const STEP_TRANSITION = { duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] };

function WordReveal({ text, className }) {
  const words = text.split(" ");
  return (
    <p className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.07, duration: 0.45, ease: "easeOut" }}
          style={{ display: "inline-block", marginRight: "0.28em" }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [reasons, setReasons] = useState([]);
  const [supportStyle, setSupportStyle] = useState(null);

  useEffect(() => {
    if (localStorage.getItem("serenity_onboarded")) {
      navigate("/check-in", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const complete = () => {
    localStorage.setItem("serenity_onboarded", "1");
    localStorage.setItem(
      "serenity_onboarding_data",
      JSON.stringify({ name: name.trim(), reasons, supportStyle })
    );
    navigate("/check-in", { replace: true });
  };

  const toggleReason = (id) =>
    setReasons((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  const back = () => setStep((s) => s - 1);

  return (
    <div className={styles.root}>
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />

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
              <img
                src="/images/serenity.png"
                alt="Serenity"
                className={styles.logo}
              />
              <span className={styles.logoText}>SERENITY</span>
            </div>
            <p className={styles.tagline}>Your space to breathe.</p>
            <button className={styles.primaryBtn} onClick={() => setStep(1)}>
              Begin
            </button>
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
            <p className={styles.question}>What should I call you?</p>
            <input
              className={styles.nameInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              maxLength={40}
              onKeyDown={(e) =>
                e.key === "Enter" && name.trim() && setStep(2)
              }
            />
            <button
              className={styles.primaryBtn}
              disabled={!name.trim()}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
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
            <p className={styles.question}>I'm here because...</p>
            <p className={styles.subtext}>Select all that apply</p>
            <div className={styles.reasonGrid}>
              {REASONS.map((r, i) => (
                <motion.button
                  key={r.id}
                  className={`${styles.reasonCard} ${
                    reasons.includes(r.id) ? styles.selected : ""
                  }`}
                  onClick={() => toggleReason(r.id)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  {r.label}
                </motion.button>
              ))}
            </div>
            <button className={styles.primaryBtn} onClick={() => setStep(3)}>
              {reasons.length > 0 ? "Continue" : "Skip for now"}
            </button>
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
            <p className={styles.question}>When things get heavy, I prefer...</p>
            <div className={styles.styleGrid}>
              {SUPPORT_STYLES.map((s, i) => (
                <motion.button
                  key={s.id}
                  className={`${styles.styleCard} ${
                    supportStyle === s.id ? styles.selected : ""
                  }`}
                  onClick={() => setSupportStyle(s.id)}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.09, duration: 0.4 }}
                >
                  <span className={styles.styleLabel}>{s.label}</span>
                  <span className={styles.styleDesc}>{s.desc}</span>
                </motion.button>
              ))}
            </div>
            <button className={styles.primaryBtn} onClick={() => setStep(4)}>
              {supportStyle ? "Continue" : "Skip for now"}
            </button>
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
            <motion.button
              className={styles.primaryBtn}
              onClick={complete}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.4, duration: 0.6 }}
            >
              I'm ready
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {step > 0 && (
        <div className={styles.stepDots} aria-hidden="true">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`${styles.dot} ${s <= step ? styles.dotActive : ""}`}
            />
          ))}
        </div>
      )}

      {step > 1 && (
        <button
          className={styles.backBtn}
          onClick={back}
          aria-label="Go back"
        >
          ←
        </button>
      )}
    </div>
  );
}
