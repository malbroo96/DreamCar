import api, { setStoredToken } from "./api";

const AUTH_USER_KEY = "dreamcar_auth_user";
const CURRENT_USER_CACHE_TTL_MS = 30 * 1000;

let currentUserRequest = null;
let currentUserCache = {
  user: null,
  fetchedAt: 0,
};
let googleLoginRequest = null;

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (!user) {
    localStorage.removeItem(AUTH_USER_KEY);
    currentUserCache = { user: null, fetchedAt: 0 };
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  currentUserCache = { user, fetchedAt: Date.now() };
};

export const loginWithGoogleCredential = async (credential) => {
  if (googleLoginRequest) return googleLoginRequest;

  googleLoginRequest = api.post("/auth/google", { credential })
    .then((response) => {
      const { token, user } = response.data;
      setStoredToken(token);
      setStoredUser(user);
      return user;
    })
    .finally(() => {
      googleLoginRequest = null;
    });

  return googleLoginRequest;
};

export const refreshCurrentUser = async ({ force = false } = {}) => {
  const token = localStorage.getItem("dreamcar_auth_token");
  if (!token) return null;

  if (!force && currentUserCache.fetchedAt && Date.now() - currentUserCache.fetchedAt < CURRENT_USER_CACHE_TTL_MS) {
    return currentUserCache.user;
  }

  if (currentUserRequest) return currentUserRequest;

  currentUserRequest = api.get("/auth/me")
    .then((response) => {
      const user = response.data?.user || null;
      if (user) setStoredUser(user);
      return user;
    })
    .finally(() => {
      currentUserRequest = null;
    });

  return currentUserRequest;
};

export const logout = () => {
  setStoredToken(null);
  setStoredUser(null);
  googleLoginRequest = null;
  currentUserRequest = null;
};
