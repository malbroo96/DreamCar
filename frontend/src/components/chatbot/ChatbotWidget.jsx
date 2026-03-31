import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ChatbotWidget.css";

// System prompt lives on the backend (routes/chatbot.js) — not here.
// This keeps your API key and prompt logic server-side only.

/* ─── helpers ─── */
const formatTime = (date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

/* ─── Quick suggestion chips ─── */
const SUGGESTIONS = [
  "How do I buy a car?",
  "How do I list my car for sale?",
  "How do I contact a dealer?",
  "Where are my messages?",
  "How do I edit my profile?",
];

/* ════════════════════════════════════════
   ChatbotWidget
════════════════════════════════════════ */
const ChatbotWidget = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm DreamBot 🚗 Your DreamCar assistant. I can help you buy or sell cars, contact dealers, manage your account, and more. How can I help you today?",
      listings: [],
      time: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /* ── Listen for external open trigger (from Services section) ── */
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("dreamcar:open-chatbot", handler);
    return () => window.removeEventListener("dreamcar:open-chatbot", handler);
  }, []);

  /* ── Send message to Claude API ── */
  const sendMessage = async (userText) => {
    if (!userText.trim() || loading) return;
    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: userText.trim(),
      time: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");
    setShowSuggestions(false);

    /* Build history for the API (exclude welcome message, use only role+content) */
    const history = messagesRef.current
      .filter((m) => m.id !== "welcome")
      .map(({ role, content }) => ({ role, content }));

    try {
      // ── Calls your own backend, which holds the API key securely ──
      const token = localStorage.getItem("dreamcar_auth_token");
      const response = await fetch("/api/chat/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          messages: [...history, { role: "user", content: userText.trim() }],
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Request failed (${response.status})`);
      }

      const data = await response.json();
      const replyText =
        data.content
          ?.filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("") || "Sorry, I didn't get a response. Please try again.";

      const botMsg = {
        id: `b-${Date.now()}`,
        role: "assistant",
        content: replyText,
        listings: data.content?.find((b) => b.type === "listings")?.items || [],
        time: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSuggestion = (text) => {
    sendMessage(text);
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I'm DreamBot 🚗 Your DreamCar assistant. I can help you buy or sell cars, contact dealers, manage your account, and more. How can I help you today?",
        listings: [],
        time: new Date(),
      },
    ]);
    setShowSuggestions(true);
    setError("");
  };

  return (
    <div className="chatbot-widget">
      {/* ── Chat window ── */}
      {isOpen && (
        <div className="chatbot-window" role="dialog" aria-label="DreamCar Support Chat">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-left">
              <div className="chatbot-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M8 12h.01M12 12h.01M16 12h.01"/>
                </svg>
              </div>
              <div>
                <div className="chatbot-header-name">DreamBot</div>
                <div className="chatbot-header-status">
                  <span className="chatbot-online-dot" />
                  AI Support Assistant
                </div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button
                className="chatbot-btn-icon"
                title="Clear chat"
                onClick={handleClear}
                aria-label="Clear chat history"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
              </button>
              <button
                className="chatbot-btn-icon"
                title="Close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chat"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chatbot-messages">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chatbot-msg ${msg.role === "user" ? "chatbot-msg--user" : "chatbot-msg--bot"}`}
              >
                {msg.role === "assistant" && (
                  <div className="chatbot-msg-avatar">🤖</div>
                )}
                <div className="chatbot-msg-body">
                  <div className="chatbot-bubble">{msg.content}</div>
                  {msg.role === "assistant" && msg.listings?.length > 0 && (
                    <div className="chatbot-listings">
                      {msg.listings.map((car) => (
                        <button
                          key={car.id}
                          type="button"
                          className="chatbot-listing-card"
                          onClick={() => navigate(`/cars/${car.id}`)}
                        >
                          {car.image ? (
                            <img src={car.image} alt={car.title} className="chatbot-listing-image" />
                          ) : (
                            <div className="chatbot-listing-image chatbot-listing-image--placeholder">Car</div>
                          )}
                          <div className="chatbot-listing-content">
                            <div className="chatbot-listing-title">{car.title}</div>
                            <div className="chatbot-listing-meta">
                              {car.city || car.location || "Location not available"}
                            </div>
                            <div className="chatbot-listing-meta">
                              {car.fuelType} • {car.transmission}
                            </div>
                            <div className="chatbot-listing-price">
                              Rs {Number(car.price || 0).toLocaleString("en-IN")}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="chatbot-msg-time">{formatTime(msg.time)}</div>
                </div>
              </div>
            ))}

            {/* Typing animation */}
            {loading && (
              <div className="chatbot-msg chatbot-msg--bot">
                <div className="chatbot-msg-avatar">🤖</div>
                <div className="chatbot-typing-bubble">
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                  <span className="chatbot-dot" />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="chatbot-error">
                <span>⚠ {error}</span>
                <button onClick={() => setError("")}>✕</button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && (
            <div className="chatbot-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="chatbot-chip"
                  onClick={() => handleSuggestion(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about DreamCar…"
              aria-label="Chat input"
              disabled={loading}
            />
            <button
              type="submit"
              className={`chatbot-send-btn ${input.trim() ? "chatbot-send-btn--active" : ""}`}
              disabled={!input.trim() || loading}
              aria-label="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        className={`chatbot-fab ${isOpen ? "chatbot-fab--open" : ""}`}
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        )}
        {!isOpen && (
          <span className="chatbot-fab-label">Help</span>
        )}
      </button>
    </div>
  );
};

export default ChatbotWidget;
