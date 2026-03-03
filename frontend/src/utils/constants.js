export const COLORS = {
  background: '#0E0E11',
  gold: '#D4AF37',
  dark: '#1a1a1f',
  light: '#ffffff',
  textSecondary: '#b0b0b0',
};

export const EMOTIONS = {
  happy: { icon: '😊', color: '#FFD700' },
  sad: { icon: '😢', color: '#4169E1' },
  anxious: { icon: '😰', color: '#FF6347' },
  calm: { icon: '😌', color: '#98FB98' },
  angry: { icon: '😠', color: '#DC143C' },
  neutral: { icon: '😐', color: '#A9A9A9' },
};

const API_BASE = import.meta.env.VITE_API_URL || '';

export const API_ENDPOINTS = {
  CHAT: `${API_BASE}/api/chat/`,
  CHAT_STREAM: `${API_BASE}/api/chat/stream/`,
  LOGIN: `${API_BASE}/api/auth/login/`,
  SIGNUP: `${API_BASE}/api/auth/signup/`,
  PROFILE: `${API_BASE}/api/auth/profile/`,
  JOURNAL: `${API_BASE}/api/journal/`,
  EMOTIONS: `${API_BASE}/api/emotions/`,
  HEALTH: `${API_BASE}/api/health/`,
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  VALIDATION_ERROR: 'Invalid input. Please check and try again.',
};

export const ANIMATION_DURATION = {
  SHORT: 200,
  MEDIUM: 300,
  LONG: 500,
};
