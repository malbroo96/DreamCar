import Anthropic from "@anthropic-ai/sdk";
import express from "express";
import { protect } from "../middleware/auth.js";

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are DreamBot, the friendly and helpful AI customer support assistant for DreamCar — an online car marketplace based in India where car dealers can list cars for sale and buyers can browse listings, contact dealers, and communicate via chat.

Your role is to help users navigate and use the DreamCar platform. Keep answers concise, friendly, and practical.

Platform features you know about:
- BUYING: Browse the homepage to see all car listings. Filter by location, price, year, brand. Click any car card to view full details and contact the dealer.
- CONTACTING DEALER: On any car detail page there is a "Contact Dealer" or "Message Dealer" button. This opens a chat thread with that dealer. You can also visit Messages page to see all your conversations.
- SELLING / LISTING A CAR: Log in, click "Sell Car" in the navigation bar. Fill out the car listing form with title, price, year, location, description, and photos.
- MESSAGES: The Messages page shows all your conversations. Left sidebar lists all chat threads. Click a thread to open the chat window. You can search for users by username or name.
- PROFILE: Click "Profile" in the navigation. You can update your name, username, bio, phone, location, and profile photo. You can also see your listings and message notifications here.
- LOGIN: DreamCar uses Google Sign-In. Click "Login" and sign in with your Google account.
- EDITING/DELETING LISTINGS: Go to Profile page, find your listing, and use the Edit or Delete buttons on each car card.
- ACCOUNT ISSUES: If you cannot log in, try a different Google account or clear your browser cache.`;

router.post("/support", protect, async (req, res) => {
  console.log("API KEY present:", !!process.env.ANTHROPIC_API_KEY)
  console.log("Messages received:", req.body.messages?.length);  
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "messages array is required" });
    }

    // Sanitize — only allow role + content strings
    const sanitized = messages
      .filter((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20); // keep last 20 messages max to control token usage

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: sanitized,
    });

    res.json({ content: response.content });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ message: "Chatbot unavailable. Please try again." });
  }
});

export default router;