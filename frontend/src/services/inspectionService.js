import api from "./api";

export const requestInspection = async (carId, data) => {
  const response = await api.post(`/inspections/request/${carId}`, data);
  return response.data;
};

export const getMyInspections = async () => {
  const response = await api.get("/inspections/my");
  return response.data;
};

export const cancelInspection = async (id) => {
  const response = await api.patch(`/inspections/cancel/${id}`);
  return response.data;
};

export const getAllInspections = async (status = "") => {
  const response = await api.get("/inspections/admin/all", { params: status ? { status } : {} });
  return response.data;
};

export const getInspectionStats = async () => {
  const response = await api.get("/inspections/admin/stats");
  return response.data;
};

export const updateInspectionStatus = async (id, data) => {
  const response = await api.patch(`/inspections/admin/${id}`, data);
  return response.data;
};