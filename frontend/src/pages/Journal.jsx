import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { journalService } from "../services/journalService";
import { Button } from "../components/Button";
import styles from "./Journal.module.css";

/**
 * Journal Page.
 * Private reflection space.
 */
export function Journal() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [todayMood, setTodayMood] = useState(null);
  const [todayContent, setTodayContent] = useState("");
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const textAreaRef = useRef(null);

  const moodOptions = [
    { value: "stressed", label: "Stressed", emoji: "😰" },
    { value: "sad", label: "Sad", emoji: "😢" },
    { value: "neutral", label: "Neutral", emoji: "😐" },
    { value: "happy", label: "Happy", emoji: "😊" },
    { value: "grateful", label: "Grateful", emoji: "🙏" },
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
      const title = todayContent.split("\n")[0].substring(0, 50) || "Today's Entry";
      const newEntry = await journalService.createEntry({
        title,
        content: todayContent,
        emotion: todayMood || "neutral",
        tags: [],
      });
      setEntries([newEntry, ...entries]);
      setTodayContent("");
      setTodayMood(null);
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
      return "Today, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (dateValue) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.container}>
      {/* Background */}
      <div className={styles.backgroundImage} />

      {/* Navigation Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.pageTitle}>Journal</h1>
            <p className={styles.pageSubtitle}>How are you feeling today?</p>
          </div>
        </div>
      </header>

      {/* Error Toast */}
      {error && (
        <div
          style={{
            position: "fixed",
            top: "1.5rem",
            right: "1.5rem",
            padding: "0.75rem 1.25rem",
            background: "rgba(168, 90, 90, 0.15)",
            border: "1px solid rgba(168, 90, 90, 0.4)",
            borderRadius: "10px",
            fontSize: "0.85rem",
            color: "#c97b7b",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              background: "none",
              border: "none",
              color: "#c97b7b",
              cursor: "pointer",
              fontSize: "1.1rem",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.content}>
        {/* Today's Date Display */}
        <div className={styles.dateDisplay}>
          <h2 className={styles.dateText}>
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </h2>
        </div>

        {/* Today's Entry Section */}
        <section className={styles.todaySection}>
          <div className={styles.entryCard}>
            {/* Rate Your Day */}
            <div className={styles.rateYourDay}>
              <label className={styles.rateLabel}>Rate Your Day</label>
              <div className={styles.moodSelector}>
                {moodOptions.map((mood) => (
                  <button
                    key={mood.value}
                    className={`${styles.moodBtn} ${todayMood === mood.value ? styles.selected : ""}`}
                    onClick={() => setTodayMood(mood.value)}
                    title={mood.label}
                  >
                    <span className={styles.moodEmoji}>{mood.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Text Area with Button */}
            <div className={styles.textAreaWrapper}>
              <textarea
                ref={textAreaRef}
                className={`${styles.textArea} ${isTextAreaFocused || todayContent ? styles.expanded : ""}`}
                placeholder="Write about what's on your mind..."
                value={todayContent}
                onChange={(e) => setTodayContent(e.target.value)}
                onFocus={() => setIsTextAreaFocused(true)}
                onBlur={() => setIsTextAreaFocused(false)}
              />

              {/* Add Entry Button */}
              <Button
                onClick={handleAddEntry}
                disabled={!todayContent.trim() || isSaving}
              >
                {isSaving ? "Saving..." : "Add Entry"}
              </Button>
            </div>
          </div>
        </section>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#bda17b" }}>
            Loading entries...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && entries.length === 0 && (
          <div style={{ textAlign: "center", padding: "2rem", color: "#7a7a7a" }}>
            <p>No journal entries yet. Write your first entry above.</p>
          </div>
        )}

        {/* Recent Entries Section */}
        {!isLoading && entries.length > 0 && (
          <section className={styles.recentSection}>
            <h2 className={styles.sectionTitle}>Recent Entries</h2>

            <div className={styles.entriesList}>
              {entries.map((entry) => (
                <div key={entry.id} className={styles.entryItem}>
                  <div className={styles.entryHeader}>
                    <div>
                      <p className={styles.entryDate}>
                        {formatDate(entry.created_at || entry.date)}
                      </p>
                      <h3 className={styles.entryTitle}>{entry.title}</h3>
                    </div>
                    <button
                      className={styles.moreBtn}
                      aria-label="Delete entry"
                      onClick={() => handleDeleteEntry(entry.id)}
                    >
                      ✕
                    </button>
                  </div>

                  <p className={styles.entryContent}>{entry.content}</p>

                  <div className={styles.entryFooter}>
                    <div className={styles.entryMeta}>
                      <span className={styles.heart}>♥</span>
                      <span className={styles.time}>
                        {formatTime(entry.created_at || entry.date)}
                      </span>
                      <span className={styles.mood}>
                        <span className={styles.moodIcon}>
                          {moodOptions.find((m) => m.value === (entry.emotion || entry.mood))?.emoji}
                        </span>
                        {moodOptions.find((m) => m.value === (entry.emotion || entry.mood))?.label}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Journal;
