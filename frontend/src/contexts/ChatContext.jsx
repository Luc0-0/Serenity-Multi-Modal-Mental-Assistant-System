import React, { createContext, useState, useCallback, useEffect } from 'react';
import { sendChatMessage } from '../services/api';
import {
  saveConversationId,
  getConversationId,
  saveUserId,
  getUserId,
  saveMessageToHistory,
  getConversationHistory,
  clearConversationData,
  isSessionStale,
} from '../services/storage';

export const ChatContext = createContext();

const initialState = {
  // Conversation data
  conversationId: null,
  userId: 1, // Default user ID (would come from login in production)
  messages: [],

  // UI state
  isLoading: false,
  error: null,
  isRetryable: false,

  // Emotional data from backend
  emotionalInsight: null,
  crisisDetected: false,

  // Message metadata
  lastMessageTimestamp: null,
};

export const ChatProvider = ({ children }) => {
  const [state, setState] = useState(initialState);
  const [sessionInitialized, setSessionInitialized] = useState(false);

  // Restore session
  useEffect(() => {
    const initializeSession = () => {
      const storedConversationId = getConversationId();
      const storedUserId = getUserId();
      const storedHistory = getConversationHistory();
      const stale = isSessionStale();

      // If session is stale, start fresh
      if (stale) {
        clearConversationData();
        setState(initialState);
      } else if (storedConversationId && storedUserId) {
        // Restore from storage
        setState((prev) => ({
          ...prev,
          conversationId: storedConversationId,
          userId: storedUserId,
          messages: storedHistory.length > 0 ? storedHistory : [],
        }));
      }

      setSessionInitialized(true);
    };

    initializeSession();
  }, []);

  const sendMessage = useCallback(
    async (messageText) => {
      // Validate input
      if (!messageText || typeof messageText !== 'string') {
        setState((prev) => ({
          ...prev,
          error: 'Invalid message',
          isRetryable: false,
        }));
        return;
      }

      const trimmed = messageText.trim();
      if (!trimmed) {
        setState((prev) => ({
          ...prev,
          error: 'Message cannot be empty',
          isRetryable: false,
        }));
        return;
      }

      // Add user message to UI immediately
      const userMessage = {
        id: Date.now(),
        sender: 'user',
        text: trimmed,
        timestamp: new Date(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
        isLoading: true,
        error: null,
      }));

      // Save to storage
      saveMessageToHistory(userMessage);

      try {
        // Call backend API
        const response = await sendChatMessage({
          user_id: state.userId,
          message: trimmed,
          conversation_id: state.conversationId, // null for new, or existing ID
        });

        // Update conversation ID if this was the first message
        if (state.conversationId === null) {
          setState((prev) => ({
            ...prev,
            conversationId: response.conversation_id,
            crisisDetected: response.crisis_detected || false,
          }));
          saveConversationId(response.conversation_id);
          saveUserId(state.userId);
        }

        // Add assistant message
        const assistantMessage = {
          id: response.message_id || Date.now() + 1,
          sender: 'assistant',
          text: response.reply,
          timestamp: new Date(),
          crisis: response.crisis_detected ? {
            detected: true,
            severity: response.crisis_severity,
            resources: response.resources,
          } : null,
        };

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, assistantMessage],
          isLoading: false,
          error: null,
          crisisDetected: response.crisis_detected || false,
          lastMessageTimestamp: new Date(),
        }));

        // Save to storage
        saveMessageToHistory(assistantMessage);

        return response;
      } catch (error) {
        // Format error for display
        const errorMessage = error.message || 'Failed to send message';
        const isRetryable = error.retryable !== false; // Default to retryable

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          isRetryable: isRetryable,
        }));

        // Log for debugging
        console.error('Chat error:', {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        });

        throw error;
      }
    },
    [state.userId, state.conversationId]
  );

  /**
   * Retry failed message.
   */
  const retryLastMessage = useCallback(async () => {
    if (!state.error || !state.isRetryable) return;

    // Remove error state
    setState((prev) => ({
      ...prev,
      error: null,
      isRetryable: false,
    }));

    // Resend the last user message
    const lastUserMessage = [...state.messages]
      .reverse()
      .find((msg) => msg.sender === 'user');

    if (lastUserMessage) {
      try {
        await sendMessage(lastUserMessage.text);
      } catch (error) {
        // Error already handled in sendMessage
      }
    }
  }, [state.error, state.isRetryable, state.messages, sendMessage]);

  /**
   * Reset conversation.
   */
  const startNewConversation = useCallback(() => {
    clearConversationData();
    setState(initialState);
    setSessionInitialized(true);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      isRetryable: false,
    }));
  }, []);

  /**
   * Update emotional state.
   */
  const setEmotionalInsight = useCallback((insight) => {
    setState((prev) => ({
      ...prev,
      emotionalInsight: insight,
    }));
  }, []);

  const contextValue = {
    // State
    state,

    // Actions
    sendMessage,
    retryLastMessage,
    startNewConversation,
    clearError,
    setEmotionalInsight,

    // Computed
    hasMessages: state.messages.length > 0,
    isNewConversation: state.conversationId === null,
    sessionInitialized,
  };

  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};

/**
 * Chat hook.
 */
export const useChat = () => {
  const context = React.useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
};
