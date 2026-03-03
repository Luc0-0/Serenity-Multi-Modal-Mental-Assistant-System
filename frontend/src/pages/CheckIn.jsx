import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useChat } from '../contexts/ChatContext';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CrisisAlert } from '../components/CrisisAlert';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { MiniEmotionGraph } from '../components/MiniEmotionGraph';
import { EmotionalStatusCard } from '../components/EmotionalStatusCard';
import { sendChatMessage, getErrorDisplay } from '../services/api';
import { fetchEmotionInsights } from '../services/emotionService';
import styles from './CheckIn.module.css';

export function CheckIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState(null);
  const userId = user?.id || null; // Don't use useState - use direct value from auth context

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const [isInChat, setIsInChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  const [showInsights, setShowInsights] = useState(true);
  const [emotionData, setEmotionData] = useState(null);
  const [emotionLoading, setEmotionLoading] = useState(false);
  const [insightsExpanded, setInsightsExpanded] = useState(true);

  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  // Fetch emotions
  useEffect(() => {
    if (conversationId && isInChat && messages.length > 0) {
      const fetchEmotions = async () => {
        setEmotionLoading(true);
        try {
          const data = await fetchEmotionInsights(userId, 7);
          setEmotionData(data);
        } catch (err) {
          console.warn("Failed to fetch emotion insights:", err.message);
          // Silently fail - emotion data is nice-to-have
        } finally {
          setEmotionLoading(false);
        }
      };

      const debounceTimer = setTimeout(fetchEmotions, 2000);
      return () => clearTimeout(debounceTimer);
    }
  }, [conversationId, messages.length, isInChat, userId]);

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayTextStream = (messageIndex, fullText, delay = 3) => {
    let charIndex = 0;

    const displayNextChar = () => {
      if (charIndex < fullText.length) {
        setMessages((prev) => {
          if (!prev[messageIndex]) return prev; // Safety check: message might have been cleared
          const updated = [...prev];
          updated[messageIndex].text = fullText.slice(0, charIndex + 1);
          return updated;
        });
        charIndex++;
        setTimeout(displayNextChar, delay);
      }
    };

    displayNextChar();
  };

  const handleSendMessage = async () => {
    // Auth check
    if (!userId) {
      setError("You must be logged in to send messages.");
      navigate('/login');
      return;
    }

    const trimmedMessage = inputValue.trim();

    if (!trimmedMessage) {
      setError("Please write something before sending.");
      return;
    }

    if (trimmedMessage.length > 2000) {
      setError("Message is too long. Please keep it under 2000 characters.");
      return;
    }

    setError(null);

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text: trimmedMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    if (!isInChat) {
      setIsInChat(true);
    }

    const assistantMessageIndex = messages.length + 1;
    const assistantMessage = {
      id: Date.now() + 1,
      sender: "assistant",
      text: "",
      timestamp: new Date(),
      crisis: null,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const response = await sendChatMessage({
        user_id: userId,
        message: trimmedMessage,
        conversation_id: conversationId,
      });

      if (conversationId === null && response.conversation_id) {
        setConversationId(response.conversation_id);
        try {
          localStorage.setItem(
            "serenity_conversation_id",
            response.conversation_id.toString(),
          );
          localStorage.setItem("serenity_user_id", userId.toString());
        } catch (e) {
          console.warn("Failed to save to localStorage:", e.message);
        }
      }

      displayTextStream(assistantMessageIndex, response.reply);

      if (response.crisis_detected) {
        setTimeout(() => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[assistantMessageIndex].crisis = {
              detected: true,
              severity: response.crisis_severity,
              resources: response.resources,
            };
            return updated;
          });
        }, response.reply.length * 30);
      }

      setTimeout(() => {
        setIsLoading(false);
      }, response.reply.length * 30);
    } catch (err) {
      setIsLoading(false);
      setLastFailedMessage(trimmedMessage);

      const errorDisplay = getErrorDisplay(err);
      setError(errorDisplay.message);
      setIsRetryable(errorDisplay.isRetryable);

      console.error("Chat error:", {
        code: err.code,
        message: err.message,
        retryable: err.retryable,
      });
    }
  };

  const handleRetry = () => {
    if (!lastFailedMessage || !isRetryable) return;
    setError(null);
    setIsRetryable(false);
    setInputValue(lastFailedMessage);
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInputValue("");
    setIsInChat(false);
    setError(null);
    setIsRetryable(false);
    localStorage.removeItem("serenity_conversation_id");
  };

  const handleSelectConversation = async (convId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(
        `/api/conversations/${convId}/messages`,
        { headers },
      );
      if (response.ok) {
        const data = await response.json();
        setConversationId(convId);
        setMessages(
          data.messages.map((msg) => ({
            id: msg.id,
            sender: msg.role === "assistant" ? "assistant" : "user",
            text: msg.content,
            timestamp: new Date(msg.created_at),
          })),
        );
        setIsInChat(true);
        localStorage.setItem("serenity_conversation_id", convId.toString());
      }
    } catch (err) {
      console.error("Failed to load conversation:", err);
    }
  };

  const handleClearError = () => {
    setError(null);
    setIsRetryable(false);
  };

  return (
    <div className={`${styles.container} ${isInChat ? styles.chatMode : ""}`}>
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        userId={userId}
      />

      <div className={styles.backgroundImage} />



      {!isInChat && (
        <main className={styles.content}>
          <h1 className={styles.welcomeHeading}>Welcome.</h1>

          <p className={styles.subtitle}>
            You can talk, write, or just sit here.
          </p>

          <div className={styles.inputWrapper}>
            <div className={styles.inputContainer}>
              <input
                ref={inputRef}
                type="text"
                placeholder="What's on your mind?"
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={styles.input}
                aria-label="Express your thoughts"
                disabled={isLoading}
              />
              <button
                className={styles.submitArrow}
                onClick={handleSendMessage}
                aria-label="Send message"
                disabled={isLoading || !inputValue.trim()}
              >
                →
              </button>
            </div>

            <button
              className={styles.micButton}
              onClick={() => console.log("Voice coming soon")}
              aria-label="Voice input (coming soon)"
              title="Voice input"
              disabled
            >
              <svg
                className={styles.micIcon}
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a4 4 0 0 0-4 4v4a4 4 0 0 0 8 0V6a4 4 0 0 0-4-4Z" />
                <line x1="12" y1="14" x2="12" y2="20" />
                <line x1="8" y1="20" x2="16" y2="20" />
              </svg>
            </button>
          </div>

          <div className={styles.actionButtons}>
            <button
              className={styles.actionBtn}
              onClick={() => navigate('/journal')}
              aria-label="Open journal"
            >
              Journal
            </button>
            <button
              className={styles.actionBtn}
              onClick={() => console.log("Meditate")}
              aria-label="Meditation"
            >
              Meditate
            </button>
          </div>
        </main>
      )}

      {isInChat && (
        <main className={styles.chatContainer}>
          <div className={styles.chatContentWrapper}>
            <div className={styles.messagesArea}>
              {messages.length === 0 && (
                <div className={styles.emptyState}>
                  <p>Start your conversation when you're ready.</p>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.message} ${styles[msg.sender]}`}
                >
                  <div className={styles.messageContent}>
                    {msg.sender === 'assistant' ? (
                      <ReactMarkdown
                        components={{
                          strong: ({ node, ...props }) => <strong style={{ fontWeight: 600, color: '#d4a574' }} {...props} />,
                          em: ({ node, ...props }) => <em style={{ fontStyle: 'italic', opacity: 0.9 }} {...props} />,
                          p: ({ node, ...props }) => <span {...props} />
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    ) : (
                      msg.text
                    )}
                  </div>

                  {msg.crisis && msg.crisis.detected && (
                    <CrisisAlert
                      severity={msg.crisis.severity}
                      resources={msg.crisis.resources}
                    />
                  )}
                </div>
              ))}

              {isLoading && (
                <div className={`${styles.message} ${styles.ai}`}>
                  <div className={styles.messageContent}>
                    <LoadingSpinner />
                  </div>
                </div>
              )}

              {error && (
                <div className={styles.errorMessage}>
                  <div className={styles.errorContent}>
                    <p className={styles.errorText}>{error}</p>
                    {isRetryable && (
                      <button className={styles.retryBtn} onClick={handleRetry}>
                        Retry
                      </button>
                    )}
                    <button
                      className={styles.dismissBtn}
                      onClick={handleClearError}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {showInsights ? (
              <aside className={styles.insightsPanel}>
                <EmotionalStatusCard
                  emotionData={emotionData}
                  isLoading={emotionLoading}
                  onClose={() => setShowInsights(false)}
                />
              </aside>
            ) : (
              <button
                className={styles.reopenInsightsBtn}
                onClick={() => setShowInsights(true)}
                title="Show Insights"
              >
                ᐊ
              </button>
            )}
          </div>

          <div className={styles.chatInputArea}>
            <div className={styles.chatInputContainer}>
              <input
                type="text"
                placeholder="You can talk freely here..."
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                className={styles.chatInput}
                aria-label="Send message"
                disabled={isLoading}
              />
              <button
                className={styles.chatSubmitBtn}
                onClick={handleSendMessage}
                aria-label="Send message"
                disabled={isLoading || !inputValue.trim()}
              >
                →
              </button>
            </div>

            {isInChat && (
              <button
                className={styles.newConversationBtn}
                onClick={handleNewConversation}
              >
                New Conversation
              </button>
            )}
          </div>
        </main>
      )}

      {!isInChat && (
        <footer className={styles.footer}>
          <p className={styles.disclaimer}>
            Your space to reflect. Not a substitute for professional care.
          </p>
        </footer>
      )}
    </div>
  );
}

export default CheckIn;
