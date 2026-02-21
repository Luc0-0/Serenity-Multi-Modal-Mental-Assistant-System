import React, { useState, useEffect } from "react";
import "./ConversationSidebar.css";
import { TrashIcon } from "./Icons";
import { useConversationRefresh } from "../contexts/ConversationRefreshContext";

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
    fetchConversations();
  }, [userId, refreshTrigger]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch(`/api/conversations/`, { headers });
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
        `/api/conversations/${id}`,
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
      {/* Edge-tab arrow toggle */}
      <button
        className={`sidebarEdgeTab ${isOpen ? "open" : ""}`}
        onClick={() => onToggle?.(!isOpen)}
        title={isOpen ? "Close History" : "Chat History"}
        aria-label={isOpen ? "Close chat history" : "Open chat history"}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <path
            d={isOpen ? "M7 2L2 8L7 14" : "M3 2L8 8L3 14"}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
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
