/**
 * EMOTION ANALYTICS SERVICE.
 * Fetch insights and trends.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const TIMEOUT_MS = 10000;

/**
 * Validate emotion response.
 */
const validateEmotionResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid emotion response: expected object');
  }

  if (!data.detected_emotions || typeof data.detected_emotions !== 'object') {
    throw new Error('Invalid emotion response: missing detected_emotions');
  }

  return data;
};

/**
 * Fetch emotion insights.
 * @param {number} userId - User ID
 * @param {number} days - Duration
 */
export const fetchEmotionInsights = async (userId, days = 7) => {
  try {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}/api/emotions/insights/?days=${days}`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized - please log in again');
      }
      if (response.status === 404) {
        // No emotion data yet - this is OK
        return null;
      }
      throw new Error(`HTTP ${response.status}: Failed to fetch emotion insights`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Emotion insights fetch error:', error);
    throw error;
  }
};

/**
 * Fetch latest emotion snapshot.
 * @param {number} userId - User ID
 */
export const fetchMiniEmotionSnapshot = async (userId) => {
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid user ID');
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/emotions/mini/?user_id=${userId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`HTTP ${response.status}: Failed to fetch mini snapshot`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Mini snapshot fetch error:', error);
    throw error;
  }
};

/**
 * Fetch emotion history.
 * @param {number} userId - User ID
 * @param {string} timeRange - Range
 */
export const fetchEmotionHistory = async (userId, timeRange = '7d') => {
  if (!userId || !Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid user ID');
  }

  const validRanges = ['7d', '30d', 'all'];
  if (!validRanges.includes(timeRange)) {
    throw new Error(`Invalid time range: ${timeRange}`);
  }

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/emotions/history/?user_id=${userId}&range=${timeRange}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`HTTP ${response.status}: Failed to fetch emotion history`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.data || [];
  } catch (error) {
    console.error('Emotion history fetch error:', error);
    throw error;
  }
};

/**
 * Parse emotion scores.
 * @param {object} detectedEmotions - Raw scores
 */
export const parseEmotionData = (detectedEmotions) => {
  if (!detectedEmotions || typeof detectedEmotions !== 'object') {
    return {
      primaryEmotion: null,
      primaryScore: 0,
      allEmotions: {},
    };
  }

  const entries = Object.entries(detectedEmotions).map(([emotion, score]) => ({
    emotion,
    score: Math.max(0, Math.min(1, score)), // Clamp 0-1
  }));

  entries.sort((a, b) => b.score - a.score);

  const primary = entries[0] || { emotion: null, score: 0 };

  return {
    primaryEmotion: primary.emotion,
    primaryScore: primary.score,
    allEmotions: Object.fromEntries(
      entries.map(({ emotion, score }) => [emotion, score])
    ),
  };
};

/**
 * Canonical emotion color palette for the app.
 * Use these for all emotion-based visuals to keep the system consistent.
 */
export const EMOTION_COLORS = {
  joy: '#c4a882',          // warm cream/gold
  sadness: '#6b7f8e',      // muted slate blue
  anger: '#9e6b6b',        // muted mauve/burgundy
  anxiety: '#b8956a',      // warm tan
  fear: '#8b7ba8',         // soft muted purple
  surprise: '#7a9e8b',     // soft sage/teal
  disgust: '#8b9570',      // muted olive
  trust: '#a8b89a',        // soft sage cream
  anticipation: '#7a9eb5', // muted teal
  neutral: '#8a8a7e',      // warm taupe gray
};

/**
 * Get visualization color.
 * @param {string} emotion - Label
 * @param {number} score - Intensity (reserved for future tuning)
 */
export const getEmotionColor = (emotion, score = 0.5) => {
  return EMOTION_COLORS[emotion] || '#9a9a8e';
};

/**
 * Format emotion label for display
 * @param {string} emotion - Emotion name
 * @returns {string} Formatted emotion label
 */
export const formatEmotionLabel = (emotion) => {
  return emotion
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * specific stability status.
 * @param {number} volatility - Score
 */
export const determineStability = (volatility) => {
  if (volatility < 0.3) return 'stable';
  if (volatility < 0.7) return 'moderate';
  return 'unstable';
};
