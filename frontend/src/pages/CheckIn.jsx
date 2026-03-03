import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";
import { useConversationRefresh } from "../contexts/ConversationRefreshContext";
import { CrisisAlert } from "../components/CrisisAlert";
import { SerenityDeck } from "../components/SerenityDeck";
import { EmotionalStatusCard } from "../components/EmotionalStatusCard";
import { CopyButton } from "../components/CopyButton";
import { AnimatedTooltip } from "../components/AnimatedTooltip";
import { sendChatMessage, getErrorDisplay } from "../services/api";
import { fetchEmotionInsights } from "../services/emotionService";
import styles from "./CheckIn.module.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function CheckIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { triggerRefresh } = useConversationRefresh();
  const [conversationId, setConversationId] = useState(null);
  const userId = user?.id || null;

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");

  const [isInChat, setIsInChat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [isRetryable, setIsRetryable] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState(null);

  const [showInsights, setShowInsights] = useState(true);

  // NEW: State for the pinned deck layout shift
  const [isDeckPinned, setIsDeckPinned] = useState(false);

  const [emotionData, setEmotionData] = useState(null);
  const [emotionLoading, setEmotionLoading] = useState(false);

  const inputRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const streamingRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isInChat && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 300);
    }
  }, [isInChat]);

  useEffect(() => {
    if (conversationId && isInChat && messages.length > 0) {
      const fetchEmotions = async () => {
        setEmotionLoading(true);
        try {
          const data = await fetchEmotionInsights(userId, 7);
          setEmotionData(data);
        } catch (err) {
          console.warn("Failed to fetch emotion insights:", err.message);
        } finally {
          setEmotionLoading(false);
        }
      };
      const debounceTimer = setTimeout(fetchEmotions, 2000);
      return () => clearTimeout(debounceTimer);
    }
  }, [conversationId, messages.length, isInChat, userId]);

  const handleInputChange = (e) => setInputValue(e.target.value);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const displayTextStream = useCallback((messageIndex, fullText) => {
    if (streamingRef.current) clearTimeout(streamingRef.current);
    setIsStreaming(true);
    let charIndex = 0;
    const charsPerTick = 2;
    const delay = 18;

    const displayNextChunk = () => {
      if (charIndex < fullText.length) {
        charIndex = Math.min(charIndex + charsPerTick, fullText.length);
        const currentText = fullText.slice(0, charIndex);
        setMessages((prev) => {
          if (!prev[messageIndex]) return prev;
          const updated = [...prev];
          updated[messageIndex] = {
            ...updated[messageIndex],
            text: currentText,
            isTyping: false,
          };
          return updated;
        });
        streamingRef.current = setTimeout(displayNextChunk, delay);
      } else {
        setIsStreaming(false);
        setIsLoading(false);
      }
    };
    displayNextChunk();
  }, []);

  const handleSendMessage = async () => {
    if (!userId) {
      setError("You must be logged in to send messages.");
      navigate("/login");
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
    if (!isInChat) setIsInChat(true);

    const assistantMessageIndex = messages.length + 1;
    const assistantMessage = {
      id: Date.now() + 1,
      sender: "assistant",
      text: "",
      timestamp: new Date(),
      crisis: null,
      isTyping: true,
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
        triggerRefresh();
      }

      displayTextStream(assistantMessageIndex, response.reply);

      if (response.crisis_detected) {
        const streamDuration = (response.reply.length / 2) * 18;
        setTimeout(() => {
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[assistantMessageIndex]) {
              updated[assistantMessageIndex] = {
                ...updated[assistantMessageIndex],
                crisis: {
                  detected: true,
                  severity: response.crisis_severity,
                  resources: response.resources,
                },
              };
            }
            return updated;
          });
        }, streamDuration + 500);
      }
    } catch (err) {
      setIsLoading(false);
      setIsStreaming(false);
      setLastFailedMessage(trimmedMessage);
      const errorDisplay = getErrorDisplay(err);
      setError(errorDisplay.message);
      setIsRetryable(errorDisplay.isRetryable);
      setMessages((prev) => prev.filter((_, i) => i !== assistantMessageIndex));
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

  const finalizeAndReset = useCallback(
    (convId, msgCount) => {
      if (streamingRef.current) clearTimeout(streamingRef.current);
      setConversationId(null);
      setMessages([]);
      setInputValue("");
      setIsInChat(false);
      setIsLoading(false);
      setIsStreaming(false);
      setError(null);
      setIsRetryable(false);
      localStorage.removeItem("serenity_conversation_id");

      if (convId && msgCount > 1) {
        const token = localStorage.getItem("auth_token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;
        fetch(`${API_BASE_URL}/api/conversations/${convId}/finalize-title`, {
          method: "POST",
          headers,
        })
          .then(() => triggerRefresh())
          .catch((err) => {
            console.warn("Failed to finalize title:", err);
            triggerRefresh();
          });
      } else {
        triggerRefresh();
      }
    },
    [triggerRefresh],
  );

  const handleNewConversation = useCallback(() => {
    finalizeAndReset(conversationId, messages.length);
  }, [finalizeAndReset, conversationId, messages.length]);

  const handleGoHome = useCallback(() => {
    finalizeAndReset(conversationId, messages.length);
  }, [finalizeAndReset, conversationId, messages.length]);

  const handleSelectConversation = async (convId) => {
    try {
      if (streamingRef.current) clearTimeout(streamingRef.current);
      const token = localStorage.getItem("auth_token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${convId}/messages`,
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
        setIsLoading(false);
        setIsStreaming(false);
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

  useEffect(() => {
    return () => {
      if (streamingRef.current) clearTimeout(streamingRef.current);
    };
  }, []);

  return (
    <>
      {/* ── New Serenity Deck Component ── */}
      <SerenityDeck
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        userId={userId}
        onPinChange={setIsDeckPinned}
      />

      {/* ── Main Container with Dynamic Margin for Pinning ── */}
      <div
        className={`${styles.container} ${isInChat ? styles.chatMode : ""}`}
        style={{
          marginLeft: isDeckPinned ? "280px" : "0",
          width: isDeckPinned ? "calc(100% - 280px)" : "100%",
          transition: "all 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Background — no inline filter ever */}
        <div className={styles.backgroundImage} />

        {/* ── Welcome screen with glowing orb ── */}
        {!isInChat && (
          <main className={styles.content}>
            {/* The orb container holds the spinning ring + glass interior */}
            <div className={styles.orbContainer}>
              {/* Base dim ring */}
              <div className={styles.orbRingBase} />
              {/* Spinning conic bright arc */}
              <div className={styles.orbRing} />
              {/* Glass interior */}
              <div className={styles.orb}>
                <div className={styles.orbContent}>
                  <h1 className={styles.welcomeHeading}>Welcome.</h1>

                  <p className={styles.subtitle}>
                    You can talk, write, or just sit here.
                  </p>

                  {/* Ornamental divider line */}
                  <div className={styles.orbDivider} />

                  <div className={styles.inputWrapper}>
                    <div className={styles.inputContainer}>
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="What's on your mind?"
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        className={styles.minimalInput}
                        aria-label="Express your thoughts"
                        disabled={isLoading}
                        autoFocus
                      />
                      <button
                        className={styles.submitArrow}
                        onClick={handleSendMessage}
                        aria-label="Send"
                        disabled={isLoading || !inputValue.trim()}
                      >
                        →
                      </button>
                    </div>
                  </div>

                  <div className={styles.actionButtons}>
                    <button
                      className={styles.actionBtn}
                      onClick={() => navigate("/journal")}
                    >
                      Journal
                    </button>
                    <button
                      className={styles.actionBtn}
                      onClick={() => navigate("/meditate")}
                    >
                      Meditate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* ── Chat mode ── */}
        {isInChat && (
          <>
            <div className={styles.chatContentWrapper}>
              <div className={styles.messagesArea} ref={messagesAreaRef}>
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
                    <div className={styles.messageBubble}>
                      <div className={styles.messageContent}>
                        {msg.isTyping ? (
                          <div className={styles.typingIndicator}>
                            <span />
                            <span />
                            <span />
                          </div>
                        ) : msg.sender === "assistant" ? (
                          <ReactMarkdown
                            components={{
                              strong: ({ node, ...props }) => (
                                <strong
                                  style={{ fontWeight: 600, color: "#d4a574" }}
                                  {...props}
                                />
                              ),
                              em: ({ node, ...props }) => (
                                <em
                                  style={{ fontStyle: "italic", opacity: 0.9 }}
                                  {...props}
                                />
                              ),
                              p: ({ node, ...props }) => <span {...props} />,
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        ) : (
                          msg.text
                        )}
                      </div>

                      {!msg.isTyping && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.6rem",
                            marginTop: "0.3rem",
                          }}
                        >
                          <div className={styles.messageTime}>
                            {msg.timestamp?.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          {msg.sender === "assistant" && (
                            <div
                              style={{
                                opacity: 0,
                                transition: "opacity 0.2s ease",
                              }}
                              data-copy-wrapper
                            >
                              <CopyButton
                                text={msg.content || msg.text || ""}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {msg.crisis?.detected && (
                      <CrisisAlert
                        severity={msg.crisis.severity}
                        resources={msg.crisis.resources}
                      />
                    )}
                  </div>
                ))}

                {error && (
                  <div className={styles.errorMessage}>
                    <div className={styles.errorContent}>
                      <p className={styles.errorText}>{error}</p>
                      <div className={styles.errorActions}>
                        {isRetryable && (
                          <button
                            className={styles.retryBtn}
                            onClick={handleRetry}
                          >
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
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {showInsights && (
                <aside className={styles.insightsPanel}>
                  <EmotionalStatusCard
                    emotionData={emotionData}
                    isLoading={emotionLoading}
                    onClose={() => setShowInsights(false)}
                  />
                </aside>
              )}
            </div>

            {/* Insights toggle — SVG chevron */}
            <button
              className={`${styles.insightsEdgeTab} ${showInsights ? styles.insightsTabOpen : ""}`}
              onClick={() => setShowInsights(!showInsights)}
              title={showInsights ? "Hide Insights" : "Show Insights"}
            >
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path
                  d={showInsights ? "M3 2L8 8L3 14" : "M7 2L2 8L7 14"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Chat input */}
            <div className={styles.chatInputArea}>
              <div className={styles.chatInputContainer}>
                <input
                  ref={chatInputRef}
                  type="text"
                  placeholder="Talk freely..."
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className={styles.chatInput}
                  aria-label="Send message"
                  disabled={isLoading && !isStreaming}
                />
                <AnimatedTooltip content="Back to home" placement="top">
                  <button
                    className={styles.homeBtn}
                    onClick={handleGoHome}
                    title="Return home"
                    aria-label="Return to welcome screen"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path
                        d="M1.5 7.5L7.5 1.5L13.5 7.5V12.5C13.5 12.9142 13.3314 13.2893 13.0607 13.5607C12.7893 13.8314 12.4142 14 12 14H3C2.58579 14 2.21071 13.8314 1.93934 13.5607C1.66797 13.2893 1.5 12.9142 1.5 12.5V7.5Z"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5.5 14V8.5H9.5V14"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </AnimatedTooltip>
                <AnimatedTooltip content="Send message" placement="top">
                  <button
                    className={styles.chatSubmitBtn}
                    onClick={handleSendMessage}
                    aria-label="Send message"
                    disabled={(isLoading && !isStreaming) || !inputValue.trim()}
                  >
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path
                        d="M9 14V4M9 4L5 8M9 4L13 8"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </AnimatedTooltip>
              </div>
            </div>
          </>
        )}

        {!isInChat && (
          <footer className={styles.footer}>
            <p className={styles.disclaimer}>
              Your space to reflect. Not a substitute for professional care.
            </p>
          </footer>
        )}
      </div>
    </>
  );
}

export default CheckIn;
