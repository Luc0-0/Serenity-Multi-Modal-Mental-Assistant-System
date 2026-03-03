import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { journalService } from "../services/journalService";
import { Button } from "../components/Button";
import styles from "./Journal.module.css";

// Emotion color palette - aligned with luxury dark theme
const emotionColors = {
  worst: "#9B6B6B",
  bad: "#A89080",
  neutral: "#A8A8A8",
  good: "#9BC399",
  great: "#A8D9A0",
  best: "#D4AF37",
};

// Emotion emojis for fallback
const emotionEmojis = {
  worst: "😢",
  bad: "😔",
  neutral: "😐",
  good: "🙂",
  great: "😊",
  best: "✨",
};

export function Journal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayRating, setTodayRating] = useState(null);
  const [todayContent, setTodayContent] = useState("");
  const [textAreaExpanded, setTextAreaExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const textAreaRef = useRef(null);

  // Premium emotion rating system with refined SVG icons
  // Each emotion has a sophisticated appearance with:
  // - Subtle background circles for premium feel
  // - Refined facial expressions with smooth curves
  // - Consistent stroke styling (rounded caps & joins)
  // - Optional decorative elements for contrast states
  const ratingOptions = [
    {
      key: "worst",
      label: "Worst",
      color: emotionColors.worst,
      // Sorrowful face - deep sadness with downturned mouth and tears
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.08" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.2" />
        <circle cx="22" cy="26" r="2.5" fill="${color}" />
        <circle cx="42" cy="26" r="2.5" fill="${color}" />
        <path d="M 20 30 Q 22 28 24 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 40 30 Q 42 28 44 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 22 40 Q 32 35 42 40" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="20" y1="42" x2="18" y2="48" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
        <line x1="44" y1="42" x2="46" y2="48" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.6" />
      `,
    },
    {
      key: "bad",
      label: "Bad",
      color: emotionColors.bad,
      // Unhappy face - frowning expression
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.08" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.15" />
        <circle cx="22" cy="26" r="2.5" fill="${color}" />
        <circle cx="42" cy="26" r="2.5" fill="${color}" />
        <path d="M 20 30 Q 22 28 24 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 40 30 Q 42 28 44 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 24 40 Q 32 34 40 40" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      `,
    },
    {
      key: "neutral",
      label: "Neutral",
      color: emotionColors.neutral,
      // Neutral face - calm, centered expression
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.06" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.1" />
        <circle cx="22" cy="26" r="2.5" fill="${color}" />
        <circle cx="42" cy="26" r="2.5" fill="${color}" />
        <line x1="22" y1="40" x2="42" y2="40" stroke="${color}" stroke-width="2" stroke-linecap="round" />
      `,
    },
    {
      key: "good",
      label: "Good",
      color: emotionColors.good,
      // Peaceful smile - gentle, calm expression
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.08" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.15" />
        <circle cx="22" cy="26" r="2.5" fill="${color}" />
        <circle cx="42" cy="26" r="2.5" fill="${color}" />
        <path d="M 20 30 Q 22 28 24 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 40 30 Q 42 28 44 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 24 37 Q 32 42 40 37" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      `,
    },
    {
      key: "great",
      label: "Great",
      color: emotionColors.great,
      // Joyful smile - warm, bright expression
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.1" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.2" />
        <circle cx="20" cy="26" r="2.5" fill="${color}" />
        <circle cx="44" cy="26" r="2.5" fill="${color}" />
        <path d="M 18 30 Q 20 27 22 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 42 30 Q 44 27 46 30" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 22 36 Q 32 44 42 36" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 26 34 Q 32 37 38 34" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.5" />
      `,
    },
    {
      key: "best",
      label: "Best+",
      color: emotionColors.best,
      // Radiant joy - celebratory with luminous elements
      svg: (color) => `
        <circle cx="32" cy="32" r="26" fill="${color}" opacity="0.12" />
        <circle cx="32" cy="32" r="24" stroke="${color}" stroke-width="1.5" fill="none" opacity="0.25" />
        <circle cx="20" cy="25" r="2.5" fill="${color}" />
        <circle cx="44" cy="25" r="2.5" fill="${color}" />
        <path d="M 18 29 Q 20 26 22 29" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 42 29 Q 44 26 46 29" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" />
        <path d="M 20 36 Q 32 46 44 36" stroke="${color}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M 24 34 Q 32 39 40 34" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.6" />
        <g opacity="0.7">
          <path d="M 14 20 L 16 22 L 14 24" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 50 20 L 52 22 L 50 24" stroke="${color}" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M 10 32 L 12 32" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
          <path d="M 52 32 L 54 32" stroke="${color}" stroke-width="1.5" stroke-linecap="round" opacity="0.5" />
        </g>
      `,
    },
  ];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setIsLoading(true);
      const data = await journalService.listEntries(0, 50);
      setEntries(data.entries || []);
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
      console.error("Failed to save entry:", err);
      setError("Failed to save entry. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await journalService.deleteEntry(entryId);
      setEntries(entries.filter((e) => e.id !== entryId));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

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

  const formatTime = (dateValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Calculate stats and filtered data
  const totalEntries = entries.length;
  
  const thisWeekEntries = useMemo(() => {
    return entries.filter((e) => {
      const entryDate = new Date(e.created_at || e.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return entryDate >= weekAgo;
    }).length;
  }, [entries]);

  // Get dominant emotion this week
  const topRatingOption = useMemo(() => {
    const thisWeekEmotions = entries
      .filter((e) => {
        const entryDate = new Date(e.created_at || e.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return entryDate >= weekAgo;
      })
      .map((e) => e.emotion || e.mood || "neutral");

    const emotionCounts = {};
    thisWeekEmotions.forEach((emotion) => {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    });

    const topEmotion =
      Object.keys(emotionCounts).length > 0
        ? Object.keys(emotionCounts).reduce((a, b) =>
            emotionCounts[a] > emotionCounts[b] ? a : b,
          )
        : "neutral";

    return ratingOptions.find((r) => r.key === topEmotion) || ratingOptions[2];
  }, [entries, ratingOptions]);

  // Filter entries based on type
  const autoExtractCount = useMemo(() => {
    return entries.filter((e) => e.auto_extract === true).length;
  }, [entries]);

  const userWrittenCount = useMemo(() => {
    return entries.filter((e) => e.auto_extract === false).length;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (filterType === "auto") {
      return entries.filter((e) => e.auto_extract === true);
    }
    if (filterType === "user") {
      return entries.filter((e) => e.auto_extract === false);
    }
    return entries;
  }, [entries, filterType]);

  const EmotionIcon = ({ emotion, size = 96 }) => {
    const color = emotionColors[emotion] || emotionColors.neutral;
    return (
      <div
        className={styles.emotionIcon}
        style={{ borderColor: color, width: size, height: size }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 64 64"
          role="img"
        >
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.12" />
          <text x="32" y="40" textAnchor="middle" fontSize="32" fill={color}>
            {emotionEmojis[emotion] || "😐"}
          </text>
        </svg>
      </div>
    );
  };

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
        {/* Analytics Cards */}
        {!isLoading && entries.length > 0 && (
          <section className={styles.analyticsSection}>
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{totalEntries}</div>
                <div className={styles.statLabel}>Total Entries</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{thisWeekEntries}</div>
                <div className={styles.statLabel}>This Week</div>
              </div>
              <div className={styles.statCard}>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 64 64"
                  style={{ margin: "0 auto" }}
                >
                  <g
                    dangerouslySetInnerHTML={{
                      __html: topRatingOption?.svg(topRatingOption?.color) || "",
                    }}
                  />
                </svg>
                <div className={styles.statLabel}>Top Day Rating</div>
              </div>
            </div>
          </section>
        )}

        {/* Today's Entry Section */}
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
                       borderColor: emotionColors[todayRating] || emotionColors.neutral,
                       color: emotionColors[todayRating] || emotionColors.neutral,
                     }}
                   >
                     <svg width="16" height="16" viewBox="0 0 64 64">
                       <g
                         dangerouslySetInnerHTML={{
                           __html:
                             ratingOptions.find((r) => r.key === todayRating)
                               ?.svg(emotionColors[todayRating] || emotionColors.neutral) ||
                             "",
                         }}
                       />
                     </svg>
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
                    className={`${styles.emotionBtn} ${
                      todayRating === rating.key ? styles.selected : ""
                    }`}
                    onClick={() => setTodayRating(rating.key)}
                    title={rating.label}
                  >
                    <svg
                      width="40"
                      height="40"
                      viewBox="0 0 64 64"
                      className={styles.ratingIcon}
                    >
                      <g
                        dangerouslySetInnerHTML={{
                          __html: rating.svg(rating.color),
                        }}
                      />
                    </svg>
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
                  className={`${styles.textArea} ${
                    textAreaExpanded ? styles.expanded : styles.collapsed
                  }`}
                  placeholder="Write about what's on your mind..."
                  value={todayContent}
                  onChange={(e) => setTodayContent(e.target.value)}
                  onFocus={() => setTextAreaExpanded(true)}
                  onBlur={() => {
                    if (!todayContent.trim()) {
                      setTextAreaExpanded(false);
                    }
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
                {isSaving ? "Saving..." : "Save Entry"}
              </Button>
            </div>
          </div>
        </section>

        {/* Recent Entries */}
        {isLoading && (
          <div className={styles.loading}>
            <div className={styles.loadingSpinner} />
            <p>Loading entries...</p>
          </div>
        )}

        {!isLoading && entries.length === 0 && (
          <div className={styles.emptyState}>
            <p>No journal entries yet.</p>
            <p className={styles.emptySubtext}>
              Create your first entry above to begin your journey.
            </p>
          </div>
        )}

        {!isLoading && entries.length > 0 && (
          <section className={styles.recentSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Recent Entries</h2>

              <div className={styles.filterTabs}>
                <button
                  className={`${styles.filterBtn} ${filterType === "all" ? styles.active : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  All ({entries.length})
                </button>
                <button
                  className={`${styles.filterBtn} ${filterType === "auto" ? styles.active : ""}`}
                  onClick={() => setFilterType("auto")}
                >
                  Auto Extract ({autoExtractCount})
                </button>
                <button
                  className={`${styles.filterBtn} ${filterType === "user" ? styles.active : ""}`}
                  onClick={() => setFilterType("user")}
                >
                  User Written ({userWrittenCount})
                </button>
              </div>
            </div>

            <div className={styles.entriesList}>
              {filteredEntries.map((entry) => {
                const ratingOption = ratingOptions.find(
                  (r) => r.key === (entry.emotion || entry.mood || "neutral"),
                );
                return (
                  <div key={entry.id} className={styles.entryItem}>
                    <div className={styles.entryHeader}>
                      <div className={styles.entryTitleSection}>
                        <p className={styles.entryDate}>
                          {formatDate(entry.created_at || entry.date)}
                        </p>
                        <h3 className={styles.entryTitle}>{entry.title}</h3>
                      </div>
                      <button
                        className={styles.deleteBtn}
                        title="Delete entry"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        Delete
                      </button>
                    </div>

                    <p className={styles.entryContent}>{entry.content}</p>

                    <div className={styles.entryFooter}>
                       <span
                         className={styles.emotionBadge}
                         style={{
                           borderColor: ratingOption?.color || "#a8a8a8",
                         }}
                       >
                         <span style={{ fontSize: "12px" }}>
                           <svg width="14" height="14" viewBox="0 0 64 64">
                             <g
                               dangerouslySetInnerHTML={{
                                 __html:
                                   ratingOption?.svg(ratingOption?.color) ||
                                   "",
                               }}
                             />
                           </svg>
                         </span>
                         <span>{ratingOption?.label || "Neutral"}</span>
                       </span>
                       {entry.auto_extract && (
                         <div className={styles.aiBadge}>
                           <span>✨ Auto Extract</span>
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
    </div>
  );
}

export default Journal;
