import api from "./api";

export const getMyProfile = async () => {
  const response = await api.get("/users/me");
  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await api.put("/users/me", payload);
  return response.data;
};
