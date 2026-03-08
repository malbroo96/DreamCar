import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getThreadMessages, getThreads, sendThreadMessage, startDirectConversation } from "../services/messageService";
import { connectSocket, disconnectSocket, getSocket } from "../services/socketService";
import { searchUsers } from "../services/userService";

const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [searchedUsers, setSearchedUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedThreadRef = useRef("");

  const loadThreads = useCallback(async () => {
    const data = await getThreads();
    setThreads(data);
    return data;
  }, []);

  const loadThreadMessages = useCallback(async (threadId) => {
    const data = await getThreadMessages(threadId);
    setMessages(data.messages || []);
    setThreadMeta(data.thread || null);
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await loadThreads();
        const qsThreadId = searchParams.get("thread");
        const nextId = qsThreadId || data[0]?._id || "";
        setSelectedThreadId(nextId);
        if (nextId) {
          await loadThreadMessages(nextId);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    boot();
  }, [loadThreadMessages, loadThreads, searchParams]);

  useEffect(() => {
    selectedThreadRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    const socket = connectSocket();

    const handleNewMessage = ({ threadId, message }) => {
      if (String(threadId) !== selectedThreadRef.current) return;
      setMessages((prev) => {
        if (prev.some((existing) => existing._id === message._id)) return prev;
        return [...prev, message];
      });
    };

    const handleThreadUpdated = () => {
      loadThreads().catch(() => {});
    };

    socket.on("message:new", handleNewMessage);
    socket.on("thread:updated", handleThreadUpdated);

    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("thread:updated", handleThreadUpdated);
      disconnectSocket();
    };
  }, [loadThreads]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedThreadId) return undefined;

    socket.emit("thread:join", { threadId: selectedThreadId });

    return () => {
      socket.emit("thread:leave", { threadId: selectedThreadId });
    };
  }, [selectedThreadId]);

  const handleSelectThread = async (threadId) => {
    setSelectedThreadId(threadId);
    setSearchParams({ thread: threadId });
    await loadThreadMessages(threadId);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || !text.trim()) return;

    try {
      const socket = getSocket();
      const messageText = text.trim();
      if (socket?.connected) {
        await new Promise((resolve, reject) => {
          socket.emit("message:send", { threadId: selectedThreadId, text: messageText }, (result) => {
            if (result?.ok) {
              resolve(result);
              return;
            }
            reject(new Error(result?.message || "Failed to send message"));
          });
        });
      } else {
        const created = await sendThreadMessage(selectedThreadId, messageText);
        setMessages((prev) => [...prev, created]);
      }

      setText("");
      await loadThreads();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send message");
    }
  };

  const handleUserSearch = async (event) => {
    event.preventDefault();
    const query = userSearch.trim();
    if (!query) {
      setSearchedUsers([]);
      return;
    }

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
      const threadId = thread?._id || updatedThreads[0]?._id;
      if (!threadId) return;
      setSelectedThreadId(threadId);
      setSearchParams({ thread: threadId });
      await loadThreadMessages(threadId);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start conversation");
    }
  };

  if (loading) return <p>Loading messages...</p>;

  return (
    <section>
      <h1>Messages</h1>
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}

      <div className="grid" style={{ gridTemplateColumns: "minmax(260px,320px) 1fr", alignItems: "start" }}>
        <div className="card" style={{ padding: "0.5rem" }}>
          <form onSubmit={handleUserSearch} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
            <input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by username"
              aria-label="Search by username"
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>

          {searchLoading ? <p style={{ margin: "0.5rem" }}>Searching users...</p> : null}
          {!searchLoading && searchedUsers.length > 0 ? (
            <div style={{ marginBottom: "0.6rem" }}>
              {searchedUsers.map((user) => (
                <div
                  key={user.id}
                  style={{
                    border: "1px solid #e4ebf3",
                    borderRadius: 10,
                    padding: "0.6rem",
                    marginBottom: "0.45rem",
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{user.name}</div>
                  <div style={{ fontSize: "0.85rem", color: "#4c6785" }}>@{user.username || "user"}</div>
                  <div style={{ fontSize: "0.85rem", color: "#4c6785", marginBottom: "0.45rem" }}>{user.email}</div>
                  <button type="button" className="btn btn-secondary" onClick={() => handleStartDirectChat(user)}>
                    Message User
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {threads.length === 0 ? <p style={{ margin: "0.75rem" }}>No conversations yet.</p> : null}
          {threads.map((thread) => (
            <button
              key={thread._id}
              type="button"
              onClick={() => handleSelectThread(thread._id)}
              className="btn"
              style={{
                width: "100%",
                textAlign: "left",
                marginBottom: "0.4rem",
                background: thread._id === selectedThreadId ? "#dce8fc" : "#f7f9fc",
              }}
            >
              <div style={{ fontWeight: 700 }}>{thread.carTitle}</div>
              <div style={{ color: "#4c6785", fontSize: "0.9rem" }}>{thread.participant?.name}</div>
            </button>
          ))}
        </div>

        <div className="card" style={{ padding: "1rem" }}>
          {!selectedThreadId ? (
            <p>Select a conversation.</p>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>{threadMeta?.carTitle || "Conversation"}</h2>
              <p style={{ color: "#4c6785", marginTop: "-0.35rem" }}>
                Chatting with {threadMeta?.participant?.name || "User"}
              </p>

              <div
                style={{
                  border: "1px solid #e4ebf3",
                  borderRadius: 12,
                  padding: "0.75rem",
                  minHeight: 260,
                  maxHeight: 400,
                  overflowY: "auto",
                  marginBottom: "0.75rem",
                }}
              >
                {messages.length === 0 ? <p>No messages yet.</p> : null}
                {messages.map((message) => (
                  <div key={message._id} style={{ marginBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 700 }}>{message.senderName}</div>
                    <div>{message.text}</div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} style={{ display: "flex", gap: "0.5rem" }}>
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
                <button type="submit" className="btn btn-primary">
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default MessagesPage;
