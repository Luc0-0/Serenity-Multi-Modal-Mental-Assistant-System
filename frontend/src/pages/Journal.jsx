import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { journalService } from "../services/journalService";
import { Button } from "../components/Button";
import EntryDetailModal from "../components/EntryDetailModal";
import styles from "./Journal.module.css";

// ── Emotion palette ──────────────────────────────────────────────────────────
const emotionColors = {
  worst: "#8b7070",
  bad: "#a08580",
  neutral: "#8a8a7e",
  good: "#8fa882",
  great: "#a0b890",
  best: "#a89980",
};

const clampChannel = (v) => Math.min(255, Math.max(0, Math.round(v)));

const mixColor = (hex, amount = 0) => {
  if (!hex) return "#b9a88f";
  const safe = Math.max(-1, Math.min(1, amount));
  let n = hex.replace("#", "");
  if (n.length === 3)
    n = n
      .split("")
      .map((c) => c + c)
      .join("");
  const base = parseInt(n, 16);
  if (Number.isNaN(base)) return "#b9a88f";
  const r = (base >> 16) & 255,
    g = (base >> 8) & 255,
    b = base & 255;
  const mix = (c) => (safe >= 0 ? c + (255 - c) * safe : c + c * safe);
  const mr = clampChannel(mix(r)),
    mg = clampChannel(mix(g)),
    mb = clampChannel(mix(b));
  return `#${mr.toString(16).padStart(2, "0")}${mg.toString(16).padStart(2, "0")}${mb.toString(16).padStart(2, "0")}`;
};

const mapEmotionToRatingKey = (value) => {
  if (!value) return "neutral";
  const t = value.toString().trim().toLowerCase();
  if (
    ["sad", "sadness", "worst", "melancholy", "depressed", "grief"].includes(t)
  )
    return "worst";
  if (
    [
      "anger",
      "angry",
      "mad",
      "frustrated",
      "fear",
      "anxious",
      "anxiety",
      "worried",
      "bad",
    ].includes(t)
  )
    return "bad";
  if (["calm", "ok", "okay", "fine", "neutral"].includes(t)) return "neutral";
  if (["content", "alright", "good", "hopeful", "steady"].includes(t))
    return "good";
  if (["joy", "happy", "great", "excited", "grateful"].includes(t))
    return "great";
  if (["best", "elated", "bliss", "ecstatic", "optimistic"].includes(t))
    return "best";
  if (emotionColors[t]) return t;
  return "neutral";
};

const formatEmotionText = (value) => {
  if (!value) return "Neutral";
  return value
    .toString()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const normalizeEntryTags = (value) => {
   const clean = (tag) => {
     if (tag === null || tag === undefined) return null;
     let text = String(tag).trim();
     // Remove escaped quotes and brackets
     text = text.replace(/^\["/, "").replace(/"\]$/, "").replace(/["\[\]\\]/g, "");
     text = text.trim();
     if (
       !text ||
       ["null", "none", "undefined", "[]"].includes(text.toLowerCase())
     )
       return null;
     return text.toLowerCase();
   };
   
   let tags = [];
   if (Array.isArray(value)) {
     tags = value.map(clean).filter(Boolean);
   } else if (typeof value === "string" && value.trim()) {
     try {
       // Try parsing as JSON first
       const parsed = JSON.parse(value);
       tags = Array.isArray(parsed) ? parsed.map(clean).filter(Boolean) : [clean(value)];
     } catch {
       tags = value.split(",").map(clean).filter(Boolean);
     }
   }
   
   // Deduplicate
   return [...new Set(tags)];
 };

// ── SVG face builders ────────────────────────────────────────────────────────
const createSphereBase = (key, color) => {
  const k = key || "emotion";
  const primary = color || "#a68c75";
  const highlight = mixColor(primary, 0.45);
  const midtone = mixColor(primary, 0.15);
  const shadow = mixColor(primary, -0.35);
  const sheen = mixColor(primary, 0.65);
  return `
    <defs>
      <radialGradient id="${k}-sg" cx="30%" cy="25%" r="70%">
        <stop offset="0%"   stop-color="${highlight}" />
        <stop offset="55%"  stop-color="${midtone}" />
        <stop offset="100%" stop-color="${shadow}" />
      </radialGradient>
      <radialGradient id="${k}-sh" cx="35%" cy="30%" r="30%">
        <stop offset="0%"   stop-color="${sheen}" stop-opacity="0.85" />
        <stop offset="100%" stop-color="${sheen}" stop-opacity="0" />
      </radialGradient>
      <filter id="${k}-sf" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="${shadow}" flood-opacity="0.45" />
      </filter>
    </defs>
    <circle cx="32" cy="32" r="27" fill="url(#${k}-sg)" filter="url(#${k}-sf)" />
    <ellipse cx="24" cy="20" rx="12" ry="8" fill="url(#${k}-sh)" opacity="0.9" />
    <circle cx="38" cy="42" r="16" fill="${sheen}" opacity="0.08" />
  `;
};

const ratingOptions = [
  {
    key: "worst",
    label: "Worst",
    color: emotionColors.worst,
    svg: (color, key) => {
      const deep = mixColor(color, -0.3),
        outline = mixColor(color, -0.45),
        tear = mixColor(color, 0.45),
        mid = mixColor(color, -0.1);
      return `${createSphereBase(key, color)}
        <g opacity="0.95">
          <circle cx="32" cy="34" r="23.5" fill="none" stroke="${outline}" stroke-width="1.4" />
          <ellipse cx="24" cy="27" rx="3.6" ry="4.8" fill="${deep}" opacity="0.95" />
          <ellipse cx="40" cy="27" rx="3.6" ry="4.8" fill="${deep}" opacity="0.95" />
          <path d="M 22 42 Q 32 36 42 42" stroke="${deep}" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M 25 31 Q 27 29 29 31" stroke="${mid}" stroke-width="2.4" fill="none" stroke-linecap="round" />
          <path d="M 35 31 Q 37 29 39 31" stroke="${mid}" stroke-width="2.4" fill="none" stroke-linecap="round" />
        </g>
        <ellipse cx="25" cy="38" rx="3" ry="6" fill="${tear}" opacity="0.55" />
        <ellipse cx="39" cy="38" rx="3" ry="6" fill="${tear}" opacity="0.55" />`;
    },
  },
  {
    key: "bad",
    label: "Bad",
    color: emotionColors.bad,
    svg: (color, key) => {
      const outline = mixColor(color, -0.3),
        highlight = mixColor(color, 0.25);
      return `${createSphereBase(key, color)}
        <g opacity="0.9">
          <circle cx="32" cy="34" r="23" fill="none" stroke="${outline}" stroke-width="1.2" />
          <ellipse cx="24" cy="26.5" rx="3.2" ry="3.8" fill="${outline}" />
          <ellipse cx="40" cy="26.5" rx="3.2" ry="3.8" fill="${outline}" />
          <path d="M 23 40 Q 32 34 41 40" stroke="${outline}" stroke-width="2.8" fill="none" stroke-linecap="round" />
        </g>
        <ellipse cx="26" cy="23" rx="6" ry="2.4" fill="${highlight}" opacity="0.18" />`;
    },
  },
  {
    key: "neutral",
    label: "Neutral",
    color: emotionColors.neutral,
    svg: (color, key) => {
      const outline = mixColor(color, -0.2),
        glow = mixColor(color, 0.2);
      return `${createSphereBase(key, color)}
        <g opacity="0.95">
          <circle cx="32" cy="34" r="23" fill="none" stroke="${outline}" stroke-width="1.2" />
          <circle cx="24" cy="27" r="3" fill="${outline}" />
          <circle cx="40" cy="27" r="3" fill="${outline}" />
          <line x1="24" y1="40" x2="40" y2="40" stroke="${outline}" stroke-width="2.6" stroke-linecap="round" />
        </g>
        <ellipse cx="30" cy="23" rx="8" ry="3" fill="${glow}" opacity="0.15" />`;
    },
  },
  {
    key: "good",
    label: "Good",
    color: emotionColors.good,
    svg: (color, key) => {
      const outline = mixColor(color, -0.2),
        smile = mixColor(color, 0.1),
        sparkle = mixColor(color, 0.45);
      return `${createSphereBase(key, color)}
        <g opacity="0.95">
          <circle cx="32" cy="34" r="23" fill="none" stroke="${outline}" stroke-width="1.1" />
          <ellipse cx="24" cy="27" rx="3" ry="3.4" fill="${outline}" />
          <ellipse cx="40" cy="27" rx="3" ry="3.4" fill="${outline}" />
          <path d="M 24 38 Q 32 45 40 38" stroke="${smile}" stroke-width="3" fill="none" stroke-linecap="round" />
        </g>
        <path d="M 32 20 L 34 24 L 38 25 L 34 27 L 32 31 L 30 27 L 26 25 L 30 24 Z" fill="${sparkle}" opacity="0.12" />`;
    },
  },
  {
    key: "great",
    label: "Great",
    color: emotionColors.great,
    svg: (color, key) => {
      const outline = mixColor(color, -0.1),
        smile = mixColor(color, 0.25),
        dimple = mixColor(color, 0.05);
      return `${createSphereBase(key, color)}
        <g opacity="0.95">
          <circle cx="32" cy="34" r="23" fill="none" stroke="${outline}" stroke-width="1.1" />
          <ellipse cx="22" cy="26.5" rx="3" ry="3.2" fill="${outline}" />
          <ellipse cx="42" cy="26.5" rx="3" ry="3.2" fill="${outline}" />
          <path d="M 22 36 Q 32 46 42 36" stroke="${smile}" stroke-width="3" fill="none" stroke-linecap="round" />
          <circle cx="24" cy="34" r="1.2" fill="${dimple}" />
          <circle cx="40" cy="34" r="1.2" fill="${dimple}" />
        </g>
        <ellipse cx="32" cy="22" rx="10" ry="4" fill="${smile}" opacity="0.18" />`;
    },
  },
  {
    key: "best",
    label: "Best+",
    color: emotionColors.best,
    svg: (color, key) => {
      const outline = mixColor(color, 0.05),
        smile = mixColor(color, 0.35),
        accents = mixColor(color, 0.5);
      return `${createSphereBase(key, color)}
        <g opacity="0.95">
          <circle cx="32" cy="34" r="23" fill="none" stroke="${outline}" stroke-width="1.3" />
          <ellipse cx="22" cy="26" rx="3" ry="3.2" fill="${outline}" />
          <ellipse cx="42" cy="26" rx="3" ry="3.2" fill="${outline}" />
          <path d="M 22 35 Q 32 48 42 35" stroke="${smile}" stroke-width="3.2" fill="none" stroke-linecap="round" />
          <path d="M 26 33 Q 32 37 38 33" stroke="${smile}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.7" />
        </g>
        <g opacity="0.7" fill="${accents}">
          <path d="M 14 18 L 16 22 L 14 26 L 18 24 L 22 26 L 20 22 L 22 18 L 18 20 Z" opacity="0.6" />
          <path d="M 50 18 L 52 22 L 50 26 L 54 24 L 58 26 L 56 22 L 58 18 L 54 20 Z" opacity="0.6" />
        </g>`;
    },
  },
];

// ── SVG Renderer ─────────────────────────────────────────────────────────────
const gradientsCache = {};
const createGrad = (key, color) => {
  const id = `grad-${key}`;
  const gradientMap = {
    worst: { start: "#6b5555", end: "#4a3a3a" },
    bad: { start: "#8b6f6f", end: "#6b5555" },
    neutral: { start: "#7a7a6e", end: "#5a5a54" },
    good: { start: "#7f9572", end: "#5f7552" },
    great: { start: "#8fa882", end: "#6f8862" },
    best: { start: "#a89980", end: "#887960" },
  };
  const g = gradientMap[key] || { start: color, end: color };
  return {
    id,
    defs: `<defs>
      <linearGradient id="${id}-lin" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   style="stop-color:${g.start};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${g.end};stop-opacity:1" />
      </linearGradient>
      <radialGradient id="${id}-rad" cx="35%" cy="35%">
        <stop offset="0%"   style="stop-color:${g.start};stop-opacity:0.4" />
        <stop offset="60%"  style="stop-color:${g.start};stop-opacity:0.15" />
        <stop offset="100%" style="stop-color:${g.end};stop-opacity:0" />
      </radialGradient>
      <filter id="${id}-glow">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.3"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    </defs>`,
  };
};

const EnhancedSVGRenderer = ({ option }) => {
  if (!option) return null;
  if (!gradientsCache[option.key]) {
    gradientsCache[option.key] = createGrad(option.key, option.color);
  }
  const grad = gradientsCache[option.key];
  const svgContent = option.svg(option.color, option.key);
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <g dangerouslySetInnerHTML={{ __html: grad.defs }} />
      <circle
        cx="32"
        cy="32"
        r="30"
        fill={`url(#${grad.id}-rad)`}
        filter={`url(#${grad.id}-glow)`}
      />
      <circle
        cx="32"
        cy="32"
        r="28"
        fill={`url(#${grad.id}-lin)`}
        opacity="0.85"
      />
      <g dangerouslySetInnerHTML={{ __html: svgContent }} />
    </svg>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const motivationalQuotes = [
  {
    text: "Every storm ends. This moment is just a cloud drifting by.",
    author: "Serenity",
  },
  {
    text: "Small steps still count as forward. Honor the inch you moved today.",
    author: "Serenity",
  },
  {
    text: "You are allowed to be both a masterpiece and a work in progress.",
    author: "Serenity",
  },
  {
    text: "Peace isn't found. It's crafted with each honest breath.",
    author: "Serenity",
  },
  {
    text: "Softness is not weakness; it's evidence you survived.",
    author: "Serenity",
  },
];

// ── Main Component ───────────────────────────────────────────────────────────
export function Journal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [journalMeta, setJournalMeta] = useState({
    manualEntries: 0,
    autoEntries: 0,
    totalEntries: 0,
    dominantEmotion: null,
    quoteOfDay: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayRating, setTodayRating] = useState(null);
  const [todayContent, setTodayContent] = useState("");
  const [textAreaExpanded, setTextAreaExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const textAreaRef = useRef(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await journalService.listEntries(0, 50);
      setEntries(data.entries || []);
      setJournalMeta({
        manualEntries: data?.manual_entries ?? data?.manualEntries ?? 0,
        autoEntries: data?.auto_entries ?? data?.autoEntries ?? 0,
        totalEntries: data?.total ?? data?.entries?.length ?? 0,
        dominantEmotion: data?.dominant_emotion || null,
        quoteOfDay: data?.quote_of_day || null,
      });
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
      setError("Failed to load journal entries");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async () => {
    if (!todayContent.trim()) return;
    setIsSaving(true);
    try {
      const title =
        todayContent.split("\n")[0].substring(0, 50) || "Today's Entry";
      const newEntry = await journalService.createEntry({
        title,
        content: todayContent,
        emotion: todayRating || "neutral",
        tags: [],
      });
      setEntries([newEntry, ...entries]);
      setTodayContent("");
      setTodayRating(null);
      setTextAreaExpanded(false);
      setError(null);
    } catch (err) {
      setError("Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await journalService.deleteEntry(entryId);
      setEntries(entries.filter((e) => e.id !== entryId));
      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const handleOpenEntry = (id) => {
    setSelectedEntryId(id);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEntryId(null);
  };
  const handleEntryUpdated = (u) =>
    setEntries((p) => p.map((e) => (e.id === u.id ? { ...e, ...u } : e)));

  const formatDate = (dateValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return (
        "Today, " +
        date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      );
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const totalEntries = journalMeta.totalEntries || entries.length;

  const thisWeekEntries = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entries.filter((e) => new Date(e.created_at || e.date) >= weekAgo)
      .length;
  }, [entries]);

  const topRatingOption = useMemo(() => {
    const dominant = journalMeta.dominantEmotion?.emotion;
    if (dominant) {
      const mapped = mapEmotionToRatingKey(dominant);
      return ratingOptions.find((r) => r.key === mapped) || ratingOptions[2];
    }
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const emotions = entries
      .filter((e) => new Date(e.created_at || e.date) >= weekAgo)
      .map((e) => mapEmotionToRatingKey(e.emotion || e.mood || "neutral"));
    const counts = {};
    emotions.forEach((em) => {
      counts[em] = (counts[em] || 0) + 1;
    });
    const top =
      Object.keys(counts).length > 0
        ? Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))
        : "neutral";
    return ratingOptions.find((r) => r.key === top) || ratingOptions[2];
  }, [entries, journalMeta.dominantEmotion]);

  const autoExtractCount =
    typeof journalMeta.autoEntries === "number"
      ? journalMeta.autoEntries
      : entries.filter((e) => e.auto_extract === true).length;
  const userWrittenCount =
    typeof journalMeta.manualEntries === "number"
      ? journalMeta.manualEntries
      : entries.filter((e) => e.auto_extract === false).length;
  const autoExtractRatio =
    totalEntries > 0 ? Math.round((autoExtractCount / totalEntries) * 100) : 0;

  const filteredEntries = useMemo(() => {
    if (filterType === "auto")
      return entries.filter((e) => e.auto_extract === true);
    if (filterType === "user")
      return entries.filter((e) => e.auto_extract === false);
    return entries;
  }, [entries, filterType]);

  const quoteIndex = new Date().getDate() % motivationalQuotes.length;
  const todayQuote = journalMeta.quoteOfDay || motivationalQuotes[quoteIndex];

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />

      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.pageTitle}>Journal</h1>
          <p className={styles.pageSubtitle}>Your thoughts, your story</p>
        </div>
      </header>

      {error && (
        <div className={styles.errorNotification}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeButton}>
            ×
          </button>
        </div>
      )}

      <main className={styles.content}>
        {/* ── Hero ── */}
        {!isLoading && (
          <section className={styles.journalHero}>
            <div className={styles.heroCopy}>
              <p className={styles.heroEyebrow}>Serenity Journal</p>
              <h2>
                Velvet reflections,
                <br />
                always within reach.
              </h2>
              {todayQuote && (
                <blockquote className={styles.heroQuote}>
                  <span className={styles.quoteOpenMark}>"</span>
                  <span className={styles.quoteText}>{todayQuote.text}</span>
                  <span className={styles.quoteSource}>
                    — {todayQuote.author || todayQuote.source || "Serenity"}
                  </span>
                </blockquote>
              )}
            </div>

            {/* Right panel: only manual + auto counts */}
            <div className={styles.heroMetrics}>
              <div className={styles.heroMetric}>
                <span className={styles.heroMetricLabel}>Manual</span>
                <span className={styles.heroMetricValue}>
                  {userWrittenCount}
                </span>
                <span className={styles.heroMetricSub}>Handwritten</span>
              </div>
              <div className={styles.heroMetric}>
                <span className={styles.heroMetricLabel}>AI Extracted</span>
                <span className={styles.heroMetricValue}>
                  {autoExtractCount}
                </span>
                <span className={styles.heroMetricSub}>Auto entries</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Analytics ── */}
        {!isLoading && entries.length > 0 && (
          <section className={styles.analyticsSection}>
            <div className={styles.statsGrid}>
              {/* Total */}
              <div className={styles.statCard}>
                <div className={styles.statValue}>{totalEntries}</div>
                <div className={styles.statLabel}>Total Entries</div>
                <div className={styles.statSubtext}>All-time</div>
              </div>
              {/* This week */}
              <div className={styles.statCard}>
                <div className={styles.statValue}>{thisWeekEntries}</div>
                <div className={styles.statLabel}>This Week</div>
                <div className={styles.statSubtext}>Last 7 days</div>
              </div>
              {/* Dominant emotion */}
              <div className={styles.statCard}>
                <div className={styles.statMoodIcon}>
                  <EnhancedSVGRenderer option={topRatingOption} />
                  <span>{topRatingOption?.label || "Neutral"}</span>
                </div>
                <div className={styles.statLabel}>Mood</div>
              </div>
              {/* AI ratio */}
              <div className={styles.statCard}>
                <div className={styles.statValue}>{autoExtractRatio}%</div>
                <div className={styles.statLabel}>AI Extracted</div>
                <div className={styles.statSubtext}>
                  {autoExtractCount} entries
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Today's Entry ── */}
        <section className={styles.todaySection}>
          <div className={styles.entryCard}>
            <h2 className={styles.sectionTitle}>Today's Entry</h2>

            <div className={styles.emotionSection}>
              <div className={styles.emotionHeader}>
                <label className={styles.emotionLabel}>How was your day?</label>
                {todayRating && (
                  <div
                    className={styles.emotionPreview}
                    style={{
                      borderColor: emotionColors[todayRating],
                      color: emotionColors[todayRating],
                    }}
                  >
                    <span className={styles.emotionGlyph}>
                      <svg width="14" height="14" viewBox="0 0 64 64">
                        <g
                          dangerouslySetInnerHTML={{
                            __html:
                              ratingOptions
                                .find((r) => r.key === todayRating)
                                ?.svg(
                                  emotionColors[todayRating],
                                  todayRating,
                                ) || "",
                          }}
                        />
                      </svg>
                    </span>
                    <span>
                      {ratingOptions.find((r) => r.key === todayRating)?.label}
                    </span>
                  </div>
                )}
              </div>
              <div className={styles.emotionGrid}>
                {ratingOptions.map((rating) => (
                  <button
                    key={rating.key}
                    className={`${styles.emotionBtn} ${todayRating === rating.key ? styles.selected : ""}`}
                    onClick={() => setTodayRating(rating.key)}
                    title={rating.label}
                  >
                    <div
                      style={{
                        transform: "scale(1.15)",
                        transformOrigin: "center",
                      }}
                    >
                      <EnhancedSVGRenderer option={rating} />
                    </div>
                    <span className={styles.emotionName}>{rating.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.textAreaSection}>
              <label className={styles.textAreaLabel}>Your thoughts</label>
              <div className={styles.textAreaWrapper}>
                <textarea
                  ref={textAreaRef}
                  className={`${styles.textArea} ${textAreaExpanded ? styles.expanded : styles.collapsed}`}
                  placeholder="Write about what's on your mind..."
                  value={todayContent}
                  onChange={(e) => setTodayContent(e.target.value)}
                  onFocus={() => setTextAreaExpanded(true)}
                  onBlur={() => {
                    if (!todayContent.trim()) setTextAreaExpanded(false);
                  }}
                />
                <div className={styles.wordCount}>
                  {todayContent.split(/\s+/).filter((w) => w.length > 0).length}{" "}
                  words
                </div>
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <Button
                onClick={handleAddEntry}
                disabled={!todayContent.trim() || isSaving}
                className={styles.saveBtn}
              >
                {isSaving ? "Saving…" : "Save Entry"}
              </Button>
            </div>
          </div>
        </section>

        {/* ── Loading ── */}
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "0.8rem",
                color: "rgba(200,191,173,0.4)",
                letterSpacing: "0.1em",
              }}
            >
              Loading entries…
            </p>
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && entries.length === 0 && (
          <div className={styles.emptyState}>
            <p>No journal entries yet.</p>
            <p className={styles.emptySubtext}>
              Create your first entry above to begin your journey.
            </p>
          </div>
        )}

        {/* ── Recent Entries ── */}
        {!isLoading && entries.length > 0 && (
          <section className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Entries</h2>
              <div className={styles.filterTabs}>
                <button
                  className={`${styles.filterBtn} ${filterType === "all" ? styles.active : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  All ({totalEntries})
                </button>
                <button
                  className={`${styles.filterBtn} ${filterType === "auto" ? styles.active : ""}`}
                  onClick={() => setFilterType("auto")}
                >
                  Auto ({autoExtractCount})
                </button>
                <button
                  className={`${styles.filterBtn} ${filterType === "user" ? styles.active : ""}`}
                  onClick={() => setFilterType("user")}
                >
                  Manual ({userWrittenCount})
                </button>
              </div>
            </div>

            <div className={styles.entriesList}>
              {filteredEntries.map((entry) => {
                const rawEmotion = entry.emotion || entry.mood || "neutral";
                const emotionKey = mapEmotionToRatingKey(rawEmotion);
                const ratingOpt =
                  ratingOptions.find((r) => r.key === emotionKey) ||
                  ratingOptions[2];
                const eColor = emotionColors[emotionKey] || "#c8a46a";
                const eGlow = `${eColor}22`;
                const tags = normalizeEntryTags(entry.tags);
                const displayEmo = formatEmotionText(
                  entry.emotion || entry.mood || ratingOpt?.label,
                );
                const showAuto = entry.auto_extract === true;
                const hasTags = tags.length > 0;

                return (
                  <div
                    key={entry.id}
                    className={styles.entryItem}
                    style={{
                      "--emotion-color": eColor,
                      "--emotion-glow": eGlow,
                      cursor: "pointer",
                    }}
                    onClick={() => handleOpenEntry(entry.id)}
                  >
                    {/* Header */}
                    <div className={styles.entryHeader}>
                      <div className={styles.entryTitleSection}>
                        <p className={styles.entryDate}>
                          {formatDate(entry.created_at || entry.date)}
                        </p>
                        <h3 className={styles.entryTitle}>{entry.title}</h3>
                      </div>
                      <button
                        type="button"
                        className={styles.entryDeleteBtn}
                        title="Delete entry"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                      >
                        ×
                      </button>
                    </div>

                    {/* Content preview */}
                     <div className={styles.entryContent}>
                       <ReactMarkdown>
                         {entry.content || ""}
                       </ReactMarkdown>
                     </div>

                    {/* Footer: chips left, tags right */}
                    <div className={styles.entryFooter}>
                      <div className={styles.entryChips}>
                        {/* Emotion badge */}
                        <span
                          className={styles.emotionBadge}
                          style={{ borderColor: eColor, color: eColor }}
                        >
                          <span className={styles.emotionGlyph}>
                            <svg width="13" height="13" viewBox="0 0 64 64">
                              <g
                                dangerouslySetInnerHTML={{
                                  __html:
                                    ratingOpt?.svg(
                                      ratingOpt?.color,
                                      ratingOpt?.key,
                                    ) || "",
                                }}
                              />
                            </svg>
                          </span>
                          <span>{displayEmo}</span>
                        </span>

                        {/* Auto chip */}
                        {showAuto && (
                          <span className={styles.autoChip}>
                            <span className={styles.autoIcon}>✦</span>
                            Auto
                          </span>
                        )}
                      </div>

                      {/* Tags — aligned right */}
                      {hasTags && (
                        <div className={styles.entryTags}>
                          {tags.map((tag) => (
                            <span
                              key={`${entry.id}-${tag}`}
                              className={styles.tagPill}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <EntryDetailModal
        entryId={selectedEntryId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDelete={handleDeleteEntry}
        onEntryUpdated={handleEntryUpdated}
      />
    </div>
  );
}

export default Journal;
