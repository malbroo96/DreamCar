import jwt from "jsonwebtoken";
import Message from "../models/Message.js";
import MessageThread from "../models/MessageThread.js";

const getBearerToken = (value = "") => {
  if (typeof value !== "string") return null;
  if (!value.startsWith("Bearer ")) return null;
  return value.slice(7).trim();
};

const getSocketToken = (socket) => {
  const authToken = socket.handshake?.auth?.token;
  if (authToken) return authToken;
  return getBearerToken(socket.handshake?.headers?.authorization || "");
};

const verifySocketUser = (socket) => {
  const token = getSocketToken(socket);
  if (!token) {
    throw new Error("Unauthorized");
  }

  const secret = process.env.APP_JWT_SECRET;
  if (!secret) {
    throw new Error("APP_JWT_SECRET is not configured");
  }

  const decoded = jwt.verify(token, secret);
  return {
    id: decoded.sub,
    email: decoded.email,
    name: decoded.name,
    role: decoded.role,
  };
};

const canAccessThread = (thread, user) => {
  if (!thread || !user) return false;
  if (user.role === "admin") return true;
  return thread.participants.includes(user.id);
};

const threadRoom = (threadId) => `thread:${threadId}`;
const userRoom = (userId) => `user:${userId}`;

const onlineUserIds = new Set();

export const registerMessageSocketHandlers = (io) => {
  io.use((socket, next) => {
    try {
      socket.user = verifySocketUser(socket);
      return next();
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    const uid = socket.user.id;
    socket.join(userRoom(uid));

    onlineUserIds.add(uid);
    io.emit("user:online", { userId: uid, online: true });

    socket.on("presence:getOnline", (_, ack) => {
      if (typeof ack === "function") ack({ userIds: [...onlineUserIds] });
    });

    socket.on("thread:join", async ({ threadId }, ack) => {
      try {
        const thread = await MessageThread.findById(threadId);
        if (!canAccessThread(thread, socket.user)) {
          throw new Error("Thread not found");
        }
        socket.join(threadRoom(threadId));
        if (typeof ack === "function") ack({ ok: true });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message || "Failed to join thread" });
      }
    });

    socket.on("thread:leave", ({ threadId }) => {
      if (!threadId) return;
      socket.leave(threadRoom(threadId));
    });

    socket.on("user:typing", ({ threadId }) => {
      if (!threadId) return;
      socket.to(threadRoom(threadId)).emit("user:typing", {
        threadId: String(threadId),
        userId: uid,
      });
    });

    socket.on("thread:markRead", async ({ threadId }, ack) => {
      try {
        if (!threadId) throw new Error("threadId required");
        const result = await Message.updateMany(
          {
            threadId,
            senderId: { $ne: uid },
            readBy: { $ne: uid },
          },
          { $addToSet: { readBy: uid } }
        );
        io.to(threadRoom(threadId)).emit("message:read", {
          threadId: String(threadId),
          readBy: uid,
        });
        if (typeof ack === "function") ack({ ok: true, updated: result.modifiedCount });
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message });
      }
    });

    socket.on("message:send", async ({ threadId, text }, ack) => {
      try {
        const cleanText = String(text || "").trim();
        if (!threadId || !cleanText) {
          throw new Error("threadId and text are required");
        }

        const thread = await MessageThread.findById(threadId);
        if (!canAccessThread(thread, socket.user)) {
          throw new Error("Thread not found");
        }

        const message = await Message.create({
          threadId: thread._id,
          senderId: socket.user.id,
          senderName: socket.user.name || socket.user.email,
          text: cleanText,
          readBy: [socket.user.id],
        });

        thread.lastMessageAt = new Date();
        await thread.save();

        io.to(threadRoom(threadId)).emit("message:new", {
          threadId: String(threadId),
          message,
        });

        io.to(userRoom(socket.user.id)).emit("thread:updated", {
          threadId: String(threadId),
          lastMessageAt: thread.lastMessageAt,
        });
        thread.participants
          .filter((participantId) => participantId !== socket.user.id)
          .forEach((participantId) => {
            io.to(userRoom(participantId)).emit("thread:updated", {
              threadId: String(threadId),
              lastMessageAt: thread.lastMessageAt,
            });
          });

        if (typeof ack === "function") {
          ack({ ok: true, message });
        }
      } catch (error) {
        if (typeof ack === "function") ack({ ok: false, message: error.message || "Failed to send message" });
      }
    });

    socket.on("disconnect", () => {
      const sockets = io.sockets.sockets;
      let stillConnected = false;
      for (const [, s] of sockets) {
        if (s.user?.id === uid && s.id !== socket.id) {
          stillConnected = true;
          break;
        }
      }
      if (!stillConnected) {
        onlineUserIds.delete(uid);
        io.emit("user:online", { userId: uid, online: false });
      }
    });
  });
};
