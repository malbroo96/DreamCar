import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { sanitizeBody } from "./middleware/sanitize.js";
import { connectDB } from "./config/db.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatbotRouter from "./routes/chatbot.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { registerMessageSocketHandlers } from "./socket/messageSocket.js";
import { setIO } from "./services/notificationService.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",").map((o) => o.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";

const io = new SocketIOServer(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : true, credentials: true },
});
registerMessageSocketHandlers(io);
setIO(io);
app.set("io", io);

const corsOrigin = allowedOrigins.length ? allowedOrigins : (isProduction ? false : true);
app.use(helmet({ crossOriginEmbedderPolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({
  verify: (req, _res, buf) => {
    if (req.originalUrl === "/api/payments/webhook") {
      req.rawBody = buf.toString("utf8");
    }
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeBody);
app.use(morgan("dev"));

/* ── Rate limiters ── */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 500 : 5000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProduction ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many auth attempts, please try again later." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 chatbot messages per minute
  message: { message: "Slow down — too many messages. Please wait a moment." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { message: "Too many listings created. Please try again later." },
});

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { message: "Too many messages. Please slow down." },
});

app.use("/api", generalLimiter);
app.use("/api/chat", chatLimiter);

app.get("/api/health", (_, res) => res.json({ ok: true, service: "dreamcar-backend" }));

app.get("/api/sitemap.xml", async (_, res) => {
  try {
    const Car = (await import("./models/Car.js")).default;
    const cars = await Car.find({ status: "approved" }).select("_id updatedAt").lean();
    const frontendUrl = process.env.FRONTEND_URL || "https://dreamcar-omega.vercel.app";
    const urls = [
      { loc: frontendUrl, priority: "1.0" },
      { loc: `${frontendUrl}/login`, priority: "0.5" },
      ...cars.map((c) => ({
        loc: `${frontendUrl}/cars/${c._id}`,
        lastmod: c.updatedAt?.toISOString()?.split("T")[0],
        priority: "0.8",
      })),
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}<priority>${u.priority}</priority></url>`).join("\n")}
</urlset>`;
    res.header("Content-Type", "application/xml").send(xml);
  } catch {
    res.status(500).send("Error generating sitemap");
  }
});

app.get("/api/cars", (_req, res, next) => {
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
  next();
});

app.use("/api/auth/google", authLimiter);
app.post("/api/cars", uploadLimiter);
app.use("/api/cars",        carRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/messages", messageLimiter);
app.use("/api/messages",    messageRoutes);
app.use("/api/ai",          aiRoutes);
app.use("/api/chat",        chatbotRouter);
app.use("/api/inspections", inspectionRoutes);
app.use("/api/payments",       paymentRoutes);
app.use("/api/notifications",  notificationRoutes);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "DreamCar API Docs",
}));

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  }))
  .catch((err) => { console.error("Failed to start server", err); process.exit(1); });
