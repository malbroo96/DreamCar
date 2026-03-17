import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are DreamBot, the friendly and helpful AI customer support assistant for DreamCar — an online car marketplace based in India where car dealers can list cars for sale and buyers can browse listings, contact dealers, and communicate via chat.

Your role is to help users navigate and use the DreamCar platform. Keep answers concise, friendly, and practical.

Platform features you know about:
- BUYING: Browse the homepage to see all car listings. Filter by location, price, year, brand. Click any car card to view full details and contact the dealer.
- CONTACTING DEALER: On any car detail page there is a "Contact Dealer" or "Message Dealer" button. This opens a chat thread with that dealer. You can also visit the Messages page to see all your conversations.
- SELLING / LISTING A CAR: Log in, click "Sell Car" in the navigation bar. Fill out the car listing form with title, price, year, location, description, photos, and RC document.
- RC DOCUMENT: When listing a car, you must upload the vehicle's Registration Certificate (RC). This is stored securely and is never visible to buyers. It verifies ownership.
- MESSAGES: The Messages page shows all your conversations. Left sidebar lists all chat threads. Click a thread to open the chat window.
- PROFILE: Click "Profile" in the navigation. You can update your name, username, bio, phone, location, and profile photo.
- LOGIN: DreamCar uses Google Sign-In. Click "Login" and sign in with your Google account.
- EDITING/DELETING LISTINGS: Go to Profile page, find your listing, and use the Edit or Delete buttons on each car card.
- ACCOUNT ISSUES: If you cannot log in, try a different Google account or clear your browser cache.

Always be helpful. If you don't know something platform-specific, say so honestly.`;

export const handleChatSupport = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured" });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const sanitized = messages
      .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string" && m.content.trim())
      .slice(-20);

    if (!sanitized.length) {
      return res.status(400).json({ message: "messages array is required" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: SYSTEM_PROMPT,
    });

    /* Gemini uses "model" role instead of "assistant" */
    const history = sanitized.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = sanitized[sanitized.length - 1];

    const chat  = model.startChat({ history });
    const result = await chat.sendMessage(lastMessage.content);
    const replyText = result.response.text()?.trim()
      || "Sorry, I couldn't process that. Please try again.";

    return res.json({
      content: [{ type: "text", text: replyText }],
    });
  } catch (error) {
    console.error("Chat support error:", error?.message || error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};