import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getThreadMessages, getThreads, sendThreadMessage } from "../services/messageService";

const MessagesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [messages, setMessages] = useState([]);
  const [threadMeta, setThreadMeta] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadThreads = async () => {
    const data = await getThreads();
    setThreads(data);
    return data;
  };

  const loadThreadMessages = async (threadId) => {
    const data = await getThreadMessages(threadId);
    setMessages(data.messages || []);
    setThreadMeta(data.thread || null);
  };

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
  }, []);

  const handleSelectThread = async (threadId) => {
    setSelectedThreadId(threadId);
    setSearchParams({ thread: threadId });
    await loadThreadMessages(threadId);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!selectedThreadId || !text.trim()) return;
    const created = await sendThreadMessage(selectedThreadId, text);
    setMessages((prev) => [...prev, created]);
    setText("");
    await loadThreads();
  };

  if (loading) return <p>Loading messages...</p>;

  return (
    <section>
      <h1>Messages</h1>
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}

      <div className="grid" style={{ gridTemplateColumns: "minmax(260px,320px) 1fr", alignItems: "start" }}>
        <div className="card" style={{ padding: "0.5rem" }}>
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
