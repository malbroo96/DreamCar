import Car from "../models/Car.js";
import Message from "../models/Message.js";
import MessageThread from "../models/MessageThread.js";

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
    });

    if (!thread) {
      thread = await MessageThread.create({
        carId: car._id,
        carTitle: car.title,
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

    const payload = threads.map((thread) => ({
      _id: thread._id,
      carId: thread.carId,
      carTitle: thread.carTitle,
      lastMessageAt: thread.lastMessageAt,
      participant: formatParticipant(thread, req.user.id),
    }));

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
    });

    thread.lastMessageAt = new Date();
    await thread.save();

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
};
