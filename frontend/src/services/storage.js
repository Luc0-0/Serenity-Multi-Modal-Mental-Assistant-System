/**
 * Local Storage Service.
 * Persists conversation and user data.
 */

const STORAGE_KEYS = {
  CONVERSATION_ID: 'serenity_conversation_id',
  USER_ID: 'serenity_user_id',
  CONVERSATION_HISTORY: 'serenity_conversation_history',
  LAST_ACCESSED: 'serenity_last_accessed',
};

/**
 * Check storage availability.
 * @returns {boolean}
 */
const isStorageAvailable = () => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Save conversation ID.
 * @param {number} conversationId - ID
 */
export const saveConversationId = (conversationId) => {
  if (!isStorageAvailable()) return;
  if (!conversationId || !Number.isInteger(conversationId)) return;

  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_ID, conversationId.toString());
    localStorage.setItem(STORAGE_KEYS.LAST_ACCESSED, new Date().toISOString());
  } catch (e) {
    console.warn('Failed to save conversation ID to storage:', e.message);
  }
};

/**
 * Retrieve conversation ID.
 * @returns {number|null}
 */
export const getConversationId = () => {
  if (!isStorageAvailable()) return null;

  try {
    const id = localStorage.getItem(STORAGE_KEYS.CONVERSATION_ID);
    return id ? parseInt(id, 10) : null;
  } catch (e) {
    console.warn('Failed to retrieve conversation ID from storage:', e.message);
    return null;
  }
};

/**
 * Save user ID.
 * @param {number} userId - ID
 */
export const saveUserId = (userId) => {
  if (!isStorageAvailable()) return;
  if (!userId || !Number.isInteger(userId)) return;

  try {
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId.toString());
  } catch (e) {
    console.warn('Failed to save user ID to storage:', e.message);
  }
};

/**
 * Get saved user ID
 * @returns {number|null}
 */
export const getUserId = () => {
  if (!isStorageAvailable()) return null;

  try {
    const id = localStorage.getItem(STORAGE_KEYS.USER_ID);
    return id ? parseInt(id, 10) : null;
  } catch (e) {
    console.warn('Failed to retrieve user ID from storage:', e.message);
    return null;
  }
};

/**
 * Archive message.
 * @param {object} message - payload
 */
export const saveMessageToHistory = (message) => {
  if (!isStorageAvailable()) return;

  try {
    const history = getConversationHistory();
    history.push({
      ...message,
      savedAt: new Date().toISOString(),
    });
    localStorage.setItem(STORAGE_KEYS.CONVERSATION_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save message to history:', e.message);
  }
};

/**
 * Retrieve message history.
 * @returns {array} messages
 */
export const getConversationHistory = () => {
  if (!isStorageAvailable()) return [];

  try {
    const history = localStorage.getItem(STORAGE_KEYS.CONVERSATION_HISTORY);
    return history ? JSON.parse(history) : [];
  } catch (e) {
    console.warn('Failed to retrieve conversation history:', e.message);
    return [];
  }
};

/**
 * Clear all conversation data (on new conversation)
 */
export const clearConversationData = () => {
  if (!isStorageAvailable()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_ID);
    localStorage.removeItem(STORAGE_KEYS.CONVERSATION_HISTORY);
  } catch (e) {
    console.warn('Failed to clear conversation data:', e.message);
  }
};

/**
 * Check session staleness (>1hr).
 * @returns {boolean}
 */
export const isSessionStale = () => {
  if (!isStorageAvailable()) return false;

  try {
    const lastAccessed = localStorage.getItem(STORAGE_KEYS.LAST_ACCESSED);
    if (!lastAccessed) return false;

    const lastTime = new Date(lastAccessed).getTime();
    const now = new Date().getTime();
    const oneHour = 60 * 60 * 1000;

    return now - lastTime > oneHour;
  } catch (e) {
    console.warn('Failed to check session staleness:', e.message);
    return false;
  }
};

/**
 * Export all session data (for debugging)
 * @returns {object}
 */
export const debugGetSessionData = () => {
  if (!isStorageAvailable()) return { available: false };

  try {
    return {
      available: true,
      conversationId: getConversationId(),
      userId: getUserId(),
      messageCount: getConversationHistory().length,
      lastAccessed: localStorage.getItem(STORAGE_KEYS.LAST_ACCESSED),
      isStale: isSessionStale(),
    };
  } catch (e) {
    return { available: false, error: e.message };
  }
};
