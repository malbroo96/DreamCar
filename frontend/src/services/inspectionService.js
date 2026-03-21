import api from "./api";

const MY_INSPECTIONS_CACHE_TTL_MS = 10 * 1000;

let myInspectionsRequest = null;
let myInspectionsCache = {
  data: null,
  fetchedAt: 0,
};

export const requestInspection = (carId, data) => api.post(`/inspections/request/${carId}`, data).then((r) => r.data);
export const getMyInspections = ({ force = false } = {}) => {
  if (!force && myInspectionsCache.fetchedAt && Date.now() - myInspectionsCache.fetchedAt < MY_INSPECTIONS_CACHE_TTL_MS) {
    return Promise.resolve(myInspectionsCache.data);
  }

  if (myInspectionsRequest) return myInspectionsRequest;

  myInspectionsRequest = api.get("/inspections/my")
    .then((response) => {
      myInspectionsCache = {
        data: response.data,
        fetchedAt: Date.now(),
      };
      return response.data;
    })
    .finally(() => {
      myInspectionsRequest = null;
    });

  return myInspectionsRequest;
};
export const cancelInspection = (id) => api.patch(`/inspections/cancel/${id}`).then((r) => r.data);

export const getAvailableInspections = () => api.get("/inspections/available").then((r) => r.data);
export const acceptInspection = (id) => api.patch(`/inspections/accept/${id}`).then((r) => r.data);
export const getMyJobs = () => api.get("/inspections/my-jobs").then((r) => r.data);
export const submitReport = (id, payload) => api.post(`/inspections/submit-report/${id}`, payload).then((r) => r.data);

export const getMyApplication = () => api.get("/inspections/my-application").then((r) => r.data);
export const saveInspectorApplicationBasic = (data) => api.put("/inspections/application/basic", data).then((r) => r.data);
export const saveInspectorApplicationExperience = (data) => api.put("/inspections/application/experience", data).then((r) => r.data);
export const saveInspectorApplicationDocuments = (payload) => api.put("/inspections/application/documents", payload).then((r) => r.data);
export const submitInspectorApplication = () => api.post("/inspections/application/submit").then((r) => r.data);

export const getAllInspections = (status = "") =>
  api.get("/inspections/admin/all", { params: status ? { status } : {} }).then((r) => r.data);
export const getInspectionStats = () => api.get("/inspections/admin/stats").then((r) => r.data);
export const updateInspectionStatus = (id, data) => api.patch(`/inspections/admin/${id}`, data).then((r) => r.data);
export const getAllApplications = (params = {}) =>
  api.get("/inspections/admin/applications", { params }).then((r) => r.data);
export const reviewApplication = (id, data) => api.patch(`/inspections/admin/applications/${id}`, data).then((r) => r.data);
export const getApplicationDocumentPreview = (id, docType) =>
  api.get(`/inspections/admin/applications/${id}/documents/${docType}`).then((r) => r.data);

export const clearInspectionCache = () => {
  myInspectionsRequest = null;
  myInspectionsCache = {
    data: null,
    fetchedAt: 0,
  };
};
