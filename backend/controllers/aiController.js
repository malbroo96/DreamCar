import { chatWithGemini, extractRcDetailsFromBase64 } from "../services/geminiService.js";

const handleGeminiSdkError = (error, res, fallbackMessage) => {
  const rawStatus = error?.status ?? error?.response?.status;
  const status =
    Number.isInteger(rawStatus) && rawStatus >= 100 && rawStatus <= 599 ? rawStatus : null;
  const message = error?.message || fallbackMessage;

  if (status === 400 || /(^|\\D)400(\\D|$)/.test(message)) {
    res.status(400);
    throw new Error(`Gemini request error (400): ${message}`);
  }

  if (status === 404 || /(^|\\D)404(\\D|$)/.test(message)) {
    res.status(404);
    throw new Error(`Gemini model not found (404): ${message}`);
  }

  res.status(status && status >= 400 ? status : 500);
  throw new Error(message || fallbackMessage);
};

export const handleUserChat = async (req, res, next) => {
  try {
    const question = String(req.body?.question || "").trim();
    const messages = Array.isArray(req.body?.messages) ? req.body.messages : undefined;

    if (!question && (!messages || !messages.length)) {
      res.status(400);
      throw new Error("question or messages is required");
    }

    const answer = await chatWithGemini({ question, messages });
    res.json({ answer });
  } catch (error) {
    try {
      handleGeminiSdkError(error, res, "Chat support failed");
    } catch (mapped) {
      next(mapped);
    }
  }
};

export const extractVehicleDetails = async (req, res, next) => {
  try {
    const base64Image = String(req.body?.base64Image || "").trim();
    const mimeType = String(req.body?.mimeType || "image/jpeg").trim();

    if (!base64Image) {
      res.status(400);
      throw new Error("base64Image is required");
    }

    const details = await extractRcDetailsFromBase64({ base64Image, mimeType });
    res.json(details);
  } catch (error) {
    try {
      handleGeminiSdkError(error, res, "RC extraction failed");
    } catch (mapped) {
      next(mapped);
    }
  }
};
