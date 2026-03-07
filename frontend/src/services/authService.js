import api, { setStoredToken } from "./api";

const AUTH_USER_KEY = "dreamcar_auth_user";

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
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

export const loginWithGoogleCredential = async (credential) => {
  const response = await api.post("/auth/google", { credential });
  const { token, user } = response.data;
  setStoredToken(token);
  setStoredUser(user);
  return user;
};

export const logout = () => {
  setStoredToken(null);
  setStoredUser(null);
};
