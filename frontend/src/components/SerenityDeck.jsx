import React, { useState, useEffect } from "react";
import "./SerenityDeck.css";

/* ─── ICONS ─── */
const ChevronRight = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PinIcon = ({ filled }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M12 2v10" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 22v-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── COMPONENT ─── */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function SerenityDeck({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  userId,
  onPinChange, // Prop to tell parent to shift layout
}) {
  const [conversations, setConversations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch Logic
  useEffect(() => {
    // We only fetch if open/pinned to save resources, or on first mount if needed
    if (isOpen || isPinned) {
      fetchConversations();
    }
  }, [isOpen, isPinned, userId]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${API_BASE_URL}/api/conversations/`, {
        headers,
      });
      if (response.ok) {
        const data = await response.json();
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at) -
            new Date(a.updated_at || a.created_at),
        );
        setConversations(sorted);
      }
    } catch (err) {
      console.error("Deck load failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Dissolve this memory?")) return;
    try {
      const token = localStorage.getItem("auth_token");
      await fetch(`${API_BASE_URL}/api/conversations/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) onNewConversation();
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const togglePin = () => {
    const newState = !isPinned;
    setIsPinned(newState);
    setIsOpen(newState); // Keep it open if pinning
    if (onPinChange) onPinChange(newState);
  };

  // Interaction Handlers
  const handleMouseEnter = () => {
    if (!isPinned) setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) setIsOpen(false);
  };

  const getTitle = (c) =>
    c.title || c.first_message?.substring(0, 30) || "Untitled Reflection";

  const getDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <>
      {/* 1. THE GLASS WHISPER TAB 
        - Permanently visible (unless pinned/open) 
        - Subtle cue to interaction
      */}
      <div
        className={`deck-tab-trigger ${isOpen || isPinned ? "hidden" : ""}`}
        onMouseEnter={handleMouseEnter}
        aria-label="Open History"
      >
        <div className="tab-glass">
          <ChevronRight />
        </div>
      </div>

      {/* 2. THE SLIDING DECK DRAWER
        - Slides out from left
      */}
      <div
        className={`deck-drawer ${isOpen || isPinned ? "open" : ""}`}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header: Title + Pin */}
        <div className="deck-header">
          <span className="deck-title">Archives</span>
          <button
            className={`pin-btn ${isPinned ? "active" : ""}`}
            onClick={togglePin}
            title={isPinned ? "Unpin (Float)" : "Pin (Dock)"}
          >
            <PinIcon filled={isPinned} />
          </button>
        </div>

        {/* New Conversation Button */}
        <button className="deck-new-btn" onClick={onNewConversation}>
          <PlusIcon />
          <span>Begin Anew</span>
        </button>

        {/* Conversation List */}
        <div className="deck-list">
          {loading && conversations.length === 0 && (
            <div className="deck-status">Loading reflections...</div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="deck-status">Your journal is empty.</div>
          )}

          {conversations.map((c) => (
            <div
              key={c.id}
              className={`deck-item ${currentConversationId === c.id ? "active" : ""}`}
              onClick={() => onSelectConversation(c.id)}
            >
              <div className="item-content">
                <span className="item-title">{getTitle(c)}</span>
                <span className="item-date">
                  {getDate(c.updated_at || c.created_at)}
                </span>
              </div>

              <button
                className="item-delete"
                onClick={(e) => handleDelete(e, c.id)}
                title="Delete"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
