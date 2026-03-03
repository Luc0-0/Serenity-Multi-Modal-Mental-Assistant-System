import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { journalService } from "../services/journalService";
import { Button } from "../components/Button";
import styles from "./Journal.module.css";

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

  // Rating system with custom SVG styling
  const ratingOptions = [
    {
      key: "worst",
      label: "Worst",
      color: "#d4a0a0",
      path: "M24,18 L36,18 M24,30 Q30,36 36,30",
    },
    {
      key: "bad",
      label: "Bad",
      color: "#d4a8a0",
      path: "M24,18 L36,18 M24,32 L36,32",
    },
    {
      key: "neutral",
      label: "Neutral",
      color: "#a8a8a8",
      path: "M24,18 L36,18 M24,32 L36,32",
    },
    {
      key: "good",
      label: "Good",
      color: "#a8c5a0",
      path: "M24,18 L36,18 M24,32 Q30,26 36,32",
    },
    {
      key: "great",
      label: "Great",
      color: "#a8d5a0",
      path: "M24,18 L36,18 M20,32 Q30,24 40,32",
    },
    {
      key: "best",
      label: "Best+",
      color: "#d4af37",
      path: "M30,16 L33,24 L42,24 L35,30 L38,38 L30,32 L22,38 L25,30 L18,24 L27,24 Z",
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

  // Calculate stats
  const totalEntries = entries.length;
  const thisWeekEntries = entries.filter((e) => {
    const entryDate = new Date(e.created_at || e.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return entryDate >= weekAgo;
  }).length;

  // Get dominant emotion this week
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
                  viewBox="0 0 48 48"
                  style={{ margin: "0 auto" }}
                >
                  <path
                    d={topRatingOption?.path || "M24,18 L36,18 M24,32 L36,32"}
                    stroke={topRatingOption?.color || "#a8a8a8"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    fill="none"
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
              <label className={styles.emotionLabel}>How was your day?</label>
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
                      width="32"
                      height="32"
                      viewBox="0 0 48 48"
                      className={styles.ratingIcon}
                    >
                      <path
                        d={rating.path}
                        stroke={rating.color}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
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
                  className={`${styles.filterBtn} ${filterType === "ai" ? styles.active : ""}`}
                  onClick={() => setFilterType("ai")}
                >
                  AI Extracted ({aiExtractedCount})
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
                          <svg width="14" height="14" viewBox="0 0 48 48">
                            <path
                              d={
                                ratingOption?.path ||
                                "M24,18 L36,18 M24,32 L36,32"
                              }
                              stroke={ratingOption?.color || "#a8a8a8"}
                              strokeWidth="2"
                              strokeLinecap="round"
                              fill="none"
                            />
                          </svg>
                        </span>
                        <span>{ratingOption?.label || "Neutral"}</span>
                      </span>
                      {entry.ai_extracted && (
                        <div className={styles.aiBadge}>
                          <span>✨ AI Extracted</span>
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
