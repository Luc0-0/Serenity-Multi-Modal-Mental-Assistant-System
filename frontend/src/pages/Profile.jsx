import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { apiClient } from "../services/apiClient";
import { EMOTION_COLORS } from "../services/emotionService";
import { Button } from "../components/Button";
import styles from "./Profile.module.css";

export function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error } = useNotification();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [emotionData, setEmotionData] = useState(null);
  const [stats, setStats] = useState({
    conversationCount: 0,
    journalCount: 0,
    journalWords: 0,
    streak: 0,
    joinDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    dominantEmotion: "neutral",
    emotionTrend: "stable",
    dominancePct: 0,
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setIsLoading(true);
      const profileRes = await apiClient.get("/auth/profile/");
      const profileUser = profileRes.user || profileRes;

      setProfile(profileUser);
      setEditData({
        name: profileUser.name || "",
        email: profileUser.email || "",
      });

      const createdDate = new Date(profileUser.created_at);
      const joinDate = createdDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const conversationCount = profileRes.stats?.conversations || 0;
      const journalCount = profileRes.stats?.journal_entries || 0;

      setStats((prev) => ({
        ...prev,
        conversationCount,
        journalCount,
        joinDate,
      }));

      try {
        const insightRes = await apiClient.get("/emotions/insights/?days=7");
        const dominantEmotion = insightRes.dominant_emotion || "neutral";
        const dominancePct =
          insightRes.total_logs > 0
            ? (insightRes.dominance_pct * 100).toFixed(0)
            : 0;
        const emotionTrend =
          insightRes.total_logs > 0 ? insightRes.trend : "no_data";
        setStats((prev) => ({
          ...prev,
          dominantEmotion,
          emotionTrend,
          dominancePct,
        }));
        setEmotionData(insightRes);
      } catch (insightErr) {
        console.warn("Insights unavailable", insightErr);
      }

      try {
        const journalRes = await apiClient.get("/journal/entries/?limit=100");
        let totalWords = 0;
        if (journalRes.entries && Array.isArray(journalRes.entries)) {
          journalRes.entries.forEach((entry) => {
            totalWords += (entry.content || "")
              .split(/\s+/)
              .filter((w) => w.length > 0).length;
          });
        }
        setStats((prev) => ({ ...prev, journalWords: totalWords }));
      } catch (journalErr) {
        console.warn("Journal word count unavailable", journalErr);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
      error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const updated = await apiClient.put("/auth/profile/", editData);
      setProfile(updated.user || updated);
      setIsEditing(false);
      success("Profile updated successfully");
    } catch (err) {
      console.error("Failed to update profile", err);
      error("Failed to update profile");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await apiClient.delete("/auth/profile/");
      logout();
      navigate("/");
      success("Account deleted");
    } catch (err) {
      console.error("Failed to delete account", err);
      error("Failed to delete account");
    }
  };

  const getEmotionColor = (emotion) => EMOTION_COLORS[emotion] || "#a8a8a8";

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "up":
        return "↗";
      case "down":
        return "↘";
      default:
        return "→";
    }
  };

  const getTrendLabel = (trend) => {
    switch (trend) {
      case "up":
        return "Improving";
      case "down":
        return "Declining";
      default:
        return "Stable";
    }
  };

  const EmotionIcon = ({ emotion, color }) => {
    const p = {
      width: 68,
      height: 68,
      viewBox: "0 0 64 64",
      "aria-hidden": "true",
      xmlns: "http://www.w3.org/2000/svg",
    };

    const icons = {
      joy: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.1" />
          <g
            transform="translate(8,8) scale(0.75)"
            fill="none"
            stroke={color}
            strokeWidth="2"
          >
            <path d="M8 24c4-6 12-6 16 0" strokeLinecap="round" />
            <circle cx="10" cy="14" r="2" fill={color} stroke="none" />
            <circle cx="22" cy="14" r="2" fill={color} stroke="none" />
          </g>
        </svg>
      ),
      sadness: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.07" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 22c2 6 10 6 14 0" strokeLinecap="round" />
            <circle cx="22" cy="20" r="2" fill={color} stroke="none" />
            <circle cx="42" cy="20" r="2" fill={color} stroke="none" />
          </g>
        </svg>
      ),
      anger: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.07" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 24c6-6 22-6 28 0" strokeLinecap="round" />
            <path d="M20 40c6-4 20-4 28 0" strokeLinecap="round" />
            <path d="M22 18l6 6M42 18l-6 6" strokeLinecap="round" />
          </g>
        </svg>
      ),
      fear: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M20 44c4-6 24-6 28 0" strokeLinecap="round" />
            <circle cx="24" cy="24" r="2" fill={color} stroke="none" />
            <circle cx="40" cy="24" r="2" fill={color} stroke="none" />
            <path d="M32 18v6" strokeLinecap="round" />
          </g>
        </svg>
      ),
      surprise: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <circle cx="32" cy="28" r="6" />
            <path
              d="M32 12v-4M32 56v4M12 32h-4M56 32h4"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ),
      disgust: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 28c6 6 22 6 28 0" strokeLinecap="round" />
            <path d="M22 22c2 0 6-4 10-4s8 4 10 4" strokeLinecap="round" />
          </g>
        </svg>
      ),
      neutral: (
        <svg {...p}>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M22 36h20" strokeLinecap="round" />
            <circle cx="22" cy="24" r="2" fill={color} stroke="none" />
            <circle cx="42" cy="24" r="2" fill={color} stroke="none" />
          </g>
        </svg>
      ),
    };

    return (
      <div
        className={styles.emotionIcon}
        style={{ borderColor: color, boxShadow: `0 0 20px ${color}18` }}
      >
        {icons[emotion] || icons.neutral}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingInner}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Loading profile</p>
        </div>
      </div>
    );
  }

  const emotionColor = getEmotionColor(stats.dominantEmotion);
  const hasEmotionData = emotionData?.total_logs > 0;

  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />
      <div className={styles.ambientGlow} aria-hidden="true" />
      <div className={styles.avatarRay} aria-hidden="true" />

      <div className={styles.contentWrapper}>
        {/* ── Hero ── */}
        <div className={styles.heroSection}>
          <div className={styles.avatarCluster}>
            <div className={styles.avatarAtmosphere} aria-hidden="true" />
            <div className={styles.avatarOrbit} aria-hidden="true" />
            <div className={styles.avatar}>
              {profile?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>

          <div className={styles.heroInfo}>
            <h1 className={styles.heroName}>{profile?.name || "User"}</h1>
            <div className={styles.heroSubRow}>
              <span className={styles.heroMemberSince}>
                Since {stats.joinDate}
              </span>
              <span className={styles.heroBadge}>Active</span>
            </div>
          </div>

          <div className={styles.heroStat}>
            <div className={styles.heroStatValue}>
              {stats.conversationCount}
            </div>
            <div className={styles.heroStatLabel}>Conversations</div>
          </div>
        </div>

        {/* ── Grid ── */}
        <div className={styles.gridLayout}>
          {/* ── Left column ── */}
          <div className={styles.leftCol}>
            {/* Account */}
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Account</h2>
                <span className={styles.cardMeta}>Settings</span>
              </div>

              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label htmlFor="p-name" className={styles.formLabel}>
                      Full Name
                    </label>
                    <input
                      id="p-name"
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label htmlFor="p-email" className={styles.formLabel}>
                      Email Address
                    </label>
                    <input
                      id="p-email"
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                      className={styles.formInput}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <Button onClick={handleSaveProfile} variant="primary">
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Email</span>
                    <span className={styles.infoValue}>{profile?.email}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Status</span>
                    <span className={styles.infoValue}>Active</span>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={styles.editBtn}
                  >
                    Edit Profile
                  </button>
                </>
              )}
            </div>

            {/* Preferences */}
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Preferences</h2>
                <span className={styles.cardMeta}>System</span>
              </div>
              <div className={styles.prefList}>
                {[
                  { label: "Dark Theme", badge: "Active" },
                  { label: "Notifications", badge: "Enabled" },
                  { label: "Data Privacy", badge: "Secure" },
                ].map(({ label, badge }) => (
                  <div key={label} className={styles.prefItem}>
                    <span className={styles.prefLabel}>{label}</span>
                    <span className={styles.prefBadge}>{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak */}
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Streak</h2>
                <span className={styles.cardMeta}>Milestones</span>
              </div>
              <div className={styles.streakCard}>
                <div className={styles.streakNumberRow}>
                  <span className={styles.streakNum}>
                    {stats.streak > 0 ? stats.streak : "—"}
                  </span>
                  {stats.streak > 0 && (
                    <span className={styles.streakUnit}>days</span>
                  )}
                </div>
                <div className={styles.streakLabel}>Current Streak</div>
                <p className={styles.streakCaption}>
                  {stats.streak > 0
                    ? "Keep the momentum going."
                    : "Begin a session to start your streak."}
                </p>
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className={styles.rightCol}>
            {/* Wellness */}
            <div
              className={`${styles.glassCard} ${hasEmotionData ? styles.wellnessClickable : ""}`}
              onClick={hasEmotionData ? () => navigate("/insights") : undefined}
              role={hasEmotionData ? "button" : undefined}
              tabIndex={hasEmotionData ? 0 : undefined}
              onKeyDown={
                hasEmotionData
                  ? (e) => e.key === "Enter" && navigate("/insights")
                  : undefined
              }
              aria-label={hasEmotionData ? "Open emotion insights" : undefined}
            >
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Wellness</h2>
                <span className={styles.cardMeta}>
                  {hasEmotionData
                    ? "Past 7 days · tap to expand"
                    : "No data yet"}
                </span>
              </div>

              <div className={styles.emotionDisplay}>
                <EmotionIcon
                  emotion={stats.dominantEmotion}
                  color={emotionColor}
                />
                <div>
                  <div className={styles.emotionName}>
                    {stats.dominantEmotion.charAt(0).toUpperCase() +
                      stats.dominantEmotion.slice(1)}
                  </div>
                  <p className={styles.emotionDesc}>
                    {hasEmotionData
                      ? `${stats.dominancePct}% of this week · dominant emotion`
                      : "Start a check-in to see your emotional patterns here."}
                  </p>
                </div>
              </div>

              {hasEmotionData && (
                <div className={styles.trendRow}>
                  <div className={styles.trendItem}>
                    <div className={styles.trendItemLabel}>Trend</div>
                    <div
                      className={styles.trendItemValue}
                      style={{ color: emotionColor }}
                    >
                      {getTrendIcon(stats.emotionTrend)}
                    </div>
                  </div>
                  <div className={styles.trendItem}>
                    <div className={styles.trendItemLabel}>Direction</div>
                    <div className={styles.trendItemStatus}>
                      {getTrendLabel(stats.emotionTrend)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instrument panel */}
            <div className={styles.instrumentPanel}>
              <div className={styles.instrument}>
                <div className={styles.instrumentGhost} aria-hidden="true">
                  {stats.conversationCount}
                </div>
                <div className={styles.instrumentValue}>
                  {stats.conversationCount}
                </div>
                <div className={styles.instrumentLabel}>Conversations</div>
              </div>
              <div className={styles.instrument}>
                <div className={styles.instrumentGhost} aria-hidden="true">
                  {stats.journalCount}
                </div>
                <div className={styles.instrumentValue}>
                  {stats.journalCount}
                </div>
                <div className={styles.instrumentLabel}>Journal Entries</div>
              </div>
            </div>

            {/* Journal insights */}
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Journal</h2>
                <span className={styles.cardMeta}>Insights</span>
              </div>
              <div className={styles.journalRows}>
                <div className={styles.journalRow}>
                  <span className={styles.journalRowLabel}>Words Written</span>
                  <span className={styles.journalRowValue}>
                    {stats.journalWords.toLocaleString()}
                  </span>
                </div>
                <div className={styles.journalRow}>
                  <span className={styles.journalRowLabel}>Total Entries</span>
                  <span className={styles.journalRowValue}>
                    {stats.journalCount}
                  </span>
                </div>
                {stats.journalCount > 0 && (
                  <div className={styles.journalRow}>
                    <span className={styles.journalRowLabel}>
                      Avg per Entry
                    </span>
                    <span className={styles.journalRowValue}>
                      {Math.round(stats.journalWords / stats.journalCount)}{" "}
                      words
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Session */}
            <div className={styles.glassCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}>Session</h2>
                <span className={styles.cardMeta}>Security</span>
              </div>
              <p className={styles.sessionText}>
                Manage your account security and active session.
              </p>
              <Button onClick={handleLogout} variant="secondary" fullWidth>
                Sign Out
              </Button>
            </div>

            {/* Danger zone */}
            <div className={`${styles.glassCard} ${styles.glassCardDanger}`}>
              <div className={styles.cardHeader}>
                <h2
                  className={styles.cardTitle}
                  style={{ color: "rgba(200, 90, 80, 0.75)" }}
                >
                  Danger Zone
                </h2>
              </div>
              <p className={styles.dangerText}>
                Deleting your account is permanent and cannot be undone.
              </p>
              <button
                onClick={handleDeleteAccount}
                className={styles.deleteBtn}
                aria-label="Permanently delete account"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
