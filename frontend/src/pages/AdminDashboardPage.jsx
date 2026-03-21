import { useEffect, useState } from "react";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import { deleteAdminCar, getAdminCars, updateAdminCar } from "../services/carService";
import {
  getAllInspections,
  getInspectionStats,
  updateInspectionStatus,
  getAllApplications,
  reviewApplication,
  getApplicationDocumentPreview,
} from "../services/inspectionService";
import "./AdminDashboardPage.css";

const STATUS_COLORS = {
  pending: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  approved: { bg: "#d1fae5", color: "#065f46", label: "Approved" },
  rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
  submitted: { bg: "#fef3c7", color: "#92400e", label: "Submitted" },
  under_review: { bg: "#dbeafe", color: "#1e40af", label: "Under Review" },
};

const REJECTION_OPTIONS = [
  { value: "insufficient_experience", label: "Insufficient experience" },
  { value: "missing_documents", label: "Missing documents" },
  { value: "invalid_documents", label: "Invalid documents" },
  { value: "poor_skill_match", label: "Poor skill match" },
  { value: "profile_mismatch", label: "Profile mismatch" },
  { value: "other", label: "Other" },
];

const DOC_TYPES = [
  { key: "experienceCertificate", label: "Experience Certificate" },
  { key: "educationCertificate", label: "Educational Certificate" },
  { key: "idProof", label: "ID Proof" },
];

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab] = useState("cars");
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError] = useState("");

  const [inspections, setInspections] = useState([]);
  const [inspStats, setInspStats] = useState(null);
  const [inspLoading, setInspLoading] = useState(false);
  const [inspFilter, setInspFilter] = useState("");
  const [selectedInsp, setSelectedInsp] = useState(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [updatingInsp, setUpdatingInsp] = useState(false);

  const [applications, setApplications] = useState([]);
  const [appLoading, setAppLoading] = useState(false);
  const [appStatusFilter, setAppStatusFilter] = useState("");
  const [appQualityFilter, setAppQualityFilter] = useState("");
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [appPagination, setAppPagination] = useState({ page: 1, totalPages: 1 });
  const [reviewForm, setReviewForm] = useState({ status: "under_review", rejectionCode: "missing_documents", rejectionReason: "", adminNotes: "" });
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchCars = async () => {
    try {
      setCarsLoading(true);
      const data = await getAdminCars();
      setCars(data);
    } catch (err) {
      setCarsError(err.response?.data?.message || "Failed to load cars");
    } finally {
      setCarsLoading(false);
    }
  };

  const fetchInspections = async () => {
    try {
      setInspLoading(true);
      const [data, stats] = await Promise.all([getAllInspections(inspFilter), getInspectionStats()]);
      setInspections(data);
      setInspStats(stats);
    } finally {
      setInspLoading(false);
    }
  };

  const fetchApplications = async (page = 1) => {
    try {
      setAppLoading(true);
      const data = await getAllApplications({
        page,
        limit: 10,
        ...(appStatusFilter ? { status: appStatusFilter } : {}),
        ...(appQualityFilter ? { quality: appQualityFilter } : {}),
      });
      setApplications(data.applications || []);
      setAppPagination(data.pagination || { page: 1, totalPages: 1 });
    } finally {
      setAppLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, []);
  useEffect(() => { if (activeTab === "inspections") fetchInspections(); }, [activeTab, inspFilter]);
  useEffect(() => {
    if (activeTab === "applications") fetchApplications(1);
  }, [activeTab, appStatusFilter, appQualityFilter]);

  const handleDeleteCar = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    await deleteAdminCar(id);
    setCars((prev) => prev.filter((c) => c._id !== id));
    if (selectedCar?._id === id) setSelectedCar(null);
  };

  const handleUpdateCar = async (payload) => {
    if (!selectedCar) return;
    await updateAdminCar(selectedCar._id, payload);
    await fetchCars();
    setSelectedCar(null);
  };

  const handleUpdateInspection = async (id, status) => {
    try {
      setUpdatingInsp(true);
      await updateInspectionStatus(id, { status, adminNotes: adminNotes || undefined, inspectionDate: inspectionDate || undefined });
      setSelectedInsp(null);
      setAdminNotes("");
      setInspectionDate("");
      await fetchInspections();
    } finally {
      setUpdatingInsp(false);
    }
  };

  const handleReviewApplication = async () => {
    if (!selectedApplication) return;
    const response = await reviewApplication(selectedApplication._id, reviewForm);
    setSelectedApplication(response.application);
    await fetchApplications(appPagination.page);
  };

  const openDocumentPreview = async (docType) => {
    if (!selectedApplication) return;
    const document = await getApplicationDocumentPreview(selectedApplication._id, docType);
    setPreviewDoc(document);
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">Admin Dashboard</h1>
        <p className="adm-sub">Manage listings, inspections, and the inspector onboarding pipeline.</p>
      </div>

      <div className="adm-tabs">
        <button className={`adm-tab ${activeTab === "cars" ? "adm-tab--active" : ""}`} onClick={() => setActiveTab("cars")}>Car Listings <span className="adm-tab-badge">{cars.length}</span></button>
        <button className={`adm-tab ${activeTab === "inspections" ? "adm-tab--active" : ""}`} onClick={() => setActiveTab("inspections")}>Inspections {inspStats?.requested > 0 && <span className="adm-tab-badge adm-tab-badge--alert">{inspStats.requested}</span>}</button>
        <button className={`adm-tab ${activeTab === "applications" ? "adm-tab--active" : ""}`} onClick={() => setActiveTab("applications")}>Inspector Applications {inspStats?.pendingApplications > 0 && <span className="adm-tab-badge adm-tab-badge--alert">{inspStats.pendingApplications}</span>}</button>
      </div>

      {activeTab === "cars" && (
        <div>
          {carsError && <p style={{ color: "#dc2626" }}>{carsError}</p>}
          {carsLoading && <p style={{ color: "#7a96b4" }}>Loading listings...</p>}
          {selectedCar && (
            <div className="adm-edit-section">
              <div className="adm-edit-header">
                <h2 className="adm-edit-title">Edit Listing</h2>
                <button className="btn btn-secondary" onClick={() => setSelectedCar(null)}>Cancel</button>
              </div>
              <CarForm key={selectedCar._id} initialValues={selectedCar} hasExistingRC={Boolean(selectedCar.rcDocument?.publicId)} includeStatus submitLabel="Update Listing" onSubmit={handleUpdateCar} />
            </div>
          )}
          <div className="car-grid">
            {cars.map((car) => (
              <CarCard
                key={car._id}
                car={car}
                adminActions={
                  <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => { setSelectedCar(car); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button>
                    <button className="btn btn-danger" onClick={() => handleDeleteCar(car._id)}>Delete</button>
                  </div>
                }
              />
            ))}
          </div>
        </div>
      )}

      {activeTab === "inspections" && (
        <div>
          {inspStats && (
            <div className="adm-stats-grid">
              {[
                { label: "Total", value: inspStats.total, color: "#0b6ef3" },
                { label: "Requested", value: inspStats.requested, color: "#d97706" },
                { label: "Accepted", value: inspStats.accepted, color: "#16a34a" },
                { label: "Completed", value: inspStats.completed, color: "#7c3aed" },
                { label: "Rejected", value: inspStats.rejected, color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className="adm-stat-card card">
                  <span className="adm-stat-value" style={{ color: s.color }}>{s.value}</span>
                  <span className="adm-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="adm-filter-row">
            {["", "requested", "accepted", "rejected", "completed"].map((s) => (
              <button key={s || "all"} type="button" className={`adm-filter-btn ${inspFilter === s ? "adm-filter-btn--active" : ""}`} onClick={() => setInspFilter(s)}>{s || "all"}</button>
            ))}
          </div>

          {inspLoading && <p style={{ color: "#7a96b4" }}>Loading inspections...</p>}
          <div className="adm-insp-list">
            {inspections.map((insp) => {
              const sc = STATUS_COLORS[insp.status] || STATUS_COLORS.pending;
              const isSelected = selectedInsp?._id === insp._id;
              return (
                <div key={insp._id} className="adm-insp-card card">
                  <div className="adm-insp-top">
                    <div className="adm-insp-car">
                      {insp.carImage && <img src={insp.carImage} alt={insp.carTitle} className="adm-insp-car-img" />}
                      <div>
                        <p className="adm-insp-car-title">{insp.carTitle || "Unknown Car"}</p>
                        <p className="adm-insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                      </div>
                    </div>
                    <span className="adm-insp-status" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                  <div className="adm-insp-details">
                    <div className="adm-insp-detail"><span className="adm-insp-detail-label">Buyer</span><span>{insp.buyerName || "—"} · {insp.buyerEmail}</span></div>
                    <div className="adm-insp-detail"><span className="adm-insp-detail-label">Location</span><span>{insp.location || "—"}</span></div>
                  </div>
                  <div className="adm-insp-actions">
                    <button className="btn btn-secondary" onClick={() => setSelectedInsp(isSelected ? null : insp)}>{isSelected ? "Close" : "Manage"}</button>
                    {insp.status === "requested" && <button className="btn btn-primary" onClick={() => handleUpdateInspection(insp._id, "accepted")} disabled={updatingInsp}>Accept</button>}
                    {insp.status !== "completed" && <button className="btn btn-danger" onClick={() => handleUpdateInspection(insp._id, "rejected")} disabled={updatingInsp}>Reject</button>}
                  </div>
                  {isSelected && (
                    <div className="adm-insp-manage">
                      <div className="field">
                        <label>Admin Notes</label>
                        <textarea rows="2" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
                      </div>
                      <div className="field">
                        <label>Scheduled Inspection Date</label>
                        <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "applications" && (
        <div>
          <div className="adm-filter-row">
            {["", "draft", "submitted", "under_review", "approved", "rejected"].map((s) => (
              <button key={s || "all"} type="button" className={`adm-filter-btn ${appStatusFilter === s ? "adm-filter-btn--active" : ""}`} onClick={() => setAppStatusFilter(s)}>{s || "all"}</button>
            ))}
          </div>
          <div className="adm-filter-row">
            {["", "high", "medium", "low"].map((s) => (
              <button key={s || "quality"} type="button" className={`adm-filter-btn ${appQualityFilter === s ? "adm-filter-btn--active" : ""}`} onClick={() => setAppQualityFilter(s)}>{s || "all quality"}</button>
            ))}
          </div>

          {appLoading && <p style={{ color: "#7a96b4" }}>Loading applications...</p>}

          {!appLoading && (
            <div className="adm-table-wrap card">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Experience</th>
                    <th>OBD</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app._id}>
                      <td>
                        <strong>{app.basicInfo?.name || app.applicantSnapshot?.name || "Unknown"}</strong>
                        <div className="adm-table-sub">{app.basicInfo?.email || app.applicantSnapshot?.email}</div>
                      </td>
                      <td>{app.experience?.yearsOfExperience || 0} yrs</td>
                      <td>{app.experience?.obdFamiliarity ? "Yes" : "No"}</td>
                      <td>
                        <strong>{app.score?.total || 0}</strong>
                        <div className={`adm-quality adm-quality--${app.score?.band || "low"}`}>{app.score?.band || "low"}</div>
                      </td>
                      <td><span className="adm-insp-status" style={{ background: (STATUS_COLORS[app.status] || STATUS_COLORS.submitted).bg, color: (STATUS_COLORS[app.status] || STATUS_COLORS.submitted).color }}>{app.status}</span></td>
                      <td><button className="btn btn-secondary btn--sm" onClick={() => { setSelectedApplication(app); setReviewForm({ status: app.status === "submitted" ? "under_review" : app.status, rejectionCode: "missing_documents", rejectionReason: app.rejectionReason || "", adminNotes: app.review?.adminNotes || "" }); }}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!applications.length && <p style={{ padding: "1rem", color: "#7a96b4" }}>No inspector applications found.</p>}
            </div>
          )}

          <div className="adm-pagination">
            <button className="btn btn-secondary btn--sm" disabled={appPagination.page <= 1} onClick={() => fetchApplications(appPagination.page - 1)}>Previous</button>
            <span>Page {appPagination.page} of {appPagination.totalPages || 1}</span>
            <button className="btn btn-secondary btn--sm" disabled={appPagination.page >= (appPagination.totalPages || 1)} onClick={() => fetchApplications(appPagination.page + 1)}>Next</button>
          </div>

          {selectedApplication && (
            <div className="adm-drawer card">
              <div className="adm-drawer-header">
                <div>
                  <h2>{selectedApplication.basicInfo?.name || selectedApplication.applicantSnapshot?.name}</h2>
                  <p>{selectedApplication.basicInfo?.email || selectedApplication.applicantSnapshot?.email}</p>
                </div>
                <button className="btn btn-secondary btn--sm" onClick={() => { setSelectedApplication(null); setPreviewDoc(null); }}>Close</button>
              </div>

              <div className="adm-insp-details">
                <div className="adm-insp-detail"><span className="adm-insp-detail-label">Experience</span><span>{selectedApplication.experience?.yearsOfExperience || 0} years</span></div>
                <div className="adm-insp-detail"><span className="adm-insp-detail-label">OBD Familiarity</span><span>{selectedApplication.experience?.obdFamiliarity ? "Yes" : "No"}</span></div>
                <div className="adm-insp-detail"><span className="adm-insp-detail-label">Score</span><span>{selectedApplication.score?.total || 0}</span></div>
                <div className="adm-insp-detail adm-insp-detail--full"><span className="adm-insp-detail-label">Skills</span><span>{selectedApplication.experience?.skills?.join(", ") || "—"}</span></div>
                <div className="adm-insp-detail adm-insp-detail--full"><span className="adm-insp-detail-label">Timeline</span><span>{selectedApplication.timeline?.map((item) => item.label).join(" → ") || "—"}</span></div>
              </div>

              <div className="adm-doc-grid">
                {DOC_TYPES.map((doc) => (
                  <button key={doc.key} type="button" className="btn btn-secondary btn--sm" disabled={!selectedApplication.documents?.[doc.key]?.url} onClick={() => openDocumentPreview(doc.key)}>
                    Preview {doc.label}
                  </button>
                ))}
              </div>

              {previewDoc && (
                <div className="adm-doc-preview">
                  <h3>{previewDoc.label || "Document Preview"}</h3>
                  {previewDoc.resourceType === "image" ? (
                    <img src={previewDoc.url} alt={previewDoc.label || "Document"} className="adm-doc-preview-img" />
                  ) : (
                    <iframe title={previewDoc.label || "Document"} src={previewDoc.url} className="adm-doc-preview-frame" />
                  )}
                </div>
              )}

              <div className="adm-review-grid">
                <div className="field">
                  <label>Status</label>
                  <select value={reviewForm.status} onChange={(e) => setReviewForm((prev) => ({ ...prev, status: e.target.value }))}>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </select>
                </div>
                {reviewForm.status === "rejected" && (
                  <>
                    <div className="field">
                      <label>Rejection Reason</label>
                      <select value={reviewForm.rejectionCode} onChange={(e) => setReviewForm((prev) => ({ ...prev, rejectionCode: e.target.value }))}>
                        {REJECTION_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Reason Details</label>
                      <textarea rows="2" value={reviewForm.rejectionReason} onChange={(e) => setReviewForm((prev) => ({ ...prev, rejectionReason: e.target.value }))} />
                    </div>
                  </>
                )}
                <div className="field">
                  <label>Admin Notes</label>
                  <textarea rows="2" value={reviewForm.adminNotes} onChange={(e) => setReviewForm((prev) => ({ ...prev, adminNotes: e.target.value }))} />
                </div>
              </div>

              <div className="adm-insp-actions">
                <button className="btn btn-primary" onClick={handleReviewApplication}>Save Review</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
