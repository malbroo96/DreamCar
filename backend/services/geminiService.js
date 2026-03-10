import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-2.5-flash";

const RC_RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    registration_no: { type: SchemaType.STRING },
    owner_name: { type: SchemaType.STRING },
    chassis_no: { type: SchemaType.STRING },
    engine_no: { type: SchemaType.STRING },
    vehicle_class: { type: SchemaType.STRING },
    fuel_type: { type: SchemaType.STRING },
    expiry_date: { type: SchemaType.STRING },
  },
  required: [
    "registration_no",
    "owner_name",
    "chassis_no",
    "engine_no",
    "vehicle_class",
    "fuel_type",
    "expiry_date",
  ],
};

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
};

const parseDataUrl = (value = "") => {
  const input = String(value || "").trim();
  const match = input.match(/^data:([^;]+);base64,(.+)$/i);
  if (match) {
    return { mimeType: match[1], data: match[2] };
  }
  return { mimeType: "image/jpeg", data: input };
};

const normalizeString = (value) => {
  const clean = String(value ?? "").trim();
  return clean || "";
};

const logGeminiError = (error, context) => {
  const status = error?.status ?? error?.response?.status ?? error?.cause?.status;
  const details = error?.message || String(error);

  if (status === 404 || /(^|\D)404(\D|$)/.test(details)) {
    console.error(`[Gemini:${context}] 404 model availability error for "${GEMINI_MODEL}":`, details);
    return;
  }

  if (status === 400 || /(^|\D)400(\D|$)/.test(details) || /Invalid JSON payload/i.test(details)) {
    console.error(`[Gemini:${context}] 400 invalid JSON payload:`, details);
    return;
  }

  console.error(`[Gemini:${context}] request failed:`, details);
};

export const handleChatSupport = async (userInput) => {
  try {
    const text = String(userInput || "").trim();
    if (!text) {
      throw new Error("userInput is required");
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction:
        "You are a helpful assistant for an Indian vehicle portal. Provide concise and accurate support.",
    });

    const chat = model.startChat();
    const result = await chat.sendMessage(text);
    return result?.response?.text?.().trim() || "";
  } catch (error) {
    logGeminiError(error, "chat");
    throw error;
  }
};

export const extractRCDetails = async (base64Image) => {
  try {
    const { mimeType, data } = parseDataUrl(base64Image);
    if (!data) {
      throw new Error("base64Image is required");
    }

    const genAI = getClient();
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RC_RESPONSE_SCHEMA,
        temperature: 0.1,
      },
    });

    const prompt =
      "Extract details from an Indian Registration Certificate (RC), including common Parivahan-style layouts. Return only JSON as per schema.";

    const result = await model.generateContent([
      {
        inlineData: {
          data,
          mimeType,
        },
      },
      { text: prompt },
    ]);

    const parsed = JSON.parse(result.response.text());

    return {
      registration_no: normalizeString(parsed.registration_no),
      owner_name: normalizeString(parsed.owner_name),
      chassis_no: normalizeString(parsed.chassis_no),
      engine_no: normalizeString(parsed.engine_no),
      vehicle_class: normalizeString(parsed.vehicle_class),
      fuel_type: normalizeString(parsed.fuel_type),
      expiry_date: normalizeString(parsed.expiry_date),
    };
  } catch (error) {
    logGeminiError(error, "rc-extract");
    throw error;
  }
};

// Backward-compatible exports used by existing controllers.
export const chatWithGemini = async ({ question, messages }) => {
  if (question) {
    return handleChatSupport(question);
  }
  const lastUserMessage = (messages || [])
    .filter((m) => m?.role === "user" && typeof m?.content === "string")
    .slice(-1)[0];
  return handleChatSupport(lastUserMessage?.content || "");
};

export const extractRcDetailsFromBase64 = async ({ base64Image }) => extractRCDetails(base64Image);
