import api from "./api";

export const getCars = async (params) => {
  const response = await api.get("/cars", { params });
  return response.data;
};

export const getCarById = async (id) => {
  const response = await api.get(`/cars/${id}`);
  return response.data;
};

export const extractCarFromRC = async (file) => {
  const payload = new FormData();
  payload.append("rcDocument", file);
  const response = await api.post("/cars/rc-extract", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const createCar = async (payload) => {
  const response = await api.post("/cars", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const extractCarFromRc = async (file) => {
  const payload = new FormData();
  payload.append("rcBook", file);
  const response = await api.post("/cars/rc-extract", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const getRcExtractionHealth = async () => {
  const response = await api.get("/cars/rc-health");
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

/* ── RC Document: get a short-lived signed URL (owner/admin only) ── */
export const getRCDocumentUrl = async (carId) => {
  const response = await api.get(`/cars/${carId}/rc-url`);
  return response.data; // { url, expiresAt, format }
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
