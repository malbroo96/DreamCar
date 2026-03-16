import "dotenv/config";

import express from "express";
import http from "http";
import cors from "cors";
import morgan from "morgan";
import { Server as SocketIOServer } from "socket.io";
import { connectDB } from "./config/db.js";
import carRoutes from "./routes/carRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import chatbotRouter from "./routes/chatbot.js";
import { registerMessageSocketHandlers } from "./socket/messageSocket.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  },
});
registerMessageSocketHandlers(io);

app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "dreamcar-backend" });
});

app.use("/api/cars",     carRoutes);
app.use("/api/admin",    adminRoutes);
app.use("/api/auth",     authRoutes);
app.use("/api/users",    userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/chat",     chatbotRouter);   // DreamBot — POST /api/chat/support

app.use(notFound);
app.use(errorHandler);

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });