import React, { useState, useEffect } from "react";
import "./ConversationSidebar.css";
import { TrashIcon } from "./Icons";
import { useConversationRefresh } from "../contexts/ConversationRefreshContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  userId = 1,
  isOpen = false,
  onToggle,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const { refreshTrigger } = useConversationRefresh();

  useEffect(() => {
    console.log("[Sidebar] Refresh triggered, fetching conversations...");
    fetchConversations();
  }, [userId, refreshTrigger]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`${API_BASE_URL}/api/conversations/`, { headers });
      if (response.ok) {
        const data = await response.json();
        console.log("[Sidebar] Fetched conversations:", data.map(c => ({ id: c.id, title: c.title })));
        const sorted = (Array.isArray(data) ? data : []).sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at) -
            new Date(a.updated_at || a.created_at),
        );
        setConversations(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewConversation = () => {
    onNewConversation();
    onToggle?.(false);
  };

  const getConversationTitle = (conv) => {
    if (conv.title && conv.title.trim()) {
      return conv.title;
    }
    if (conv.first_message) {
      const msg = conv.first_message.trim();
      return msg.length > 40 ? msg.substring(0, 37) + "..." : msg;
    }
    return "Untitled Conversation";
  };

  const formatConversationDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }

      if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "2-digit",
      });
    } catch {
      return "Date unknown";
    }
  };

  const handleSelectConversation = (id) => {
    onSelectConversation(id);
    onToggle?.(false);
  };

  const handleDeleteConversation = async (id, e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(
        `${API_BASE_URL}/api/conversations/${id}`,
        {
          method: "DELETE",
          headers,
        },
      );
      if (response.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  return (
    <>
      {/* Ancient Scroll Toggle — Desktop only */}
      <button
        className={`sidebarScrollTrigger ${isOpen ? "open" : ""}`}
        onClick={() => onToggle?.(!isOpen)}
        title={isOpen ? "Close History" : "Unfurl History"}
        aria-label={isOpen ? "Close chat history" : "Open chat history"}
      >
        <span className="scrollTriggerIcon">
          {isOpen ? "⊗" : "📜"}
        </span>
        {!isOpen && <span className="scrollTriggerLabel">History</span>}
      </button>

      <div className={`conversationSidebar ${isOpen ? "open" : "collapsed"}`}>
        <div className="sidebarHeader">
          <h2>Conversations</h2>
        </div>

        {isOpen && (
          <>
            <button className="newConvBtn" onClick={handleNewConversation}>
              + New Conversation
            </button>

            <div className="conversationsList">
              {loading ? (
                <p className="loadingText">Loading...</p>
              ) : conversations.length === 0 ? (
                <p className="emptyText">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversationItem ${currentConversationId === conv.id ? "active" : ""}`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <div className="convContent">
                      <p className="convTitle">{getConversationTitle(conv)}</p>
                      <p className="convDate">
                        {formatConversationDate(
                          conv.updated_at || conv.created_at,
                        )}
                      </p>
                    </div>
                    <button
                      className="deleteBtn"
                      onClick={(e) => handleDeleteConversation(conv.id, e)}
                      title="Delete conversation"
                      aria-label="Delete conversation"
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default ConversationSidebar;
