import { apiClient } from './apiClient';

const JOURNAL_BASE = '/api/journal';

export const journalService = {
  /**
   * Fetch journal entries.
   * @param {number} skip - Offset
   * @param {number} limit - Count
   * @param {string} emotion - Filter
   */
  async listEntries(skip = 0, limit = 10, emotion = null) {
    const params = new URLSearchParams({ skip, limit });
    if (emotion) params.append('emotion', emotion);
    return apiClient.get(`${JOURNAL_BASE}/entries/?${params.toString()}`);
  },

  /**
   * Create entry.
   * @param {object} entry - Data
   */
  async createEntry(entry) {
    return apiClient.post(`${JOURNAL_BASE}/entries/`, entry);
  },

  /**
   * Get entry by ID.
   * @param {number} entryId - ID
   */
  async getEntry(entryId) {
    return apiClient.get(`${JOURNAL_BASE}/entries/${entryId}/`);
  },

  /**
   * Update a journal entry
   * @param {number} entryId - Journal entry ID
   * @param {object} updates - Partial entry object to update
   */
  async updateEntry(entryId, updates) {
    return apiClient.put(`${JOURNAL_BASE}/entries/${entryId}/`, updates);
  },

  /**
   * Delete a journal entry
   * @param {number} entryId - Journal entry ID
   */
  async deleteEntry(entryId) {
    return apiClient.delete(`${JOURNAL_BASE}/entries/${entryId}/`);
  },

  /**
   * Search journal entries by query
   * @param {string} query - Search term
   */
  async searchEntries(query) {
    const params = new URLSearchParams({ q: query });
    return apiClient.get(`${JOURNAL_BASE}/search/?${params.toString()}`);
  },
};

export const insightsService = {
  /**
   * Fetch emotion insights for past N days
   * @param {number} days - Number of days to analyze
   */
  async getInsights(days = 7) {
    const params = new URLSearchParams({ days });
    return apiClient.get(`/api/emotions/insights/?${params.toString()}`);
  },

  /**
   * Fetch recent emotion history
   * @param {number} limit - Max records to return
   */
  async getHistory(limit = 50) {
    const params = new URLSearchParams({ limit });
    return apiClient.get(`/api/emotions/history/?${params.toString()}`);
  },

  /**
   * Get emotion summary for a specific day
   * @param {string} date - ISO date string (YYYY-MM-DD)
   */
  async getDailySummary(date = null) {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    return apiClient.get(`/api/emotions/daily-summary/?${params.toString()}`);
  },
};
