import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const SYSTEM_INSTRUCTION =
  "You are a professional assistant for an Indian vehicle portal. Help users with registration, insurance, and RC queries.";

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

const toModelRole = (role) => {
  if (role === "assistant" || role === "model") return "model";
  return "user";
};

const normalizeHistory = (messages) => {
  if (!Array.isArray(messages) || !messages.length) return [];

  const candidates = messages
    .filter((m) => typeof m?.content === "string" && m.content.trim())
    .map((m) => ({
      role: toModelRole(m.role),
      parts: [{ text: m.content.trim() }],
    }));

  const alternated = [];
  for (const message of candidates) {
    if (!alternated.length || alternated[alternated.length - 1].role !== message.role) {
      alternated.push(message);
    }
  }

  return alternated;
};

export const handleChatSupport = async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "GEMINI_API_KEY is not configured" });
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const userInput =
      String(req.body?.userInput || "").trim() ||
      String(req.body?.question || "").trim() ||
      (() => {
        const last = [...messages].reverse().find((m) => toModelRole(m?.role) === "user");
        return String(last?.content || "").trim();
      })();

    if (!userInput) {
      return res.status(400).json({ message: "userInput is required" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
      safetySettings: SAFETY_SETTINGS,
    });

    const rawHistory = normalizeHistory(messages);
    const history = rawHistory.slice(0, -1);

    const chat = model.startChat({ history: history || [] });
    const result = await chat.sendMessage(userInput);

    const hasCandidate = Boolean(result?.response?.candidates?.[0]);
    if (!hasCandidate) {
      return res.json({
        content: [{ type: "text", text: "I couldn't process that. Can you rephrase?" }],
      });
    }

    const replyText = result.response.text?.()?.trim() || "I couldn't process that. Can you rephrase?";
    return res.json({
      content: [{ type: "text", text: replyText }],
    });
  } catch (error) {
    const status = error?.status ?? error?.response?.status;
    const message = error?.message || String(error);

    if (status === 404 || /(^|\D)404(\D|$)/.test(message)) {
      console.error('Gemini 404: model "gemini-2.5-flash" may be unavailable.', message);
      return res.status(404).json({ message: "Chat model unavailable right now." });
    }

    if (status === 400 || /(^|\D)400(\D|$)/.test(message) || /Invalid JSON payload/i.test(message)) {
      console.error("Gemini 400 Invalid JSON payload details:", message);
      return res.status(400).json({ message: "Invalid chat request payload." });
    }

    console.error("Chat support error:", message);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};
