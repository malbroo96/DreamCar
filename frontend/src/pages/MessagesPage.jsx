import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  getThreadMessages,
  getThreads,
  sendThreadMessage,
  startDirectConversation,
} from "../services/messageService";
import { connectSocket, disconnectSocket, getSocket } from "../services/socketService";
import { getStoredUser } from "../services/authService";
import { searchUsers } from "../services/userService";
import "../styles/messages.css";

/* ─── helpers ─── */
const getInitials = (name = "") =>
  name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatThreadDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const TYPING_TIMEOUT_MS = 2500;

/* ════════════════════════════════════════
   MessagesPage
════════════════════════════════════════ */
const MessagesPage = () => {
  const currentUser = getStoredUser();
  const currentUserId = currentUser?.id;

  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(true);

  const selectedThreadRef = useRef("");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const textareaRef = useRef(null);

  /* ── scroll to bottom ── */
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  /* ── load threads ── */
  const loadThreads = useCallback(async () => {
    const data = await getThreads();
    setThreads(data);
    return data;
  }, []);

  /* ── load messages for a thread ── */
  const loadThreadMessages = useCallback(async (threadId) => {
    const data = await getThreadMessages(threadId);
    setMessages(data.messages || []);
    setThreadMeta(data.thread || null);
    setTimeout(() => scrollToBottom("instant"), 50);
  }, []);

  /* ── boot ── */
  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await loadThreads();
        const qsThreadId = searchParams.get("thread");
        const nextId = qsThreadId || data[0]?._id || "";
        setSelectedThreadId(nextId);
        if (nextId) await loadThreadMessages(nextId);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };
    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── keep ref in sync ── */
  useEffect(() => { selectedThreadRef.current = selectedThreadId; }, [selectedThreadId]);

  /* ── scroll whenever messages change ── */
  useEffect(() => { scrollToBottom(); }, [messages]);

  /* ── socket ── */
  useEffect(() => {
    const socket = connectSocket();

    const handleNewMessage = ({ threadId, message }) => {
      if (String(threadId) !== selectedThreadRef.current) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      setIsOtherTyping(false);
    };

    const handleThreadUpdated = () => { loadThreads().catch(() => {}); };

    const handleTyping = ({ threadId, userId }) => {
      if (String(threadId) !== selectedThreadRef.current) return;
      if (String(userId) === String(currentUserId)) return;
      setIsOtherTyping(true);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_TIMEOUT_MS);
    };

    const handleOnlineStatus = ({ userId, online }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (online) next.add(String(userId));
        else next.delete(String(userId));
        return next;
      });
    };

    socket.on("message:new", handleNewMessage);
    socket.on("thread:updated", handleThreadUpdated);
    socket.on("user:typing", handleTyping);
    socket.on("user:online", handleOnlineStatus);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("thread:updated", handleThreadUpdated);
      socket.off("user:typing", handleTyping);
      socket.off("user:online", handleOnlineStatus);
      disconnectSocket();
      clearTimeout(typingTimeoutRef.current);
    };
  }, [loadThreads, currentUserId]);

  /* ── join/leave thread room ── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedThreadId) return undefined;
    socket.emit("thread:join", { threadId: selectedThreadId });
    return () => { socket.emit("thread:leave", { threadId: selectedThreadId }); };
  }, [selectedThreadId]);

  /* ── emit typing ── */
  const handleTextChange = (e) => {
    setText(e.target.value);
    const socket = getSocket();
    if (socket?.connected && selectedThreadId) {
      socket.emit("user:typing", { threadId: selectedThreadId, userId: currentUserId });
    }
  };

  /* ── select thread ── */
  const handleSelectThread = async (threadId) => {
    setSelectedThreadId(threadId);
    setSearchParams({ thread: threadId });
    setMobileSidebarOpen(false);
    await loadThreadMessages(threadId);
  };

  /* ── send message ── */
  const handleSend = async (e) => {
    e?.preventDefault();
    if (!selectedThreadId || !text.trim() || sendLoading) return;
    const messageText = text.trim();
    setText("");
    textareaRef.current?.focus();

    try {
      setSendLoading(true);
      const socket = getSocket();
      if (socket?.connected) {
        await new Promise((resolve, reject) => {
          socket.emit("message:send", { threadId: selectedThreadId, text: messageText }, (result) => {
            if (result?.ok) resolve(result);
            else reject(new Error(result?.message || "Failed to send message"));
          });
        });
      } else {
        const created = await sendThreadMessage(selectedThreadId, messageText);
        setMessages((prev) => [...prev, created]);
      }
      await loadThreads();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send message");
    } finally {
      setSendLoading(false);
    }
  };

  /* ── send on Enter (Shift+Enter = newline) ── */
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── search users ── */
  const handleUserSearch = async (e) => {
    e.preventDefault();
    const query = userSearch.trim();
    if (!query) { setSearchedUsers([]); return; }
    try {
      setSearchLoading(true);
      const users = await searchUsers(query);
      setSearchedUsers(users);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to search users");
    } finally {
      setSearchLoading(false);
    }
  };

  /* ── start DM ── */
  const handleStartDirectChat = async (targetUser) => {
    try {
      setError("");
      const thread = await startDirectConversation({
        userId: targetUser.id,
        text: `Hi ${targetUser.name}, I would like to connect.`,
      });
      const updatedThreads = await loadThreads();
      setSearchedUsers([]);
      setUserSearch("");
      setShowSearch(false);
      const threadId = thread?._id || updatedThreads[0]?._id;
      if (!threadId) return;
      setSelectedThreadId(threadId);
      setSearchParams({ thread: threadId });
      setMobileSidebarOpen(false);
      await loadThreadMessages(threadId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start conversation");
    }
  };

  /* ── participant online check ── */
  const isParticipantOnline = () => {
    const pid = threadMeta?.participant?._id || threadMeta?.participant?.id;
    return pid ? onlineUsers.has(String(pid)) : false;
  };

  /* ── loading ── */
  if (loading) {
    return (
      <div className="messages-page">
        <div className="messages-loading">
          <div className="spinner-lg" />
          <p>Loading messages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="messages-page">
      {error && (
        <div className="msg-error-banner">
          <span>⚠ {error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}

      <div className="messages-layout">

        {/* ════════════════════════════════
            LEFT SIDEBAR
        ════════════════════════════════ */}
        <aside className={`messages-sidebar ${mobileSidebarOpen ? "messages-sidebar--open" : ""}`}>

          {/* Sidebar header */}
          <div className="sidebar-header">
            <h2 className="sidebar-title">Messages</h2>
            <button
              className="btn-icon"
              title="New conversation"
              onClick={() => setShowSearch((v) => !v)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </button>
          </div>

          {/* Search / New Chat panel */}
          {showSearch && (
            <div className="sidebar-search-panel">
              <form onSubmit={handleUserSearch} className="search-form">
                <div className="search-input-wrap">
                  <svg className="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by username or name"
                    aria-label="Search users"
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn btn-primary btn--sm">Search</button>
              </form>

              {searchLoading && (
                <div className="search-results-msg">Searching…</div>
              )}
              {!searchLoading && searchedUsers.length > 0 && (
                <div className="search-results">
                  {searchedUsers.map((u) => (
                    <div key={u.id} className="search-result-item">
                      <div className="search-result-avatar">{getInitials(u.name)}</div>
                      <div className="search-result-info">
                        <div className="search-result-name">{u.name}</div>
                        <div className="search-result-sub">@{u.username || u.email}</div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn--sm"
                        onClick={() => handleStartDirectChat(u)}
                      >
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {!searchLoading && searchedUsers.length === 0 && userSearch && (
                <div className="search-results-msg">No users found.</div>
              )}
            </div>
          )}

          {/* Thread list */}
          <div className="thread-list">
            {threads.length === 0 && (
              <div className="thread-empty">
                <div className="thread-empty-icon">💬</div>
                <p>No conversations yet.</p>
                <span>Search for a user to start chatting.</span>
              </div>
            )}
            {threads.map((thread) => {
              const isActive = thread._id === selectedThreadId;
              const participantId = thread.participant?._id || thread.participant?.id;
              const participantOnline = participantId ? onlineUsers.has(String(participantId)) : false;

              return (
                <button
                  key={thread._id}
                  type="button"
                  className={`thread-item ${isActive ? "thread-item--active" : ""}`}
                  onClick={() => handleSelectThread(thread._id)}
                >
                  <div className="thread-avatar-wrap">
                    <div className="thread-avatar">
                      {getInitials(thread.participant?.name || "?")}
                    </div>
                    {participantOnline && <span className="online-dot" />}
                  </div>
                  <div className="thread-info">
                    <div className="thread-name">
                      {thread.participant?.name || "User"}
                    </div>
                    <div className="thread-preview">
                      {thread.carTitle || "Direct message"}
                    </div>
                  </div>
                  <div className="thread-meta">
                    <span className="thread-time">
                      {formatThreadDate(thread.updatedAt)}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="thread-unread">{thread.unreadCount}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ════════════════════════════════
            CHAT WINDOW
        ════════════════════════════════ */}
        <div className={`chat-window ${!mobileSidebarOpen ? "chat-window--visible" : ""}`}>

          {!selectedThreadId ? (
            <div className="chat-empty">
              <div className="chat-empty-icon">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <h3>Select a conversation</h3>
              <p>Choose from your existing chats or search for a user to start a new conversation.</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="chat-header">
                <button
                  className="btn-back"
                  onClick={() => setMobileSidebarOpen(true)}
                  aria-label="Back to conversations"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                </button>

                <div className="chat-header-avatar">
                  {getInitials(threadMeta?.participant?.name || "?")}
                  {isParticipantOnline() && <span className="chat-online-dot" />}
                </div>

                <div className="chat-header-info">
                  <div className="chat-header-name">
                    {threadMeta?.participant?.name || "User"}
                  </div>
                  <div className="chat-header-sub">
                    {isParticipantOnline() ? (
                      <span className="status-online">● Online</span>
                    ) : (
                      <span className="status-offline">● Offline</span>
                    )}
                    {threadMeta?.carTitle && (
                      <span className="chat-car-label"> · {threadMeta.carTitle}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="messages-area">
                {messages.length === 0 && (
                  <div className="messages-empty">
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                )}

                {/* Group messages by day would go here — keeping flat for now */}
                {messages.map((message, idx) => {
                  const isOwn =
                    String(message.senderId) === String(currentUserId) ||
                    String(message.senderName) === String(currentUser?.name);

                  const prevMsg = messages[idx - 1];
                  const showAvatar =
                    !isOwn &&
                    (!prevMsg ||
                      String(prevMsg.senderId) !== String(message.senderId));

                  return (
                    <div
                      key={message._id}
                      className={`message-row ${isOwn ? "message-row--own" : "message-row--other"}`}
                    >
                      {/* Avatar placeholder for spacing */}
                      {!isOwn && (
                        <div className="message-avatar-col">
                          {showAvatar ? (
                            <div className="message-avatar">
                              {getInitials(message.senderName || "?")}
                            </div>
                          ) : (
                            <div className="message-avatar-gap" />
                          )}
                        </div>
                      )}

                      <div className="message-col">
                        {showAvatar && !isOwn && (
                          <div className="message-sender-name">{message.senderName}</div>
                        )}
                        <div className={`message-bubble ${isOwn ? "bubble--own" : "bubble--other"}`}>
                          <span className="bubble-text">{message.text}</span>
                          <span className="bubble-time">
                            {formatTime(message.createdAt)}
                            {isOwn && <span className="bubble-tick"> ✓</span>}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {isOtherTyping && (
                  <div className="message-row message-row--other typing-row">
                    <div className="message-avatar-col">
                      <div className="message-avatar-gap" />
                    </div>
                    <div className="typing-bubble">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="chat-input-bar">
                <form onSubmit={handleSend} className="chat-input-form">
                  <textarea
                    ref={textareaRef}
                    className="chat-textarea"
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    aria-label="Message input"
                  />
                  <button
                    type="submit"
                    className={`btn-send ${text.trim() ? "btn-send--active" : ""}`}
                    disabled={!text.trim() || sendLoading}
                    aria-label="Send message"
                  >
                    {sendLoading ? (
                      <span className="spinner" style={{ borderTopColor: "#fff" }} />
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                      </svg>
                    )}
                  </button>
                </form>
                <p className="input-hint">Enter to send · Shift+Enter for new line</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;