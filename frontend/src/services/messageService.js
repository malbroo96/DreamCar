import api from "./api";

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

export const getMessageNotifications = async () => {
  const response = await api.get("/messages/notifications");
  return response.data;
};

export const getThreadMessages = async (threadId) => {
  const response = await api.get(`/messages/threads/${threadId}`);
  return response.data;
};

export const sendThreadMessage = async (threadId, text) => {
  const response = await api.post(`/messages/threads/${threadId}/messages`, { text });
  return response.data;
};
