/*
 * Copyright (c) 2026 Nipun Sujesh. All rights reserved.
 * Licensed under the AGPLv3. See LICENSE file in the project root for details.
 *
 * GoalBuilder — Sanctum aesthetic
 * Playfair Display × Cormorant Garamond × DM Sans
 * Warm dark #0d0a08 · Amber glass · Fireflies · Quote cycling
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { SvgIcon } from "../../components/icons/SvgIcon";
import { apiClient } from "../../services/apiClient";
import { PhaseUnlockModal } from "../../components/PhaseUnlockModal/PhaseUnlockModal";
import { PulseCheckModal } from "../../components/PulseCheckModal/PulseCheckModal";
import OnboardingFlow, {
  ONBOARDING_DRAFT_KEY,
} from "./components/Onboarding/OnboardingFlow";
import styles from "./GoalBuilder.module.css";

// ── Motivational quotes (Cormorant Garamond italic) ──────────────────────────

const QUOTES = [
  {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  {
    text: "Excellence is not a destination but a continuous journey that never ends.",
    author: "Brian Tracy",
  },
  {
    text: "Small disciplines repeated with consistency every day lead to great achievements.",
    author: "John C. Maxwell",
  },
  {
    text: "Do not wait; the time will never be just right. Start where you stand.",
    author: "Napoleon Hill",
  },
  {
    text: "What you do today can improve all your tomorrows.",
    author: "Ralph Marston",
  },
  {
    text: "The only way to do great work is to love what you do.",
    author: "Steve Jobs",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  {
    text: "It does not matter how slowly you go as long as you do not stop.",
    author: "Confucius",
  },
];

const STEP_NAMES = [
  "Welcome",
  "Your Goal",
  "Personalization",
  "Schedule",
  "Launch",
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TodayTab = React.lazy(() => import("./components/Tabs/TodayTab"));
const PhasesTab = React.lazy(() => import("./components/Tabs/PhasesTab"));
const LogTab = React.lazy(() => import("./components/Tabs/LogTab"));
const RulesTab = React.lazy(() => import("./components/Tabs/RulesTab"));

const TABS = [
  { id: "today", label: "Today", icon: "calendar" },
  { id: "phases", label: "Phases", icon: "target" },
  { id: "log", label: "Progress", icon: "chart" },
  { id: "rules", label: "Rules", icon: "compass" },
];

// ── Fireflies ─────────────────────────────────────────────────────────────────

function Fireflies() {
  return (
    <div className={styles.fireflies} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className={styles.firefly} />
      ))}
    </div>
  );
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="19" r="1.4" fill="currentColor" />
    </svg>
  );
}

function RestartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M1 4v6h6M23 20v-6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <polyline
        points="3,6 5,6 21,6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <line
        x1="12"
        y1="17"
        x2="12.01"
        y2="17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M1 4v6h6M23 20v-6h-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path
        d="M18 15l-6-6-6 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Vitality Dock ─────────────────────────────────────────────────────────────

function VitalityDock({ streak, completedToday, totalSchedule, daysRemaining, progress }) {
  return (
    <div className={styles.vitalityDock}>
      <div className={styles.dockStats}>
        <div className={styles.dockStat}>
          <span className={styles.dockVal}>{streak}</span>
          <span className={styles.dockLbl}>Day Streak</span>
        </div>
        <div className={styles.dockDivider} />
        <div className={styles.dockStat}>
          <span className={styles.dockValIce}>
            {totalSchedule > 0 ? `${completedToday}/${totalSchedule}` : "—"}
          </span>
          <span className={styles.dockLbl}>Today</span>
        </div>
        <div className={styles.dockDivider} />
        <div className={styles.dockStat}>
          <span className={styles.dockVal}>{daysRemaining}</span>
          <span className={styles.dockLbl}>Days Left</span>
        </div>
      </div>
      <div className={styles.dockProgressTrack}>
        <motion.div
          className={styles.dockProgressFill}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(progress, 0.5)}%` }}
          transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function WhisperCard({ quote }) {
  return (
    <div className={styles.whisperWrap}>
      <div className={styles.whisperCard}>
        <span className={styles.whisperQuote}>"{quote.text}"</span>
        <span className={styles.whisperAuthor}>— {quote.author}</span>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function GoalBuilder() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("today");
  const [goalData, setGoalData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDraft, setOnboardingDraft] = useState(null);
  const [onboardingInitial, setOnboardingInitial] = useState({
    step: 0,
    formData: null,
  });

  // Phase unlock
  const [phaseUnlock, setPhaseUnlock] = useState(null);
  const [showPhaseModal, setShowPhaseModal] = useState(false);

  // Pulse check
  const [showPulseCheck, setShowPulseCheck] = useState(false);

  // Options menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  // Quote cycling
  const [quoteIdx, setQuoteIdx] = useState(() =>
    Math.floor(Math.random() * QUOTES.length),
  );

  // Header collapse
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [isTabNavHidden, setIsTabNavHidden] = useState(false);
  const contentRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchGoals();
  }, []);

  useEffect(() => {
    const t = setInterval(
      () => setQuoteIdx((i) => (i + 1) % QUOTES.length),
      8000,
    );
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target))
        setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  useEffect(() => {
    // Always reveal nav when switching tabs for orientation clarity.
    setIsTabNavHidden(false);
  }, [activeTab]);

  const handleContentScroll = useCallback((event) => {
    const currentTop = event.currentTarget.scrollTop;
    const delta = currentTop - lastScrollTopRef.current;

    if (currentTop <= 12) {
      setIsTabNavHidden(false);
      lastScrollTopRef.current = currentTop;
      return;
    }

    if (delta > 6) {
      setIsTabNavHidden(true);
    } else if (delta < -6) {
      setIsTabNavHidden(false);
    }

    lastScrollTopRef.current = currentTop;
  }, []);

  // ── Data ──────────────────────────────────────────────────────────────────

  const fetchGoals = async () => {
    try {
      const goals = await apiClient.get("/api/goals");
      if (goals.length === 0) {
        try {
          const raw = localStorage.getItem(ONBOARDING_DRAFT_KEY);
          if (raw) {
            const draft = JSON.parse(raw);
            if (draft?.step > 0 && draft?.formData?.goal?.title) {
              setOnboardingDraft(draft);
              setIsLoading(false);
              return;
            }
          }
        } catch {}
        setShowOnboarding(true);
      } else {
        const active = goals.find((g) => g.is_active) || goals[0];
        await loadGoal(active.id);
      }
    } catch {
      setShowOnboarding(true);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGoal = useCallback(
    async (id) => {
      try {
        const data = await apiClient.get(`/api/goals/${id}`);
        if (goalData?.phases && data.phases) {
          const prev = new Set(
            goalData.phases.filter((p) => p.is_unlocked).map((p) => p.id),
          );
          const newP = data.phases.find(
            (p) => p.is_unlocked && !prev.has(p.id),
          );
          if (newP) {
            setPhaseUnlock(newP);
            setShowPhaseModal(true);
          }
        }
        setGoalData(data);
        checkPulse(id);
      } catch (err) {
        console.error("loadGoal error", err);
      }
    },
    [goalData],
  );

  const checkPulse = async (id) => {
    try {
      const d = await apiClient.get(`/api/goals/${id}/pulse-check`);
      if (d.is_due) setTimeout(() => setShowPulseCheck(true), 2000);
    } catch {}
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/check-in");
  };

  const handleOnboardingComplete = async (goalId) => {
    setShowOnboarding(false);
    await loadGoal(goalId);
  };

  const handleDelete = async () => {
    if (!goalData?.goal?.id) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/api/goals/${goalData.goal.id}`);
      const mode = deleteModal;
      setGoalData(null);
      setDeleteModal(null);
      setMenuOpen(false);
      if (mode === "restart") {
        try {
          localStorage.removeItem(ONBOARDING_DRAFT_KEY);
        } catch {}
        setOnboardingInitial({ step: 0, formData: null });
        setShowOnboarding(true);
      }
    } catch (err) {
      console.error("delete error", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.bg} />
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgNoise} />
        <Fireflies />
        <motion.div
          className={styles.loadingRing}
          animate={{ scale: [1, 1.1, 1], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className={styles.loadingLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.65, 0] }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4,
          }}
        >
          Loading your journey
        </motion.span>
      </div>
    );
  }

  // ── Draft resume ──────────────────────────────────────────────────────────

  if (onboardingDraft) {
    const stepName =
      STEP_NAMES[onboardingDraft.step] || `Step ${onboardingDraft.step + 1}`;
    const goalTitle = onboardingDraft.formData?.goal?.title;
    return (
      <div className={styles.draftScreen}>
        <div className={styles.bg} />
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgNoise} />
        <Fireflies />
        <motion.div
          className={styles.draftCard}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <div className={styles.draftIcon}>
            <SvgIcon name="target" size={24} color="currentColor" />
          </div>
          <div className={styles.draftTitle}>Pick up where you left off</div>
          <div className={styles.draftBody}>
            You were setting up{goalTitle ? ` "${goalTitle}"` : " a goal"} and
            stopped at <span className={styles.draftStepName}>{stepName}</span>
            {onboardingDraft.savedAt && (
              <span className={styles.draftSavedAt}>
                {" "}
                · {timeAgo(onboardingDraft.savedAt)}
              </span>
            )}
          </div>

          <div className={styles.draftProgress}>
            {STEP_NAMES.map((_, i) => (
              <div
                key={i}
                className={styles.draftProgressSeg}
                style={{
                  background:
                    i < onboardingDraft.step
                      ? "#C8A96E"
                      : i === onboardingDraft.step
                        ? "rgba(200,169,110,0.35)"
                        : "rgba(255,255,255,0.06)",
                }}
              />
            ))}
          </div>

          <div className={styles.draftActions}>
            <motion.button
              className={styles.draftContinueBtn}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setOnboardingInitial({
                  step: onboardingDraft.step,
                  formData: onboardingDraft.formData,
                });
                setOnboardingDraft(null);
                setShowOnboarding(true);
              }}
            >
              Continue from {stepName}
            </motion.button>
            <motion.button
              className={styles.draftFreshBtn}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                try {
                  localStorage.removeItem(ONBOARDING_DRAFT_KEY);
                } catch {}
                setOnboardingDraft(null);
                setOnboardingInitial({ step: 0, formData: null });
                setShowOnboarding(true);
              }}
            >
              Start fresh instead
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Onboarding ─────────────────────────────────────────────────────────────

  if (showOnboarding) {
    return (
      <OnboardingFlow
        initialStep={onboardingInitial.step}
        initialFormData={onboardingInitial.formData}
        onComplete={handleOnboardingComplete}
        onSkip={() => {
          setShowOnboarding(false);
          setIsLoading(false);
        }}
      />
    );
  }

  // ── Empty state ────────────────────────────────────────────────────────────

  if (!goalData) {
    return (
      <div className={styles.emptyScreen}>
        <div className={styles.bg} />
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgNoise} />
        <Fireflies />
        <motion.button
          className={styles.emptyBackBtn}
          onClick={handleBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <ChevronLeft /> Back
        </motion.button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div className={styles.emptyIcon}>
            <SvgIcon name="target" size={26} color="currentColor" />
          </div>
          <div className={styles.emptyTitle}>No active goal</div>
          <div className={styles.emptySubtitle}>
            Define your mission and Serenity builds a personalized roadmap
            around your life.
          </div>
          <motion.button
            className={styles.emptyBtn}
            onClick={() => setShowOnboarding(true)}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Create Your Goal
          </motion.button>
        </motion.div>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const goal = goalData.goal;
  const todayLog = goalData.recent_logs?.[0] || {};
  const completedItems = todayLog.completed_items
    ? typeof todayLog.completed_items === "string"
      ? JSON.parse(todayLog.completed_items)
      : todayLog.completed_items
    : {};
  const completedToday = Object.values(completedItems).filter(Boolean).length;
  const totalSchedule = goalData.schedule?.length || 0;

  const dayNumber =
    Math.floor((new Date() - new Date(goal.start_date)) / 86400000) + 1;
  const daysRemaining = Math.max(goal.duration_days - dayNumber, 0);
  const overallProgress = Math.min((dayNumber / goal.duration_days) * 100, 100);

  const currentQuote = QUOTES[quoteIdx];

  // ── Main view ──────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>
      {/* ── Background layers ─────────────────────────────────────────────── */}
      <div className={styles.bg} aria-hidden />
      <div className={styles.bgOrb1} aria-hidden />
      <div className={styles.bgOrb2} aria-hidden />
      <div className={styles.bgNoise} aria-hidden />
      <Fireflies />

      {/* ── Header Shell ──────────────────────────────────────────────────── */}
      <motion.div
        className={styles.headerShell}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      >
        {/* Top chrome: Back + collapsed title + Options */}
        <div className={styles.topChrome}>
          <motion.button
            className={styles.backBtn}
            onClick={handleBack}
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Go back"
          >
            <ChevronLeft />
            Back
          </motion.button>

          <AnimatePresence>
            {headerCollapsed && (
              <motion.div
                className={styles.miniTitleWrap}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {goal.title}
              </motion.div>
            )}
          </AnimatePresence>

          <div className={styles.optionsWrap} ref={menuRef}>
            <motion.button
              className={styles.optionsBtn}
              onClick={() => setMenuOpen((v) => !v)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Goal options"
              aria-expanded={menuOpen}
            >
              <KebabIcon />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className={styles.dropdown}
                  initial={{ opacity: 0, scale: 0.88, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    className={styles.dropItem}
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModal("restart");
                    }}
                  >
                    <RestartIcon /> Start New Journey
                  </button>
                  <div className={styles.dropDivider} />
                  <button
                    className={`${styles.dropItem} ${styles.dropItemDanger}`}
                    onClick={() => {
                      setMenuOpen(false);
                      setDeleteModal("delete");
                    }}
                  >
                    <TrashIcon /> Delete Goal
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cinematic Header Body */}
        <AnimatePresence initial={false}>
          {!headerCollapsed && (
            <motion.div
              key="hbody"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
            >
              <div className={styles.heroSection}>
                <motion.h1
                  className={styles.heroTitle}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {goal.title}
                </motion.h1>
                <motion.div
                  className={styles.heroMeta}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  <span className={styles.badge}>{goal.theme}</span>
                  <span className={styles.metaDot} />
                  <span className={styles.metaText}>Day {dayNumber} of {goal.duration_days}</span>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <VitalityDock
                    streak={goal.current_streak}
                    completedToday={completedToday}
                    totalSchedule={totalSchedule}
                    daysRemaining={daysRemaining}
                    progress={overallProgress}
                  />
                </motion.div>

                {goal.total_completed_days > 0 && goal.current_streak < goal.total_completed_days && (
                  <div className={styles.streakNotice}>
                    <SvgIcon name="chart" size={12} color="currentColor" />
                    {goal.total_completed_days} total days logged
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse / expand handle */}
        <motion.button
          className={styles.collapseHandle}
          onClick={() => setHeaderCollapsed((v) => !v)}
          whileHover={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          aria-label={headerCollapsed ? "Expand header" : "Collapse header"}
        >
          <motion.span
            style={{ display: "flex", alignItems: "center" }}
            animate={{ rotate: headerCollapsed ? 180 : 0 }}
            transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          >
            <ChevronUpIcon />
          </motion.span>
        </motion.button>
      </motion.div>

      {/* Whisper Quote */}
      <AnimatePresence mode="wait">
        {!headerCollapsed && activeTab === "today" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, overflow: "hidden" }}
            transition={{ duration: 0.4 }}
          >
            <WhisperCard quote={currentQuote} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Navigation ────────────────────────────────────────────────── */}
      <motion.div
        className={`${styles.tabNav} ${isTabNavHidden ? styles.tabNavHidden : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className={styles.tabList}>
          {TABS.map((tab, i) => (
            <motion.button
              key={tab.id}
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.32 + i * 0.05 }}
            >
              <SvgIcon name={tab.icon} size={14} color="currentColor" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.span
                  className={styles.tabIndicator}
                  layoutId="tabLine"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Tab Content ───────────────────────────────────────────────────── */}
      <div
        ref={contentRef}
        className={styles.content}
        onScroll={handleContentScroll}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className={styles.tabPanel}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <React.Suspense
              fallback={
                <div className={styles.tabLoading}>
                  <motion.div
                    className={styles.spinner}
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 0.9,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />
                </div>
              }
            >
              {activeTab === "today" && (
                <TodayTab goalData={goalData} onUpdate={loadGoal} />
              )}
              {activeTab === "phases" && (
                <PhasesTab goalData={goalData} onUpdate={loadGoal} />
              )}
              {activeTab === "log" && <LogTab goalData={goalData} />}
              {activeTab === "rules" && <RulesTab goalData={goalData} />}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <PhaseUnlockModal
        isOpen={showPhaseModal}
        phase={phaseUnlock}
        onClose={() => {
          setShowPhaseModal(false);
          setPhaseUnlock(null);
        }}
      />

      <PulseCheckModal
        isOpen={showPulseCheck}
        goalId={goal?.id}
        onClose={() => setShowPulseCheck(false)}
        onSubmit={() => loadGoal(goal?.id)}
      />

      {/* Delete / Restart confirmation modal */}
      <AnimatePresence>
        {deleteModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) =>
              e.target === e.currentTarget &&
              !isDeleting &&
              setDeleteModal(null)
            }
          >
            <motion.div
              className={styles.modalCard}
              initial={{ opacity: 0, scale: 0.88, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 24 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div
                className={`${styles.modalIcon} ${deleteModal === "delete" ? styles.modalIconRed : styles.modalIconAmber}`}
              >
                {deleteModal === "delete" ? <WarnIcon /> : <RefreshIcon />}
              </div>

              <div className={styles.modalTitle}>
                {deleteModal === "restart"
                  ? "Start a new journey?"
                  : "Delete this goal?"}
              </div>
              <div className={styles.modalBody}>
                {deleteModal === "restart"
                  ? `Your current goal "${goal.title}", all streaks, phases and logs will be permanently removed. A fresh start awaits.`
                  : `"${goal.title}" and all progress will be permanently deleted. This cannot be undone.`}
              </div>

              <div className={styles.modalStatRow}>
                <div className={styles.modalStat}>
                  <div className={styles.modalStatVal}>
                    {goal.current_streak}
                  </div>
                  <div className={styles.modalStatLbl}>day streak</div>
                </div>
                <div className={styles.modalStatLine} />
                <div className={styles.modalStat}>
                  <div className={styles.modalStatVal}>
                    {goal.total_completed_days || 0}
                  </div>
                  <div className={styles.modalStatLbl}>days logged</div>
                </div>
                <div className={styles.modalStatLine} />
                <div className={styles.modalStat}>
                  <div className={styles.modalStatVal}>{dayNumber}</div>
                  <div className={styles.modalStatLbl}>days in</div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <motion.button
                  className={styles.modalKeep}
                  onClick={() => !isDeleting && setDeleteModal(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={isDeleting}
                >
                  Keep Going
                </motion.button>
                <motion.button
                  className={`${styles.modalConfirm} ${deleteModal === "delete" ? styles.modalConfirmRed : styles.modalConfirmAmber}`}
                  onClick={handleDelete}
                  whileHover={{ scale: isDeleting ? 1 : 1.02 }}
                  whileTap={{ scale: isDeleting ? 1 : 0.97 }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <span className={styles.btnSpinner} />
                  ) : deleteModal === "restart" ? (
                    "Yes, Start Fresh"
                  ) : (
                    "Delete Forever"
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
