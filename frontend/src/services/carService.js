import api from "./api";

export const getCars = async (params) => {
  const response = await api.get("/cars", { params });
  return response.data;
};

export const getCarById = async (id) => {
  const response = await api.get(`/cars/${id}`);
  return response.data;
};

export const createCar = async (payload) => {
  const response = await api.post("/cars", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateCar = async (id, payload) => {
  const response = await api.put(`/cars/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteCar = async (id) => {
  const response = await api.delete(`/cars/${id}`);
  return response.data;
};

export const getAdminCars = async () => {
  const response = await api.get("/admin/cars");
  return response.data;
};

export const updateAdminCar = async (id, payload) => {
  const response = await api.put(`/admin/cars/${id}`, payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteAdminCar = async (id) => {
  const response = await api.delete(`/admin/cars/${id}`);
  return response.data;
};
