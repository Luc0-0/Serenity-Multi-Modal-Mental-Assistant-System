import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiClient } from '../services/apiClient';
import { Button } from '../components/Button';
import styles from './Profile.module.css';

export function Profile() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { success, error } = useNotification();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [stats, setStats] = useState({
    conversationCount: 0,
    journalCount: 0,
    joinDate: new Date().toLocaleDateString(),
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get('/auth/profile/');
        setProfile(data.user);
        setEditData({ name: data.user.name, email: data.user.email });
        setStats({
          conversationCount: data.stats?.conversations || 0,
          journalCount: data.stats?.journal_entries || 0,
          joinDate: new Date(data.user.created_at).toLocaleDateString(),
        });
      } catch (err) {
        error('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [error]);

  const handleSaveProfile = async () => {
    try {
      const updated = await apiClient.put('/auth/profile/', editData);
      setProfile(updated.user);
      setIsEditing(false);
      success('Profile updated successfully');
    } catch (err) {
      error('Failed to update profile');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        'Are you sure? This action cannot be undone.'
      )
    ) {
      return;
    }

    try {
      await apiClient.delete('/auth/profile/');
      logout();
      navigate('/');
      success('Account deleted');
    } catch (err) {
      error('Failed to delete account');
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading profile...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.backgroundImage} />
      <header className={styles.header}>
        <h1>Profile</h1>
      </header>

      <div className={styles.content}>
        <div className={styles.profileCard}>
          <div className={styles.avatar}>
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>

          {isEditing ? (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label>Name</label>
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
                <label>Email</label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                  className={styles.input}
                />
              </div>
              <div className={styles.buttonGroup}>
                <Button onClick={handleSaveProfile} fullWidth>
                  Save Changes
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                  fullWidth
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.profileInfo}>
              <h2>{profile?.name}</h2>
              <p className={styles.email}>{profile?.email}</p>
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            </div>
          )}
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.conversationCount}</div>
            <div className={styles.statLabel}>Conversations</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.journalCount}</div>
            <div className={styles.statLabel}>Journal Entries</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.joinDate}</div>
            <div className={styles.statLabel}>Member Since</div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={handleLogout}
            style={{ borderColor: "#d4af37", color: "#d4af37" }}
            fullWidth
          >
            Logout
          </Button>
          <Button
            variant="ghost"
            onClick={handleDeleteAccount}
            style={{ color: "#f44336", marginTop: "8px" }}
            fullWidth
          >
            Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}
