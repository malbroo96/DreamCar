import api from "./api";

/* ── Buyer ── */
export const requestInspection   = (carId, data)  => api.post(`/inspections/request/${carId}`, data).then(r => r.data);
export const getMyInspections    = ()             => api.get("/inspections/my").then(r => r.data);
export const cancelInspection    = (id)           => api.patch(`/inspections/cancel/${id}`).then(r => r.data);

/* ── Inspector ── */
export const getAvailableInspections = ()    => api.get("/inspections/available").then(r => r.data);
export const acceptInspection        = (id)  => api.patch(`/inspections/accept/${id}`).then(r => r.data);
export const getMyJobs               = ()    => api.get("/inspections/my-jobs").then(r => r.data);
export const submitReport            = (id, payload) => api.post(`/inspections/submit-report/${id}`, payload).then(r => r.data);

/* ── Application ── */
export const applyAsInspector  = (payload) => api.post("/inspections/apply", payload).then(r => r.data);
export const getMyApplication  = ()        => api.get("/inspections/my-application").then(r => r.data);

/* ── Admin ── */
export const getAllInspections      = (status = "") => api.get("/inspections/admin/all",          { params: status ? { status } : {} }).then(r => r.data);
export const getInspectionStats     = ()            => api.get("/inspections/admin/stats").then(r => r.data);
export const updateInspectionStatus = (id, data)    => api.patch(`/inspections/admin/${id}`, data).then(r => r.data);
export const getAllApplications      = (status = "") => api.get("/inspections/admin/applications", { params: status ? { status } : {} }).then(r => r.data);
export const reviewApplication      = (id, data)    => api.patch(`/inspections/admin/applications/${id}`, data).then(r => r.data);