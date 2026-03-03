import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { useAuth } from "../context/AuthContext";
import { CrisisAlert } from "../components/CrisisAlert";
import { ConversationSidebar } from "../components/ConversationSidebar";
import { EmotionalStatusCard } from "../components/EmotionalStatusCard";
import { sendChatMessage, getErrorDisplay } from "../services/api";
import { fetchEmotionInsights } from "../services/emotionService";
import { useEdgeSwipe } from "../hooks/useEdgeSwipe";
import styles from "./CheckIn.module.css";

export function CheckIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emotionData, setEmotionData] = useState(null);
  const [emotionLoading, setEmotionLoading] = useState(false);

  // Left edge swipe opens sidebar
  useEdgeSwipe({
    edge: "left",
    isOpen: sidebarOpen,
    onOpen: () => setSidebarOpen(true),
    onClose: () => setSidebarOpen(false),
  });

  // Right edge swipe opens insights (chat mode only)
  useEdgeSwipe({
    edge: "right",
    isOpen: showInsights,
    onOpen: () => setShowInsights(true),
    onClose: () => setShowInsights(false),
    enabled: isInChat,
  });

  const inputRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const messagesAreaRef = useRef(null);
  const streamingRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
      }
    });
  }, []);

  // Scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Focus input on chat entry
  useEffect(() => {
    if (isInChat && chatInputRef.current) {
      setTimeout(() => chatInputRef.current?.focus(), 300);
    }
  }, [isInChat]);

  // Fetch emotion insights
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

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Stream text character-by-character
  const displayTextStream = useCallback((messageIndex, fullText) => {
    if (streamingRef.current) {
      clearTimeout(streamingRef.current);
    }

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

    if (!isInChat) {
      setIsInChat(true);
    }

    const assistantMessageIndex = messages.length + 1;

    // Placeholder message with typing indicator
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
      }

      // Begin streaming response
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

      // Remove failed placeholder
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

  const handleNewConversation = () => {
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
  };

  const handleSelectConversation = async (convId) => {
    try {
      if (streamingRef.current) clearTimeout(streamingRef.current);
      const token = localStorage.getItem("auth_token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/conversations/${convId}/messages`, {
        headers,
      });
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamingRef.current) clearTimeout(streamingRef.current);
    };
  }, []);

  return (
    <>
      {/* Sidebar */}
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        userId={userId}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      <div className={`${styles.container} ${isInChat ? styles.chatMode : ""}`}>
        <div className={styles.backgroundImage} />

        {/* Welcome screen */}
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
                onClick={() => navigate("/journal")}
                aria-label="Open journal"
              >
                Journal
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => navigate("/meditate")}
                aria-label="Meditation"
              >
                Meditate
              </button>
            </div>
          </main>
        )}

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
                    <div className={styles.messageAvatar}>
                      {msg.sender === "assistant" ? (
                        <div className={styles.aiAvatar}>✦</div>
                      ) : (
                        <div className={styles.userAvatar}>
                          {user?.name?.[0]?.toUpperCase() || "⊘"}
                        </div>
                      )}
                    </div>

                    <div className={styles.messageBubble}>
                      <div className={styles.messageContent}>
                        {msg.isTyping ? (
                          <div className={styles.typingIndicator}>
                            <span></span>
                            <span></span>
                            <span></span>
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
                        <div className={styles.messageTime}>
                          {msg.timestamp?.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
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

              {/* Insights panel */}
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

            {/* Insights toggle */}
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
                <button
                  className={styles.newConversationBtn}
                  onClick={handleNewConversation}
                  title="New Conversation"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3V13M3 8H13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
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
              </div>
            </div>
          </>
        )}

        {/* Footer */}
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
