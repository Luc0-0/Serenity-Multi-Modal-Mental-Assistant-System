import React, { useState, useEffect } from "react";
import "./SerenityDeck.css";

/* ─── ICONS (Custom Luxury Set) ─── */
const ChevronRight = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
  >
    <path d="M10 17l5-5-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// The "Cartier" Pin: A slender needle with a pearl head
const LuxuryPin = ({ filled }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
  >
    {/* The Head */}
    <circle cx="12" cy="5" r="3" fill={filled ? "currentColor" : "none"} />
    {/* The Needle */}
    <path d="M12 8v14" strokeLinecap="round" />
    {/* The Shine (Detail) */}
    <path d="M12 22l0 0" strokeLinecap="round" strokeWidth="2" opacity="0.5" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M12 4v16M4 12h16" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
  >
    <path
      d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─── COMPONENT ─── */
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export function SerenityDeck({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  userId,
  onPinChange,
}) {
  const [conversations, setConversations] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen || isPinned) fetchConversations();
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
    setIsOpen(newState);
    if (onPinChange) onPinChange(newState);
  };

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
      {/* 1. The Glass Handle (Trigger) */}
      <div
        className={`deck-trigger-zone ${isOpen || isPinned ? "hidden" : ""}`}
        onMouseEnter={handleMouseEnter}
      >
        <div className="trigger-pill">
          <ChevronRight />
        </div>
      </div>

      {/* 2. The Deck (Drawer) */}
      <div
        className={`deck-drawer ${isOpen || isPinned ? "open" : ""}`}
        onMouseLeave={handleMouseLeave}
      >
        {/* NOISE LAYER: This creates the "smoked" texture */}
        <div className="deck-noise" />

        <div className="deck-inner">
          {/* Header */}
          <div className="deck-header">
            <span className="deck-logo">Archives</span>
            <button
              className={`deck-pin-btn ${isPinned ? "active" : ""}`}
              onClick={togglePin}
              title={isPinned ? "Unpin" : "Pin Sidebar"}
            >
              <LuxuryPin filled={isPinned} />
            </button>
          </div>

          {/* New Chat Button */}
          <button className="deck-new-btn" onClick={onNewConversation}>
            <PlusIcon />
            <span>New Chat</span>
          </button>

          {/* List */}
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
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
