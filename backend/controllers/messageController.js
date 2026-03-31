import Car from "../models/Car.js";
import Message from "../models/Message.js";
import MessageThread from "../models/MessageThread.js";
import User from "../models/User.js";
import cloudinary from "../config/cloudinary.js";

const formatParticipant = (thread, currentUserId) => {
  if (thread.buyerId === currentUserId) {
    return { id: thread.sellerId, name: thread.sellerName, email: thread.sellerEmail };
  }
  return { id: thread.buyerId, name: thread.buyerName, email: thread.buyerEmail };
};

const ensureThreadAccess = (thread, req) => {
  if (!thread) return false;
  if (req.user.role === "admin") return true;
  return thread.participants.includes(req.user.id);
};

export const startConversation = async (req, res, next) => {
  try {
    const { carId, text } = req.body || {};
    if (!carId) {
      res.status(400);
      throw new Error("carId is required");
    }

    const car = await Car.findById(carId);
    if (!car) {
      res.status(404);
      throw new Error("Car not found");
    }

    if (!car.ownerId) {
      res.status(400);
      throw new Error("Seller profile is unavailable for this listing");
    }

    if (car.ownerId === req.user.id) {
      res.status(400);
      throw new Error("You cannot message your own listing");
    }

    let thread = await MessageThread.findOne({
      carId: car._id,
      buyerId: req.user.id,
      sellerId: car.ownerId,
      threadType: "listing",
    });

    if (!thread) {
      thread = await MessageThread.create({
        threadType: "listing",
        carId: car._id,
        carTitle: car.title,
        directKey: "",
        participants: [req.user.id, car.ownerId],
        buyerId: req.user.id,
        buyerName: req.user.name || req.user.email,
        buyerEmail: req.user.email,
        sellerId: car.ownerId,
        sellerName: car.ownerName || car.ownerEmail || "Seller",
        sellerEmail: car.ownerEmail || "",
        lastMessageAt: new Date(),
      });
    }

    if (text && String(text).trim()) {
      await Message.create({
        threadId: thread._id,
        senderId: req.user.id,
        senderName: req.user.name || req.user.email,
        text: String(text).trim(),
        readBy: [req.user.id],
      });
      thread.lastMessageAt = new Date();
      await thread.save();
    }

    res.status(201).json(thread);
  } catch (error) {
    next(error);
  }
};

export const startDirectConversation = async (req, res, next) => {
  try {
    const { userId, text } = req.body || {};
    if (!userId) {
      res.status(400);
      throw new Error("userId is required");
    }

    if (userId === req.user.id) {
      res.status(400);
      throw new Error("You cannot message yourself");
    }

    const targetUser = await User.findOne({ googleId: userId });
    if (!targetUser) {
      res.status(404);
      throw new Error("User not found");
    }

    const directKey = [req.user.id, userId].sort().join(":");

    let thread = await MessageThread.findOne({
      threadType: "direct",
      directKey,
    });

    if (!thread) {
      thread = await MessageThread.create({
        threadType: "direct",
        directKey,
        carTitle: "Direct message",
        participants: [req.user.id, userId],
        buyerId: req.user.id,
        buyerName: req.user.name || req.user.email,
        buyerEmail: req.user.email,
        sellerId: targetUser.googleId,
        sellerName: targetUser.name || targetUser.email,
        sellerEmail: targetUser.email,
        lastMessageAt: new Date(),
      });
    }

    if (text && String(text).trim()) {
      await Message.create({
        threadId: thread._id,
        senderId: req.user.id,
        senderName: req.user.name || req.user.email,
        text: String(text).trim(),
        readBy: [req.user.id],
      });
      thread.lastMessageAt = new Date();
      await thread.save();
    }

    res.status(201).json(thread);
  } catch (error) {
    next(error);
  }
};

export const getThreads = async (req, res, next) => {
  try {
    const query = req.user.role === "admin" ? {} : { participants: req.user.id };
    const threads = await MessageThread.find(query).sort({ lastMessageAt: -1 });

    if (!threads.length) return res.json([]);

    const threadIds = threads.map((t) => t._id);

    const [lastMessages, unreadCounts] = await Promise.all([
      Message.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $sort: { createdAt: -1 } },
        { $group: {
          _id: "$threadId",
          text: { $first: "$text" },
          image: { $first: "$image" },
          senderName: { $first: "$senderName" },
          senderId: { $first: "$senderId" },
          createdAt: { $first: "$createdAt" },
        }},
      ]),
      Message.aggregate([
        { $match: {
          threadId: { $in: threadIds },
          senderId: { $ne: req.user.id },
          readBy: { $ne: req.user.id },
        }},
        { $group: { _id: "$threadId", count: { $sum: 1 } } },
      ]),
    ]);

    const lastMsgMap = new Map(lastMessages.map((m) => [String(m._id), m]));
    const unreadMap = new Map(unreadCounts.map((u) => [String(u._id), u.count]));

    const payload = threads.map((thread) => {
      const tid = String(thread._id);
      const last = lastMsgMap.get(tid);
      return {
        _id: thread._id,
        carId: thread.carId,
        carTitle: thread.carTitle,
        lastMessageAt: thread.lastMessageAt,
        participant: formatParticipant(thread, req.user.id),
        unreadCount: unreadMap.get(tid) || 0,
        lastMessage: last ? {
          text: last.text,
          image: last.image || null,
          senderName: last.senderName,
          senderId: last.senderId,
          createdAt: last.createdAt,
        } : null,
      };
    });

    res.json(payload);
  } catch (error) {
    next(error);
  }
};

export const getThreadMessages = async (req, res, next) => {
  try {
    const thread = await MessageThread.findById(req.params.threadId);
    if (!ensureThreadAccess(thread, req)) {
      res.status(404);
      throw new Error("Thread not found");
    }

    const messages = await Message.find({ threadId: thread._id }).sort({ createdAt: 1 });
    await Message.updateMany(
      {
        threadId: thread._id,
        senderId: { $ne: req.user.id },
        readBy: { $ne: req.user.id },
      },
      {
        $addToSet: { readBy: req.user.id },
      }
    );

    res.json({
      thread: {
        _id: thread._id,
        carId: thread.carId,
        carTitle: thread.carTitle,
        lastMessageAt: thread.lastMessageAt,
        participant: formatParticipant(thread, req.user.id),
      },
      messages,
    });
  } catch (error) {
    next(error);
  }
};

export const sendThreadMessage = async (req, res, next) => {
  try {
    const thread = await MessageThread.findById(req.params.threadId);
    if (!ensureThreadAccess(thread, req)) {
      res.status(404);
      throw new Error("Thread not found");
    }

    const text = String(req.body?.text || "").trim();
    if (!text) {
      res.status(400);
      throw new Error("Message text is required");
    }

    const message = await Message.create({
      threadId: thread._id,
      senderId: req.user.id,
      senderName: req.user.name || req.user.email,
      text,
      readBy: [req.user.id],
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const sendImageMessage = async (req, res, next) => {
  try {
    const thread = await MessageThread.findById(req.params.threadId);
    if (!ensureThreadAccess(thread, req)) {
      res.status(404);
      throw new Error("Thread not found");
    }

    if (!req.file) {
      res.status(400);
      throw new Error("Image file is required");
    }

    const b64 = req.file.buffer.toString("base64");
    const dataUri = `data:${req.file.mimetype};base64,${b64}`;

    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: "dreamcar/chat-images",
      resource_type: "image",
      transformation: [{ width: 1200, crop: "limit" }],
    });

    const message = await Message.create({
      threadId: thread._id,
      senderId: req.user.id,
      senderName: req.user.name || req.user.email,
      text: req.body?.text || "",
      image: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        width: uploaded.width,
        height: uploaded.height,
      },
      readBy: [req.user.id],
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    const io = req.app.get("io");
    if (io) {
      const threadRoomName = `thread:${thread._id}`;
      io.to(threadRoomName).emit("message:new", {
        threadId: String(thread._id),
        message,
      });
      const userRoom = (uid) => `user:${uid}`;
      thread.participants.forEach((pid) => {
        io.to(userRoom(pid)).emit("thread:updated", {
          threadId: String(thread._id),
          lastMessageAt: thread.lastMessageAt,
        });
      });
    }

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};

export const getMessageNotifications = async (req, res, next) => {
  try {
    const threads = await MessageThread.find({ participants: req.user.id })
      .select("_id carTitle buyerId sellerId")
      .sort({ lastMessageAt: -1 });

    if (!threads.length) {
      return res.json({ unreadCount: 0, items: [] });
    }

    const threadIds = threads.map((thread) => thread._id);
    const threadMap = new Map(threads.map((thread) => [String(thread._id), thread]));

    const unreadFilter = {
      threadId: { $in: threadIds },
      senderId: { $ne: req.user.id },
      readBy: { $ne: req.user.id },
    };

    const [unreadCount, unreadMessages] = await Promise.all([
      Message.countDocuments(unreadFilter),
      Message.find(unreadFilter).sort({ createdAt: -1 }).limit(10),
    ]);

    const items = unreadMessages.map((message) => {
      const thread = threadMap.get(String(message.threadId));
      return {
        _id: message._id,
        threadId: message.threadId,
        carTitle: thread?.carTitle || "Listing",
        senderName: message.senderName,
        text: message.text,
        createdAt: message.createdAt,
      };
    });

    res.json({ unreadCount, items });
  } catch (error) {
    next(error);
  }
};
