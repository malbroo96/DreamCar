import { io } from "socket.io-client";
import { getStoredToken } from "./api";

let socket = null;

const resolveSocketUrl = () => {
  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (!apiBase || apiBase === "/api") {
    return window.location.origin;
  }

  if (apiBase.startsWith("http://") || apiBase.startsWith("https://")) {
    return apiBase.replace(/\/api\/?$/, "");
  }

  return window.location.origin;
};

export const connectSocket = () => {
  if (socket?.connected) return socket;

  socket = io(resolveSocketUrl(), {
    transports: ["websocket", "polling"],
    auth: {
      token: getStoredToken(),
    },
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (!socket) return;
  socket.disconnect();
  socket = null;
};
