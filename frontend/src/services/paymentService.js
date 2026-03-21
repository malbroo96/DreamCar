import api from "./api";

export const createInspectionOrder = (payload) =>
  api.post("/payments/create-order", payload).then((response) => response.data);

export const verifyInspectionPayment = (payload) =>
  api.post("/payments/verify-payment", payload).then((response) => response.data);

export const getMyPayments = () =>
  api.get("/payments/my").then((response) => response.data);
