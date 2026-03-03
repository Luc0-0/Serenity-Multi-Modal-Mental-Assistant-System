import React, { useState, useEffect } from "react";
import "./ConversationSidebar.css";
import SidebarToggleButton from "./SidebarToggleButton";
import { TrashIcon, CloseIcon } from "./Icons";
import { useConversationRefresh } from "../contexts/ConversationRefreshContext";

export function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  userId = 1,
}) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
        // Sort by most recent first
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
    setIsOpen(false);
  };

  const getConversationTitle = (conv) => {
    if (conv.title && conv.title.trim()) {
      return conv.title;
    }
    // Use first message as fallback
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

      // Check if today
      if (date.toDateString() === today.toDateString()) {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      // Check if yesterday
      if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday";
      }

      // Same year
      if (date.getFullYear() === today.getFullYear()) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }

      // Different year
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
    setIsOpen(false);
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
      <SidebarToggleButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />

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
