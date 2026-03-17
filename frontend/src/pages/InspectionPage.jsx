import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser } from "../services/authService";
import {
  getMyInspections, cancelInspection,
  getAvailableInspections, acceptInspection, getMyJobs, submitReport,
  applyAsInspector, getMyApplication,
} from "../services/inspectionService";
import "./InspectionPage.css";

const STATUS_CONFIG = {
  requested: { label: "Requested",  color: "#d97706", bg: "#fef3c7" },
  accepted:  { label: "Accepted",   color: "#0891b2", bg: "#e0f2fe" },
  completed: { label: "Completed",  color: "#16a34a", bg: "#dcfce7" },
  rejected:  { label: "Rejected",   color: "#dc2626", bg: "#fee2e2" },
  cancelled: { label: "Cancelled",  color: "#6b7280", bg: "#f3f4f6" },
};

const HEALTH_FIELDS = [
  { key: "engine",       label: "Engine" },
  { key: "transmission", label: "Transmission" },
  { key: "brakes",       label: "Brakes" },
  { key: "tyres",        label: "Tyres" },
  { key: "ac",           label: "AC & Climate" },
  { key: "electricals",  label: "Electricals" },
  { key: "suspension",   label: "Suspension" },
  { key: "exterior",     label: "Exterior" },
  { key: "interior",     label: "Interior" },
];

const StarRating = ({ value, onChange }) => (
  <div className="insp-stars">
    {[1,2,3,4,5].map((n) => (
      <button key={n} type="button"
        className={`insp-star ${value >= n ? "insp-star--on" : ""}`}
        onClick={() => onChange(value === n ? 0 : n)}>★</button>
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.requested;
  return (
    <span className="insp-status-badge" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
};

const InspectionPage = () => {
  const user = getStoredUser();
  const isInspector = user?.role === "inspector";
  const isAdmin     = user?.role === "admin";

  const [activeTab, setActiveTab] = useState(isInspector ? "jobs" : "my-requests");

  /* Buyer state */
  const [myInspections, setMyInspections]   = useState([]);
  const [myLoading, setMyLoading]           = useState(false);

  /* Inspector state */
  const [available, setAvailable]           = useState([]);
  const [myJobs, setMyJobs]                 = useState([]);
  const [inspLoading, setInspLoading]       = useState(false);
  const [reportOpen, setReportOpen]         = useState(null);
  const [reportForm, setReportForm]         = useState({});
  const [reportPhotos, setReportPhotos]     = useState([]);
  const [submitting, setSubmitting]         = useState(false);

  /* Application state */
  const [myApplication, setMyApplication]   = useState(null);
  const [appForm, setAppForm]               = useState({
    yearsOfExperience: "", garageExperience: "", obdToolKnowledge: false,
    canCreateReports: false, currentEmployment: "", about: "", location: "", phone: "",
  });
  const [appDocs, setAppDocs]               = useState([]);
  const [appSubmitting, setAppSubmitting]   = useState(false);
  const [appError, setAppError]             = useState("");
  const [appSuccess, setAppSuccess]         = useState(false);
  const photoInputRef = useRef(null);

  /* Load data based on tab */
  useEffect(() => {
    if (activeTab === "my-requests") {
      setMyLoading(true);
      getMyInspections().then(setMyInspections).finally(() => setMyLoading(false));
    }
    if (activeTab === "available") {
      setInspLoading(true);
      getAvailableInspections().then(setAvailable).finally(() => setInspLoading(false));
    }
    if (activeTab === "jobs") {
      setInspLoading(true);
      getMyJobs().then(setMyJobs).finally(() => setInspLoading(false));
    }
    if (activeTab === "become-inspector") {
      getMyApplication().then(setMyApplication);
    }
  }, [activeTab]);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this inspection request?")) return;
    await cancelInspection(id);
    setMyInspections((prev) => prev.map((i) => i._id === id ? { ...i, status: "cancelled" } : i));
  };

  const handleAccept = async (id) => {
    const updated = await acceptInspection(id);
    setAvailable((prev) => prev.filter((i) => i._id !== id));
    setMyJobs((prev) => [updated, ...prev]);
    setActiveTab("jobs");
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = new FormData();
      payload.append("report", JSON.stringify(reportForm));
      reportPhotos.forEach((f) => payload.append("photos", f));
      await submitReport(reportOpen, payload);
      setMyJobs((prev) => prev.map((j) => j._id === reportOpen ? { ...j, status: "completed" } : j));
      setReportOpen(null);
      setReportForm({});
      setReportPhotos([]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try {
      setAppSubmitting(true);
      setAppError("");
      const payload = new FormData();
      Object.entries(appForm).forEach(([k, v]) => payload.append(k, v));
      appDocs.forEach((f) => payload.append("documents", f));
      const result = await applyAsInspector(payload);
      setMyApplication(result);
      setAppSuccess(true);
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setAppSubmitting(false);
    }
  };

  const TABS = [
    { id: "my-requests",      label: "🔍 My Requests",   show: true },
    { id: "available",        label: "📋 Available Jobs", show: isInspector },
    { id: "jobs",             label: "🛠 My Jobs",        show: isInspector },
    { id: "become-inspector", label: "⭐ Become Inspector", show: !isInspector && !isAdmin },
  ].filter((t) => t.show);

  return (
    <div className="insp-page">
      <div className="insp-hero">
        <h1 className="insp-hero-title">🔍 Car Inspections</h1>
        <p className="insp-hero-sub">
          Get a professional inspection before buying. Verified by certified inspectors.
        </p>
      </div>

      {/* Tabs */}
      <div className="insp-tabs">
        {TABS.map((t) => (
          <button key={t.id}
            className={`insp-tab ${activeTab === t.id ? "insp-tab--active" : ""}`}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════
          MY REQUESTS (Buyer)
      ════════════════════════════════════ */}
      {activeTab === "my-requests" && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>My Inspection Requests</h2>
            <p>Track the status of inspections you've requested</p>
          </div>

          {myLoading && <div className="insp-loading">Loading...</div>}

          {!myLoading && myInspections.length === 0 && (
            <div className="insp-empty">
              <div className="insp-empty-icon">🔍</div>
              <h3>No inspection requests yet</h3>
              <p>Browse cars and click "Request Inspection" on any listing to get started.</p>
              <Link to="/" className="btn btn-primary">Browse Cars</Link>
            </div>
          )}

          <div className="insp-card-list">
            {myInspections.map((insp) => (
              <div key={insp._id} className="insp-card card">
                <div className="insp-card-top">
                  {insp.carImage && <img src={insp.carImage} alt={insp.carTitle} className="insp-car-img" />}
                  <div className="insp-card-info">
                    <h3 className="insp-car-title">{insp.carTitle}</h3>
                    <p className="insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                    <div className="insp-card-meta">
                      <StatusBadge status={insp.status} />
                      {insp.preferredDate && (
                        <span className="insp-meta-chip">
                          📅 {new Date(insp.preferredDate).toLocaleDateString("en-IN")}
                          {insp.preferredTime ? ` · ${insp.preferredTime}` : ""}
                        </span>
                      )}
                      {insp.location && <span className="insp-meta-chip">📍 {insp.location}</span>}
                    </div>
                    {insp.inspectorName && (
                      <p className="insp-inspector-name">Inspector: {insp.inspectorName}</p>
                    )}
                  </div>
                </div>

                {/* Completed report */}
                {insp.status === "completed" && insp.report && (
                  <div className="insp-report-preview">
                    <h4 className="insp-report-title">📊 Inspection Report</h4>
                    <div className="insp-report-grid">
                      {HEALTH_FIELDS.map(({ key, label }) => (
                        insp.report[key] ? (
                          <div key={key} className="insp-report-item">
                            <span className="insp-report-label">{label}</span>
                            <div className="insp-report-stars">
                              {"★".repeat(insp.report[key])}{"☆".repeat(5 - insp.report[key])}
                            </div>
                          </div>
                        ) : null
                      ))}
                    </div>
                    {insp.report.summary && <p className="insp-report-summary">"{insp.report.summary}"</p>}
                    {insp.inspectionPhotos?.length > 0 && (
                      <div className="insp-photos">
                        {insp.inspectionPhotos.map((p, i) => (
                          <img key={i} src={p.url} alt={p.caption || `Photo ${i+1}`} className="insp-photo" />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {["requested", "accepted"].includes(insp.status) && (
                  <button type="button" className="btn btn-danger" style={{ fontSize:"0.8rem", marginTop:"0.75rem" }}
                    onClick={() => handleCancel(insp._id)}>
                    Cancel Request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          AVAILABLE JOBS (Inspector)
      ════════════════════════════════════ */}
      {activeTab === "available" && isInspector && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>Available Inspection Requests</h2>
            <p>Accept a request to take on the inspection job</p>
          </div>

          {inspLoading && <div className="insp-loading">Loading...</div>}
          {!inspLoading && available.length === 0 && (
            <div className="insp-empty">
              <div className="insp-empty-icon">📋</div>
              <h3>No available requests</h3>
              <p>Check back later for new inspection requests from buyers.</p>
            </div>
          )}

          <div className="insp-card-list">
            {available.map((insp) => (
              <div key={insp._id} className="insp-card card">
                <div className="insp-card-top">
                  {insp.carImage && <img src={insp.carImage} alt={insp.carTitle} className="insp-car-img" />}
                  <div className="insp-card-info">
                    <h3 className="insp-car-title">{insp.carTitle}</h3>
                    <p className="insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                    <div className="insp-card-meta">
                      {insp.preferredDate && (
                        <span className="insp-meta-chip">
                          📅 {new Date(insp.preferredDate).toLocaleDateString("en-IN")}
                          {insp.preferredTime ? ` · ${insp.preferredTime}` : ""}
                        </span>
                      )}
                      <span className="insp-meta-chip">📍 {insp.location || "Not specified"}</span>
                    </div>
                    {insp.notes && <p className="insp-notes">"{insp.notes}"</p>}
                  </div>
                </div>
                <button type="button" className="btn btn-primary" style={{ marginTop:"0.75rem", fontSize:"0.88rem" }}
                  onClick={() => handleAccept(insp._id)}>
                  ✓ Accept Job
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════
          MY JOBS (Inspector)
      ════════════════════════════════════ */}
      {activeTab === "jobs" && isInspector && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>My Inspection Jobs</h2>
            <p>Submit reports for accepted jobs</p>
          </div>

          {inspLoading && <div className="insp-loading">Loading...</div>}
          {!inspLoading && myJobs.length === 0 && (
            <div className="insp-empty">
              <div className="insp-empty-icon">🛠</div>
              <h3>No jobs yet</h3>
              <p>Accept available requests to start earning.</p>
            </div>
          )}

          <div className="insp-card-list">
            {myJobs.map((insp) => (
              <div key={insp._id} className="insp-card card">
                <div className="insp-card-top">
                  {insp.carImage && <img src={insp.carImage} alt={insp.carTitle} className="insp-car-img" />}
                  <div className="insp-card-info">
                    <h3 className="insp-car-title">{insp.carTitle}</h3>
                    <p className="insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                    <div className="insp-card-meta">
                      <StatusBadge status={insp.status} />
                      <span className="insp-meta-chip">📍 {insp.location}</span>
                      {insp.preferredDate && (
                        <span className="insp-meta-chip">
                          📅 {new Date(insp.preferredDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                    </div>
                    <p className="insp-buyer-name">Buyer: {insp.buyerName}</p>
                  </div>
                </div>

                {insp.status === "accepted" && (
                  <button type="button" className="btn btn-primary"
                    style={{ marginTop:"0.75rem", fontSize:"0.88rem", background:"#7c3aed", border:"none" }}
                    onClick={() => { setReportOpen(insp._id); setReportForm({}); setReportPhotos([]); }}>
                    📝 Submit Inspection Report
                  </button>
                )}

                {insp.status === "completed" && (
                  <div className="insp-completed-tag">✓ Report submitted</div>
                )}
              </div>
            ))}
          </div>

          {/* Report submission modal */}
          {reportOpen && (
            <div className="insp-modal-overlay" onClick={() => setReportOpen(null)}>
              <div className="insp-modal card" onClick={(e) => e.stopPropagation()}>
                <div className="insp-modal-header">
                  <h2>📝 Inspection Report</h2>
                  <button type="button" className="insp-modal-close" onClick={() => setReportOpen(null)}>✕</button>
                </div>
                <form onSubmit={handleSubmitReport} className="insp-report-form">
                  <div className="insp-report-fields">
                    {HEALTH_FIELDS.map(({ key, label }) => (
                      <div key={key} className="insp-report-row">
                        <span className="insp-report-field-label">{label}</span>
                        <StarRating
                          value={reportForm[key] || 0}
                          onChange={(v) => setReportForm((p) => ({ ...p, [key]: v }))}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="field">
                    <label>Overall Rating</label>
                    <StarRating
                      value={reportForm.overallRating || 0}
                      onChange={(v) => setReportForm((p) => ({ ...p, overallRating: v }))}
                    />
                  </div>
                  <div className="field">
                    <label>Odometer Reading (km)</label>
                    <input type="number" value={reportForm.odometerReading || ""}
                      onChange={(e) => setReportForm((p) => ({ ...p, odometerReading: e.target.value }))}
                      placeholder="Current odometer reading" />
                  </div>
                  <div className="field">
                    <label>Summary *</label>
                    <textarea rows="3" required value={reportForm.summary || ""}
                      onChange={(e) => setReportForm((p) => ({ ...p, summary: e.target.value }))}
                      placeholder="Overall condition of the vehicle..." />
                  </div>
                  <div className="field">
                    <label>Recommendations</label>
                    <textarea rows="2" value={reportForm.recommendations || ""}
                      onChange={(e) => setReportForm((p) => ({ ...p, recommendations: e.target.value }))}
                      placeholder="Any repairs or services recommended..." />
                  </div>
                  <div className="field">
                    <label>Inspection Photos</label>
                    <input ref={photoInputRef} type="file" accept="image/*" multiple
                      onChange={(e) => setReportPhotos(Array.from(e.target.files || []))} />
                    {reportPhotos.length > 0 && (
                      <div className="insp-photo-preview">
                        {reportPhotos.map((f, i) => (
                          <img key={i} src={URL.createObjectURL(f)} alt={`Photo ${i+1}`} className="insp-photo-thumb" />
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          BECOME INSPECTOR
      ════════════════════════════════════ */}
      {activeTab === "become-inspector" && !isInspector && !isAdmin && (
        <div className="insp-section">

          {/* Hero */}
          <div className="insp-become-hero card">
            <div className="insp-become-hero-content">
              <h2>⭐ Become a DreamCar Inspector</h2>
              <p>Join our trusted network of certified vehicle inspectors. Help buyers make confident decisions.</p>
              <div className="insp-become-perks">
                {["Earn per inspection", "Flexible schedule", "Build your reputation", "Help buyers stay safe"].map((p) => (
                  <span key={p} className="insp-perk">✓ {p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="insp-requirements card">
            <h3>📋 Requirements</h3>
            <div className="insp-req-grid">
              {[
                { icon: "⏱", title: "3+ Years Experience", desc: "Minimum 3 years in automotive industry" },
                { icon: "🔧", title: "Garage Experience", desc: "Hands-on experience in a garage or workshop" },
                { icon: "📱", title: "OBD Tool Knowledge", desc: "Familiar with OBD diagnostic tools" },
                { icon: "📄", title: "Report Writing", desc: "Ability to create detailed inspection reports" },
              ].map((r) => (
                <div key={r.title} className="insp-req-card">
                  <span className="insp-req-icon">{r.icon}</span>
                  <div>
                    <p className="insp-req-title">{r.title}</p>
                    <p className="insp-req-desc">{r.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application status */}
          {myApplication && (
            <div className={`insp-app-status card insp-app-status--${myApplication.status}`}>
              <h3>Your Application Status</h3>
              <StatusBadge status={myApplication.status} />
              <p>Submitted on {new Date(myApplication.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })}</p>
              {myApplication.adminNotes && <p className="insp-admin-notes">Admin note: {myApplication.adminNotes}</p>}
            </div>
          )}

          {/* Application form */}
          {(!myApplication || myApplication.status === "rejected") && !appSuccess && (
            <div className="insp-apply-form card">
              <h3>📝 Application Form</h3>
              {appError && <div className="insp-error">{appError}</div>}
              <form onSubmit={handleApply}>
                <div className="car-form-grid">
                  <div className="field">
                    <label>Years of Experience *</label>
                    <input type="number" min="0" required
                      value={appForm.yearsOfExperience}
                      onChange={(e) => setAppForm((p) => ({ ...p, yearsOfExperience: e.target.value }))}
                      placeholder="e.g. 5" />
                    <span className="field-hint">Minimum 3 years required</span>
                  </div>
                  <div className="field">
                    <label>Phone Number *</label>
                    <input type="tel" required
                      value={appForm.phone}
                      onChange={(e) => setAppForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+91 98765 43210" />
                  </div>
                  <div className="field">
                    <label>Current / Last Employer</label>
                    <input value={appForm.currentEmployment}
                      onChange={(e) => setAppForm((p) => ({ ...p, currentEmployment: e.target.value }))}
                      placeholder="e.g. Bosch Authorized Service Centre" />
                  </div>
                  <div className="field">
                    <label>Location</label>
                    <input value={appForm.location}
                      onChange={(e) => setAppForm((p) => ({ ...p, location: e.target.value }))}
                      placeholder="City you can operate in" />
                  </div>
                  <div className="field field--full">
                    <label>Garage / Workshop Experience *</label>
                    <textarea rows="3" required
                      value={appForm.garageExperience}
                      onChange={(e) => setAppForm((p) => ({ ...p, garageExperience: e.target.value }))}
                      placeholder="Describe your experience in garages or workshops..." />
                  </div>
                  <div className="field field--full">
                    <label>About Yourself *</label>
                    <textarea rows="3" required
                      value={appForm.about}
                      onChange={(e) => setAppForm((p) => ({ ...p, about: e.target.value }))}
                      placeholder="Tell us about your automotive expertise and why you want to join..." />
                  </div>
                  <div className="field">
                    <label className="insp-checkbox-label">
                      <input type="checkbox"
                        checked={appForm.obdToolKnowledge}
                        onChange={(e) => setAppForm((p) => ({ ...p, obdToolKnowledge: e.target.checked }))} />
                      I have knowledge and experience with OBD diagnostic tools
                    </label>
                  </div>
                  <div className="field">
                    <label className="insp-checkbox-label">
                      <input type="checkbox"
                        checked={appForm.canCreateReports}
                        onChange={(e) => setAppForm((p) => ({ ...p, canCreateReports: e.target.checked }))} />
                      I can create detailed vehicle inspection reports
                    </label>
                  </div>
                  <div className="field field--full">
                    <label>Upload Documents (ID proof, certifications)</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple
                      onChange={(e) => setAppDocs(Array.from(e.target.files || []))} />
                    <span className="field-hint">PDF, JPG, PNG accepted. Max 5MB each.</span>
                  </div>
                </div>
                <div className="insp-apply-footer">
                  <button type="submit" className="btn btn-primary" disabled={appSubmitting}>
                    {appSubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {appSuccess && (
            <div className="insp-success-banner card">
              <div className="insp-success-icon">🎉</div>
              <h3>Application Submitted!</h3>
              <p>Our team will review your application and get back to you within 2-3 business days.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InspectionPage;