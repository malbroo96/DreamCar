import { GoogleGenerativeAI } from "@google/generative-ai";
import Car from "../models/Car.js";

const SYSTEM_PROMPT = `You are DreamBot, the friendly and helpful AI customer support assistant for DreamCar — an online car marketplace based in India where car dealers can list cars for sale and buyers can browse listings, contact dealers, and communicate via chat.

Your role is to help users navigate and use the DreamCar platform. Keep answers concise, friendly, and practical.

DreamCar site map you know about:
- / : Home page with hero search, brand chips, city filters, featured cars, all listings, services, reviews, and news.
- /login : Google sign-in page.
- /add-car : Sell car page where dealers create a listing and upload photos plus the RC document.
- /cars/:id : Car detail page with full car info, inspection details, and dealer contact options.
- /dealer/:id : Public dealer profile page with dealer details and their approved listings.
- /messages : Chat inbox for buyer and seller conversations.
- /profile : User profile page to manage account details and personal listings.
- /inspections : Inspection-related page for vehicle inspections and reports.
- /admin : Admin dashboard for admins only.

Platform features you know about:
- BUYING: Browse the homepage to see all car listings. Filter by location, price, year, brand. Click any car card to view full details and contact the dealer.
- CONTACTING DEALER: On any car detail page there is a "Contact Dealer" or "Message Dealer" button. This opens a chat thread with that dealer. You can also visit the Messages page to see all your conversations.
- SELLING / LISTING A CAR: Log in, click "Sell Car" in the navigation bar. Fill out the car listing form with title, price, year, location, description, photos, and RC document.
- RC DOCUMENT: When listing a car, you must upload the vehicle's Registration Certificate (RC). It is stored securely and is never visible to buyers.
- MESSAGES: The Messages page shows all your conversations. Left sidebar lists all chat threads. Click a thread to open the chat window.
- PROFILE: Click "Profile" in the navigation. You can update your name, username, bio, phone, location, and profile photo.
- LOGIN: DreamCar uses Google Sign-In. Click "Login" and sign in with your Google account.
- EDITING/DELETING LISTINGS: Go to Profile page, find your listing, and use the Edit or Delete buttons on each car card.
- ACCOUNT ISSUES: If you cannot log in, try a different Google account or clear your browser cache.

When matching car listings are provided to you separately, mention that matching cars are shown below and summarize them briefly. Do not invent listings.

Always be helpful. If you don't know something platform-specific, say so honestly.`;

const CAR_BRANDS = [
  "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota", "Kia", "Ford",
  "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Skoda", "Renault", "Nissan", "MG", "Jeep",
];

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "CVT", "AMT"];
const CAR_QUERY_HINTS = /\b(car|cars|buy|looking|search|show|find|need|want|vehicle|suv|hatchback|sedan|automatic|manual|petrol|diesel|electric|hybrid|cng)\b/i;

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toLakhValue = (value) => Number(value) * 100000;

const buildListingFilters = (query) => {
  const text = String(query || "").trim();
  const filters = { status: "approved" };
  const orFilters = [];

  const brand = CAR_BRANDS.find((item) => new RegExp(`\\b${escapeRegex(item)}\\b`, "i").test(text));
  if (brand) {
    filters.brand = new RegExp(`^${escapeRegex(brand)}$`, "i");
  }

  const fuelType = FUEL_TYPES.find((item) => new RegExp(`\\b${escapeRegex(item)}\\b`, "i").test(text));
  if (fuelType) {
    filters.fuelType = fuelType;
  }

  const transmission = TRANSMISSIONS.find((item) => new RegExp(`\\b${escapeRegex(item)}\\b`, "i").test(text));
  if (transmission) {
    filters.transmission = transmission;
  }

  const underMatch = text.match(/under\s+(\d+(?:\.\d+)?)\s*lakh/i);
  const betweenMatch = text.match(/between\s+(\d+(?:\.\d+)?)\s*lakh\s+and\s+(\d+(?:\.\d+)?)\s*lakh/i);
  if (betweenMatch) {
    filters.price = {
      $gte: toLakhValue(betweenMatch[1]),
      $lte: toLakhValue(betweenMatch[2]),
    };
  } else if (underMatch) {
    filters.price = { $lte: toLakhValue(underMatch[1]) };
  }

  const cleanedTerms = text
    .replace(/\b(need|want|show|find|looking|for|cars?|car|buy|me|please|nearby|near|under|between|lakh|automatic|manual|petrol|diesel|electric|hybrid|cng)\b/gi, " ")
    .split(/[\s,]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 3);

  cleanedTerms.forEach((term) => {
    const regex = new RegExp(escapeRegex(term), "i");
    orFilters.push(
      { title: regex },
      { model: regex },
      { city: regex },
      { area: regex },
      { location: regex }
    );
  });

  if (orFilters.length) {
    filters.$or = orFilters;
  }

  return filters;
};

const shouldSearchListings = (query = "") => CAR_QUERY_HINTS.test(String(query || ""));

const formatListing = (car) => ({
  id: car._id,
  title: car.title,
  brand: car.brand,
  model: car.model,
  year: car.year,
  price: car.price,
  fuelType: car.fuelType,
  transmission: car.transmission,
  city: car.city,
  location: car.location,
  image: car.images?.[0]?.url || "",
});

const findMatchingListings = async (query) => {
  if (!shouldSearchListings(query)) return [];

  const filters = buildListingFilters(query);
  const cars = await Car.find(filters)
    .sort({ featured: -1, createdAt: -1 })
    .limit(5)
    .select("_id title brand model year price fuelType transmission city location images");

  return cars.map(formatListing);
};

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
    const matchingListings = await findMatchingListings(lastMessage.content);
    const listingContext = matchingListings.length
      ? `\n\nMatching listings available right now:\n${matchingListings.map((car, index) => (
        `${index + 1}. ${car.title} | ${car.year} | ${car.city || car.location} | Rs ${Number(car.price || 0).toLocaleString("en-IN")}`
      )).join("\n")}`
      : "";

    const chat  = model.startChat({ history });
    const result = await chat.sendMessage(`${lastMessage.content}${listingContext}`);
    const replyText = result.response.text()?.trim()
      || "Sorry, I couldn't process that. Please try again.";

    const content = [{ type: "text", text: replyText }];

    if (matchingListings.length) {
      content.push({ type: "listings", items: matchingListings });
    }

    return res.json({ content });
  } catch (error) {
    console.error("Chat support error:", error?.message || error);
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
};
