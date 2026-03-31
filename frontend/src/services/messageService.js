import api from "./api";

const NOTIFICATION_CACHE_TTL_MS = 10 * 1000;

let notificationRequest = null;
let notificationCache = {
  data: null,
  fetchedAt: 0,
};

export const startConversation = async (payload) => {
  const response = await api.post("/messages/start", payload);
  return response.data;
};

export const startDirectConversation = async (payload) => {
  const response = await api.post("/messages/start-direct", payload);
  return response.data;
};

export const getThreads = async () => {
  const response = await api.get("/messages/threads");
  return response.data;
};

export const getMessageNotifications = async ({ force = false } = {}) => {
  if (!force && notificationCache.fetchedAt && Date.now() - notificationCache.fetchedAt < NOTIFICATION_CACHE_TTL_MS) {
    return notificationCache.data;
  }

  if (notificationRequest) return notificationRequest;

  notificationRequest = api.get("/messages/notifications")
    .then((response) => {
      notificationCache = {
        data: response.data,
        fetchedAt: Date.now(),
      };
      return response.data;
    })
    .finally(() => {
      notificationRequest = null;
    });

  return notificationRequest;
};

export const getThreadMessages = async (threadId) => {
  const response = await api.get(`/messages/threads/${threadId}`);
  return response.data;
};

export const sendThreadMessage = async (threadId, text) => {
  const response = await api.post(`/messages/threads/${threadId}/messages`, { text });
  return response.data;
};

export const sendImageMessage = async (threadId, file, text = "") => {
  const formData = new FormData();
  formData.append("image", file);
  if (text) formData.append("text", text);
  const response = await api.post(`/messages/threads/${threadId}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const clearMessageNotificationCache = () => {
  notificationRequest = null;
  notificationCache = {
    data: null,
    fetchedAt: 0,
  };
};
