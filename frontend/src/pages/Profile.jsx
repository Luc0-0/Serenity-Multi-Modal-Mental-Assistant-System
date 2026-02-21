import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { apiClient } from "../services/apiClient";
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
        console.warn("Insights unavailable, using defaults", insightErr);
      }

      try {
        const journalRes = await apiClient.get("/journal/entries/?limit=100");

        let totalWords = 0;
        if (journalRes.entries && Array.isArray(journalRes.entries)) {
          journalRes.entries.forEach((entry) => {
            const fullContent = entry.content || "";
            totalWords += fullContent
              .split(/\s+/)
              .filter((word) => word.length > 0).length;
          });
        }

        setStats((prev) => ({
          ...prev,
          journalWords: totalWords,
        }));
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
    if (!window.confirm("Are you sure? This action cannot be undone.")) {
      return;
    }

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

  const getEmotionColor = (emotion) => {
    const emotionColors = {
      joy: "#a8c5a0",
      sadness: "#d4a0a0",
      anger: "#c9a0a0",
      fear: "#b8a8c5",
      surprise: "#a8c5d4",
      disgust: "#c5b8a8",
      neutral: "#a8a8a8",
    };
    return emotionColors[emotion] || "#a8a8a8";
  };

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
    const commonProps = {
      width: 96,
      height: 96,
      viewBox: "0 0 64 64",
      role: "img",
      xmlns: "http://www.w3.org/2000/svg",
    };

    const icons = {
      joy: (
        <svg {...commonProps}>
          <title>Joy</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.12" />
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
        <svg {...commonProps}>
          <title>Sadness</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.08" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 22c2 6 10 6 14 0" strokeLinecap="round" />
            <path d="M24 34c0 4-4 6-6 8" strokeLinecap="round" />
            <path d="M40 34c0 4 4 6 6 8" strokeLinecap="round" />
            <circle cx="22" cy="20" r="2" fill={color} stroke="none" />
            <circle cx="42" cy="20" r="2" fill={color} stroke="none" />
          </g>
        </svg>
      ),
      anger: (
        <svg {...commonProps}>
          <title>Anger</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.08" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 24c6-6 22-6 28 0" strokeLinecap="round" />
            <path d="M20 40c6-4 20-4 28 0" strokeLinecap="round" />
            <path d="M22 18l6 6M42 18l-6 6" strokeLinecap="round" />
          </g>
        </svg>
      ),
      fear: (
        <svg {...commonProps}>
          <title>Fear</title>
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
        <svg {...commonProps}>
          <title>Surprise</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <circle cx="32" cy="28" r="6" />
            <path
              d="M32 12v-4M32 56v4M12 32h-4M56 32h4M18 18l-3-3M49 49l3 3M49 15l3-3M18 46l-3 3"
              strokeLinecap="round"
            />
          </g>
        </svg>
      ),
      disgust: (
        <svg {...commonProps}>
          <title>Disgust</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M18 28c6 6 22 6 28 0" strokeLinecap="round" />
            <path d="M22 22c2 0 6-4 10-4s8 4 10 4" strokeLinecap="round" />
            <path d="M24 38c4 2 12 2 16 0" strokeLinecap="round" />
          </g>
        </svg>
      ),
      neutral: (
        <svg {...commonProps}>
          <title>Neutral</title>
          <circle cx="32" cy="32" r="28" fill={color} opacity="0.06" />
          <g fill="none" stroke={color} strokeWidth="2">
            <path d="M22 36h20" strokeLinecap="round" />
            <circle cx="22" cy="24" r="2" fill={color} stroke="none" />
            <circle cx="42" cy="24" r="2" fill={color} stroke="none" />
          </g>
        </svg>
      ),
    };

    const svg = icons[emotion] || icons.neutral;

    return (
      <div className={styles.emotionIcon} style={{ borderColor: color }}>
        {svg}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />

      <main className={styles.content}>
        <div className={styles.headerSection}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatar}>
              {profile?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className={styles.userInfo}>
              <h1 className={styles.name}>{profile?.name || "User"}</h1>
              <p className={styles.memberSince}>
                Member since {stats.joinDate}
              </p>
            </div>
          </div>
        </div>

        <div className={styles.gridLayout}>
          <div className={styles.leftColumn}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Account Settings</h2>
              </div>

              {isEditing ? (
                <div className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) =>
                        setEditData({ ...editData, email: e.target.value })
                      }
                      className={styles.input}
                    />
                  </div>
                  <div className={styles.formActions}>
                    <Button onClick={handleSaveProfile} variant="primary">
                      Save Changes
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
                <div className={styles.accountInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Email</span>
                    <span className={styles.value}>{profile?.email}</span>
                  </div>
                  <div className={styles.infoRow}>
                    <span className={styles.label}>Account Status</span>
                    <span className={styles.value}>Active</span>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className={styles.editButton}
                  >
                    Edit Profile
                  </button>
                </div>
              )}
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Preferences</h2>
              </div>
              <div className={styles.preferencesList}>
                <div className={styles.preferencesItem}>
                  <span>Dark Theme</span>
                  <span className={styles.badge}>Active</span>
                </div>
                <div className={styles.preferencesItem}>
                  <span>Notifications</span>
                  <span className={styles.badge}>Enabled</span>
                </div>
                <div className={styles.preferencesItem}>
                  <span>Data Privacy</span>
                  <span className={styles.badge}>Secure</span>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Streaks & Milestones</h2>
              </div>
              <div className={styles.streakSection}>
                <div className={styles.streakCard}>
                  <div className={styles.streakNumber}>{stats.streak}</div>
                  <div className={styles.streakLabel}>Day Streak</div>
                  <p className={styles.streakText}>Keep the momentum going!</p>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.rightColumn}>
            <div
              className={styles.card}
              onClick={
                emotionData?.total_logs > 0 ? () => navigate("/insights") : null
              }
              style={{
                cursor: emotionData?.total_logs > 0 ? "pointer" : "default",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                if (emotionData?.total_logs > 0) {
                  const light =
                    e.currentTarget.querySelector(`[data-light="true"]`);
                  if (light) light.style.opacity = "1";
                }
              }}
              onMouseLeave={(e) => {
                if (emotionData?.total_logs > 0) {
                  const light =
                    e.currentTarget.querySelector(`[data-light="true"]`);
                  if (light) light.style.opacity = "0";
                }
              }}
            >
              <div
                data-light="true"
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  background:
                    "radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, transparent 70%)",
                  opacity: 0,
                  transition: "opacity 0.4s ease",
                  pointerEvents: "none",
                }}
              />

              <div className={styles.cardHeader}>
                <h2>Wellness Summary</h2>
              </div>
              <div className={styles.wellnessSummary}>
                <div className={styles.emotionSection}>
                  <div className={styles.emotionDisplay}>
                    <EmotionIcon
                      emotion={stats.dominantEmotion}
                      color={getEmotionColor(stats.dominantEmotion)}
                    />
                    <div className={styles.emotionInfo}>
                      <h3>
                        {stats.dominantEmotion.charAt(0).toUpperCase() +
                          stats.dominantEmotion.slice(1)}
                      </h3>
                      <p>
                        {emotionData?.total_logs > 0 ? (
                          <>
                            {stats.dominancePct}% this week • This week's
                            dominant emotion
                          </>
                        ) : (
                          "Start logging emotions in Check-in to see insights"
                        )}
                      </p>
                    </div>
                  </div>

                  <div className={styles.trendSection}>
                    <div className={styles.trendItem}>
                      <span className={styles.trendLabel}>Trend</span>
                      <span
                        className={styles.trendValue}
                        style={{
                          color: getEmotionColor(stats.dominantEmotion),
                        }}
                      >
                        {getTrendIcon(stats.emotionTrend)}
                      </span>
                    </div>
                    <div className={styles.trendItem}>
                      <span className={styles.trendLabel}>Status</span>
                      <span className={styles.trendStatus}>
                        {getTrendLabel(stats.emotionTrend)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.statsSection}>
              <h3 className={styles.statsTitle}>Activity</h3>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>
                    {stats.conversationCount}
                  </div>
                  <div className={styles.statLabel}>Conversations</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{stats.journalCount}</div>
                  <div className={styles.statLabel}>Entries</div>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Journal Insights</h2>
              </div>
              <div className={styles.journalStats}>
                <div className={styles.journalStat}>
                  <span className={styles.journalLabel}>Words Written</span>
                  <span className={styles.journalValue}>
                    {stats.journalWords.toLocaleString()}
                  </span>
                </div>
                <div className={styles.journalStat}>
                  <span className={styles.journalLabel}>Entries</span>
                  <span className={styles.journalValue}>
                    {stats.journalCount}
                  </span>
                </div>
                {stats.journalCount > 0 && (
                  <div className={styles.journalStat}>
                    <span className={styles.journalLabel}>Avg Words/Entry</span>
                    <span className={styles.journalValue}>
                      {Math.round(stats.journalWords / stats.journalCount)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h2>Session</h2>
              </div>
              <div className={styles.sessionInfo}>
                <p className={styles.sessionText}>
                  Manage your account security and session.
                </p>
                <div className={styles.sessionActions}>
                  <Button onClick={handleLogout} variant="secondary" fullWidth>
                    Logout
                  </Button>
                </div>
              </div>
            </div>

            <div className={styles.card + " " + styles.dangerCard}>
              <div className={styles.cardHeader}>
                <h2>Danger Zone</h2>
              </div>
              <div className={styles.dangerInfo}>
                <p className={styles.warningText}>
                  Once you delete your account, there is no going back.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  className={styles.deleteButton}
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;
