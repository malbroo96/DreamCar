import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./config/db.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import chatbotRouter from "./routes/chatbot.js";
import inspectionRoutes from "./routes/inspectionRoutes.js";
import { registerMessageSocketHandlers } from "./socket/messageSocket.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",").map((o) => o.trim()).filter(Boolean);

const io = new SocketIOServer(server, {
  cors: { origin: allowedOrigins.length ? allowedOrigins : true, credentials: true },
});
registerMessageSocketHandlers(io);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ── Rate limiters ── */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // stricter for auth
  message: { message: "Too many auth attempts, please try again later." },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 15, // 15 chatbot messages per minute
  message: { message: "Slow down — too many messages. Please wait a moment." },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // max 30 car listings per hour
  message: { message: "Too many listings created. Please try again later." },
});

app.use("/api", generalLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/chat", chatLimiter);

app.get("/api/health", (_, res) => res.json({ ok: true, service: "dreamcar-backend" }));

app.use("/api/cars",        carRoutes);
app.use("/api/admin",       adminRoutes);
app.use("/api/auth",        authRoutes);
app.use("/api/users",       userRoutes);
app.use("/api/messages",    messageRoutes);
app.use("/api/ai",          aiRoutes);
app.use("/api/chat",        chatbotRouter);
app.use("/api/inspections", inspectionRoutes);

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch((err) => { console.error("Failed to start server", err); process.exit(1); });
