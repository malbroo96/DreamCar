import Notification from "../models/Notification.js";

let _io = null;

export const setIO = (io) => {
  _io = io;
};

export const getIO = () => _io;

export const createAndEmitNotification = async ({
  recipientId,
  type,
  title,
  message,
  data = {},
}) => {
  const notification = await Notification.create({
    recipientId,
    type,
    title,
    message,
    data,
  });

  if (_io) {
    _io.to(`user:${recipientId}`).emit("notification:new", {
      _id: notification._id,
      recipientId: notification.recipientId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: notification.read,
      createdAt: notification.createdAt,
    });
  }

  return notification;
};

export const notifyMany = async (recipientIds, { type, title, message, data = {} }) => {
  const unique = [...new Set(recipientIds.filter(Boolean))];
  return Promise.all(
    unique.map((recipientId) =>
      createAndEmitNotification({ recipientId, type, title, message, data })
    )
  );
};
