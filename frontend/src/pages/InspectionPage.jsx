import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getStoredUser, refreshCurrentUser } from "../services/authService";
import {
  getMyInspections,
  cancelInspection,
  getAvailableInspections,
  acceptInspection,
  getMyJobs,
  submitReport,
  getMyApplication,
  saveInspectorApplicationBasic,
  saveInspectorApplicationExperience,
  saveInspectorApplicationDocuments,
  submitInspectorApplication,
} from "../services/inspectionService";
import "./InspectionPage.css";

const STATUS_CONFIG = {
  payment_created: { label: "Order Created", color: "#d97706", bg: "#fef3c7" },
  payment_pending: { label: "Payment Pending", color: "#2563eb", bg: "#dbeafe" },
  payment_failed: { label: "Payment Failed", color: "#dc2626", bg: "#fee2e2" },
  confirmed: { label: "Confirmed", color: "#16a34a", bg: "#dcfce7" },
  accepted: { label: "Accepted", color: "#0891b2", bg: "#e0f2fe" },
  completed: { label: "Completed", color: "#16a34a", bg: "#dcfce7" },
  rejected: { label: "Rejected", color: "#dc2626", bg: "#fee2e2" },
  cancelled: { label: "Cancelled", color: "#6b7280", bg: "#f3f4f6" },
  draft: { label: "Draft", color: "#7c3aed", bg: "#f3e8ff" },
  submitted: { label: "Submitted", color: "#d97706", bg: "#fef3c7" },
  under_review: { label: "Under Review", color: "#2563eb", bg: "#dbeafe" },
  approved: { label: "Approved", color: "#16a34a", bg: "#dcfce7" },
};

const HEALTH_FIELDS = [
  { key: "engine", label: "Engine" },
  { key: "transmission", label: "Transmission" },
  { key: "brakes", label: "Brakes" },
  { key: "tyres", label: "Tyres" },
  { key: "ac", label: "AC & Climate" },
  { key: "electricals", label: "Electricals" },
  { key: "suspension", label: "Suspension" },
  { key: "exterior", label: "Exterior" },
  { key: "interior", label: "Interior" },
];

const SKILL_OPTIONS = [
  { value: "engine_diagnosis", label: "Engine diagnosis" },
  { value: "electrical_systems", label: "Electrical systems" },
  { value: "suspension_brakes", label: "Suspension & brakes" },
  { value: "body_paint", label: "Body & paint" },
  { value: "report_writing", label: "Report writing" },
  { value: "customer_communication", label: "Customer communication" },
];

const EDUCATION_OPTIONS = [
  { value: "iti", label: "ITI" },
  { value: "diploma", label: "Diploma" },
  { value: "btech", label: "B.Tech / Degree" },
  { value: "high_school", label: "High school" },
  { value: "other", label: "Other" },
];

const StarRating = ({ value, onChange }) => (
  <div className="insp-stars">
    {[1, 2, 3, 4, 5].map((n) => (
      <button key={n} type="button" className={`insp-star ${value >= n ? "insp-star--on" : ""}`} onClick={() => onChange(value === n ? 0 : n)}>
        ★
      </button>
    ))}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.payment_created;
  return <span className="insp-status-badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
};

const getApplicationTimeline = (application) => {
  if (application?.timeline?.length) return application.timeline;
  return [];
};

const emptyBasic = { name: "", email: "", phone: "" };
const emptyExperience = {
  yearsOfExperience: "",
  educationLevel: "other",
  educationText: "",
  skills: [],
  obdFamiliarity: false,
  reportWriting: false,
  workshopType: "",
  currentEmployer: "",
  summary: "",
  location: "",
};

const InspectionPage = () => {
  const storedUser = getStoredUser();
  const [user, setUser] = useState(storedUser);
  const [activeTab, setActiveTab] = useState(storedUser?.role === "inspector" ? "jobs" : "my-requests");

  const [myInspections, setMyInspections] = useState([]);
  const [myLoading, setMyLoading] = useState(false);

  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [inspLoading, setInspLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(null);
  const [reportForm, setReportForm] = useState({});
  const [reportPhotos, setReportPhotos] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [myApplication, setMyApplication] = useState(null);
  const [appStep, setAppStep] = useState(0);
  const [basicForm, setBasicForm] = useState(emptyBasic);
  const [experienceForm, setExperienceForm] = useState(emptyExperience);
  const [docFiles, setDocFiles] = useState({ experienceCertificate: null, educationCertificate: null, idProof: null });
  const [appLoading, setAppLoading] = useState(false);
  const [appError, setAppError] = useState("");
  const [appSuccess, setAppSuccess] = useState("");
  const photoInputRef = useRef(null);

  const isInspector = user?.role === "inspector";
  const isAdmin = user?.role === "admin";

  const syncApplicationState = (application) => {
    setMyApplication(application);
    setBasicForm({
      name: application?.basicInfo?.name || user?.name || "",
      email: application?.basicInfo?.email || user?.email || "",
      phone: application?.basicInfo?.phone || user?.phone || "",
    });
    setExperienceForm({
      yearsOfExperience: application?.experience?.yearsOfExperience ?? "",
      educationLevel: application?.experience?.educationLevel || "other",
      educationText: application?.experience?.educationText || "",
      skills: application?.experience?.skills || [],
      obdFamiliarity: Boolean(application?.experience?.obdFamiliarity),
      reportWriting: Boolean(application?.experience?.reportWriting),
      workshopType: application?.experience?.workshopType || "",
      currentEmployer: application?.experience?.currentEmployer || "",
      summary: application?.experience?.summary || "",
      location: application?.experience?.location || user?.location || "",
    });
  };

  useEffect(() => {
    let mounted = true;
    refreshCurrentUser()
      .then((freshUser) => {
        if (!mounted || !freshUser) return;
        setUser(freshUser);
        if (freshUser.role === "inspector") setActiveTab((prev) => (prev === "become-inspector" ? "jobs" : prev));
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (activeTab === "my-requests") {
      setMyLoading(true);
      getMyInspections().then(setMyInspections).finally(() => setMyLoading(false));
    }
    if (activeTab === "available" && isInspector) {
      setInspLoading(true);
      getAvailableInspections().then(setAvailable).finally(() => setInspLoading(false));
    }
    if (activeTab === "jobs" && isInspector) {
      setInspLoading(true);
      getMyJobs().then(setMyJobs).finally(() => setInspLoading(false));
    }
    if (activeTab === "become-inspector" && !isAdmin) {
      setAppLoading(true);
      getMyApplication()
        .then((application) => {
          syncApplicationState(application);
        })
        .finally(() => setAppLoading(false));
    }
  }, [activeTab, isInspector, isAdmin]);

  const applicationStatus = myApplication?.status;
  const timeline = useMemo(() => getApplicationTimeline(myApplication), [myApplication]);
  const score = myApplication?.score?.total ?? 0;
  const scoreBand = myApplication?.score?.band || "low";

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this inspection request?")) return;
    await cancelInspection(id);
    setMyInspections((prev) => prev.map((i) => (i._id === id ? { ...i, status: "cancelled" } : i)));
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
      reportPhotos.forEach((file) => payload.append("photos", file));
      await submitReport(reportOpen, payload);
      setMyJobs((prev) => prev.map((job) => (job._id === reportOpen ? { ...job, status: "completed" } : job)));
      setReportOpen(null);
      setReportForm({});
      setReportPhotos([]);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveBasic = async () => {
    setAppLoading(true);
    setAppError("");
    try {
      const response = await saveInspectorApplicationBasic(basicForm);
      syncApplicationState(response.application);
      setAppStep(1);
      setAppSuccess("Basic information saved.");
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to save basic information");
    } finally {
      setAppLoading(false);
    }
  };

  const handleSaveExperience = async () => {
    setAppLoading(true);
    setAppError("");
    try {
      const response = await saveInspectorApplicationExperience(experienceForm);
      syncApplicationState(response.application);
      setAppStep(2);
      setAppSuccess("Experience details saved.");
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to save experience details");
    } finally {
      setAppLoading(false);
    }
  };

  const handleSaveDocuments = async () => {
    setAppLoading(true);
    setAppError("");
    try {
      const payload = new FormData();
      if (docFiles.experienceCertificate) payload.append("experienceCertificate", docFiles.experienceCertificate);
      if (docFiles.educationCertificate) payload.append("educationCertificate", docFiles.educationCertificate);
      if (docFiles.idProof) payload.append("idProof", docFiles.idProof);
      const response = await saveInspectorApplicationDocuments(payload);
      syncApplicationState(response.application);
      setAppStep(3);
      setAppSuccess("Documents saved.");
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to save documents");
    } finally {
      setAppLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setAppLoading(true);
    setAppError("");
    try {
      const response = await submitInspectorApplication();
      syncApplicationState(response.application);
      setAppSuccess("Application submitted successfully.");
    } catch (err) {
      setAppError(err.response?.data?.message || "Failed to submit application");
    } finally {
      setAppLoading(false);
    }
  };

  const toggleSkill = (skill) => {
    setExperienceForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((item) => item !== skill)
        : [...prev.skills, skill],
    }));
  };

  const tabs = [
    { id: "my-requests", label: "My Requests", show: true },
    { id: "available", label: "Available Jobs", show: isInspector },
    { id: "jobs", label: "My Jobs", show: isInspector },
    { id: "become-inspector", label: "Register as Inspector", show: !isInspector && !isAdmin },
  ].filter((tab) => tab.show);

  return (
    <div className="insp-page">
      <div className="insp-hero">
        <h1 className="insp-hero-title">Inspection Hub</h1>
        <p className="insp-hero-sub">Manage trusted vehicle inspections end to end, from certified inspector onboarding to buyer requests, job assignment, and verified inspection reports.</p>
      </div>

      <div className="insp-tabs">
        {tabs.map((tab) => (
          <button key={tab.id} className={`insp-tab ${activeTab === tab.id ? "insp-tab--active" : ""}`} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "my-requests" && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>My Inspection Requests</h2>
            <p>Track all buyer-side inspection activity and completed reports.</p>
          </div>

          {!isInspector && !isAdmin && (
            <div className="insp-register-cta card">
              <div>
                <h3>Want to join as a certified inspector?</h3>
                <p>Complete your inspector application to start receiving inspection jobs on DreamCar.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => setActiveTab("become-inspector")}>
                Register as Inspector
              </button>
            </div>
          )}

          {myLoading && <div className="insp-loading">Loading...</div>}
          {!myLoading && myInspections.length === 0 && (
            <div className="insp-empty">
              <div className="insp-empty-icon">🔍</div>
              <h3>No inspection requests yet</h3>
              <p>Browse cars and request an inspection when you find one worth checking.</p>
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
                      {insp.paymentStatus && <span className="insp-meta-chip">Payment: {insp.paymentStatus}</span>}
                      {insp.location && <span className="insp-meta-chip">📍 {insp.location}</span>}
                    </div>
                  </div>
                </div>
                  {["payment_created", "payment_pending", "confirmed", "accepted"].includes(insp.status) && (
                  <button type="button" className="btn btn-danger" onClick={() => handleCancel(insp._id)}>Cancel Request</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "available" && isInspector && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>Available Jobs</h2>
            <p>Confirmed and paid jobs that still need a manual inspector assignment.</p>
          </div>
          {inspLoading && <div className="insp-loading">Loading...</div>}
          {!inspLoading && available.length === 0 && <div className="insp-empty"><div className="insp-empty-icon">📋</div><h3>No available jobs</h3><p>New requests will appear here.</p></div>}
          <div className="insp-card-list">
            {available.map((insp) => (
              <div key={insp._id} className="insp-card card">
                <div className="insp-card-top">
                  {insp.carImage && <img src={insp.carImage} alt={insp.carTitle} className="insp-car-img" />}
                  <div className="insp-card-info">
                    <h3 className="insp-car-title">{insp.carTitle}</h3>
                    <p className="insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                    <div className="insp-card-meta">
                      <span className="insp-meta-chip">📍 {insp.location || "Location pending"}</span>
                    </div>
                  </div>
                </div>
                <button type="button" className="btn btn-primary" onClick={() => handleAccept(insp._id)}>Accept Job</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "jobs" && isInspector && (
        <div className="insp-section">
          <div className="insp-section-header">
            <h2>My Jobs</h2>
            <p>Assigned jobs and inspection report submission for paid bookings.</p>
          </div>
          {inspLoading && <div className="insp-loading">Loading...</div>}
          {!inspLoading && myJobs.length === 0 && <div className="insp-empty"><div className="insp-empty-icon">🛠</div><h3>No jobs yet</h3><p>Accept available requests to get started.</p></div>}
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
                    </div>
                  </div>
                </div>
                {insp.status === "accepted" ? (
                  <button type="button" className="btn btn-primary" onClick={() => setReportOpen(insp._id)}>Submit Inspection Report</button>
                ) : (
                  <div className="insp-completed-tag">Report submitted</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "become-inspector" && !isInspector && !isAdmin && (
        <div className="insp-section">
          <div className="insp-become-hero card">
            <div className="insp-become-hero-content">
              <h2>Register as Inspector</h2>
              <p>Uber-style onboarding with draft saving, scoring, document validation, review states, and approval-based role access.</p>
              <div className="insp-become-perks">
                <span className="insp-perk">One active application per mechanic</span>
                <span className="insp-perk">Cloud document uploads</span>
                <span className="insp-perk">Admin review timeline</span>
                <span className="insp-perk">Role upgrade on approval</span>
              </div>
            </div>
          </div>

          {appLoading && !myApplication && <div className="insp-loading">Loading application status...</div>}

          {myApplication && (
            <div className="insp-app-status card">
              <div className="insp-status-row">
                <div>
                  <h3>Application Status</h3>
                  <p>Application #{myApplication.applicationNumber || "Pending assignment"}</p>
                </div>
                <StatusBadge status={applicationStatus} />
              </div>
              <div className="insp-score-band">
                <span>Application Score</span>
                <strong>{score}/100</strong>
                <span className={`insp-quality-chip insp-quality-chip--${scoreBand}`}>{scoreBand}</span>
              </div>
              {myApplication?.rejectionReason && <p className="insp-admin-notes">Rejection reason: {myApplication.rejectionReason}</p>}
              <div className="insp-timeline">
                {timeline.map((event, index) => (
                  <div key={`${event.type}-${index}`} className="insp-timeline-item">
                    <div className="insp-timeline-dot" />
                    <div>
                      <strong>{event.label}</strong>
                      <p>{new Date(event.createdAt).toLocaleString("en-IN")}</p>
                      {event.note && <span>{event.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {appSuccess && <div className="insp-success-banner card"><div className="insp-success-icon">✓</div><h3>{appSuccess}</h3></div>}
          {appError && <div className="insp-error">{appError}</div>}

          {applicationStatus !== "submitted" && applicationStatus !== "under_review" && applicationStatus !== "approved" && (
            <div className="insp-apply-form card">
              <div className="insp-stepper">
                {["Basic", "Experience", "Documents", "Review"].map((label, index) => (
                  <button key={label} type="button" className={`insp-step ${appStep === index ? "insp-step--active" : ""}`} onClick={() => setAppStep(index)}>
                    {index + 1}. {label}
                  </button>
                ))}
              </div>

              {appStep === 0 && (
                <div className="insp-wizard-section">
                  <h3>Step 1: Basic Info</h3>
                  <div className="car-form-grid">
                    <div className="field">
                      <label>Name</label>
                      <input value={basicForm.name} onChange={(e) => setBasicForm((prev) => ({ ...prev, name: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Email</label>
                      <input value={basicForm.email} onChange={(e) => setBasicForm((prev) => ({ ...prev, email: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Phone</label>
                      <input value={basicForm.phone} onChange={(e) => setBasicForm((prev) => ({ ...prev, phone: e.target.value }))} />
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary" disabled={appLoading} onClick={handleSaveBasic}>Save & Continue</button>
                </div>
              )}

              {appStep === 1 && (
                <div className="insp-wizard-section">
                  <h3>Step 2: Experience & Skills</h3>
                  <div className="car-form-grid">
                    <div className="field">
                      <label>Years of Experience</label>
                      <input type="number" min="0" value={experienceForm.yearsOfExperience} onChange={(e) => setExperienceForm((prev) => ({ ...prev, yearsOfExperience: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Education</label>
                      <select value={experienceForm.educationLevel} onChange={(e) => setExperienceForm((prev) => ({ ...prev, educationLevel: e.target.value }))}>
                        {EDUCATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div className="field">
                      <label>Location</label>
                      <input value={experienceForm.location} onChange={(e) => setExperienceForm((prev) => ({ ...prev, location: e.target.value }))} />
                    </div>
                    <div className="field">
                      <label>Workshop Type</label>
                      <input value={experienceForm.workshopType} onChange={(e) => setExperienceForm((prev) => ({ ...prev, workshopType: e.target.value }))} />
                    </div>
                    <div className="field field--full">
                      <label>Skills</label>
                      <div className="insp-skills-grid">
                        {SKILL_OPTIONS.map((skill) => (
                          <button key={skill.value} type="button" className={`insp-skill-chip ${experienceForm.skills.includes(skill.value) ? "insp-skill-chip--active" : ""}`} onClick={() => toggleSkill(skill.value)}>
                            {skill.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label className="insp-checkbox-label"><input type="checkbox" checked={experienceForm.obdFamiliarity} onChange={(e) => setExperienceForm((prev) => ({ ...prev, obdFamiliarity: e.target.checked }))} /> OBD familiarity</label>
                    </div>
                    <div className="field">
                      <label className="insp-checkbox-label"><input type="checkbox" checked={experienceForm.reportWriting} onChange={(e) => setExperienceForm((prev) => ({ ...prev, reportWriting: e.target.checked }))} /> Can write reports</label>
                    </div>
                    <div className="field field--full">
                      <label>Professional Summary</label>
                      <textarea rows="3" value={experienceForm.summary} onChange={(e) => setExperienceForm((prev) => ({ ...prev, summary: e.target.value }))} />
                    </div>
                  </div>
                  <div className="insp-step-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setAppStep(0)}>Back</button>
                    <button type="button" className="btn btn-primary" disabled={appLoading} onClick={handleSaveExperience}>Save & Continue</button>
                  </div>
                </div>
              )}

              {appStep === 2 && (
                <div className="insp-wizard-section">
                  <h3>Step 3: Document Upload</h3>
                  <div className="car-form-grid">
                    <div className="field">
                      <label>Experience Certificate</label>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFiles((prev) => ({ ...prev, experienceCertificate: e.target.files?.[0] || null }))} />
                    </div>
                    <div className="field">
                      <label>Educational Certificate</label>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFiles((prev) => ({ ...prev, educationCertificate: e.target.files?.[0] || null }))} />
                    </div>
                    <div className="field">
                      <label>ID Proof (optional)</label>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setDocFiles((prev) => ({ ...prev, idProof: e.target.files?.[0] || null }))} />
                    </div>
                  </div>
                  <div className="insp-step-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setAppStep(1)}>Back</button>
                    <button type="button" className="btn btn-primary" disabled={appLoading} onClick={handleSaveDocuments}>Save & Continue</button>
                  </div>
                </div>
              )}

              {appStep === 3 && (
                <div className="insp-wizard-section">
                  <h3>Step 4: Review & Submit</h3>
                  <div className="insp-review-grid">
                    <div><span>Name</span><strong>{basicForm.name || "Not set"}</strong></div>
                    <div><span>Phone / Email</span><strong>{basicForm.phone || basicForm.email || "Not set"}</strong></div>
                    <div><span>Experience</span><strong>{experienceForm.yearsOfExperience || 0} years</strong></div>
                    <div><span>Education</span><strong>{experienceForm.educationLevel}</strong></div>
                    <div><span>Skills</span><strong>{experienceForm.skills.length ? experienceForm.skills.join(", ") : "Not set"}</strong></div>
                    <div><span>OBD</span><strong>{experienceForm.obdFamiliarity ? "Yes" : "No"}</strong></div>
                  </div>
                  <div className="insp-step-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setAppStep(2)}>Back</button>
                    <button type="button" className="btn btn-primary" disabled={appLoading} onClick={handleSubmitApplication}>Submit Application</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {reportOpen && (
        <div className="insp-modal-overlay" onClick={() => setReportOpen(null)}>
          <div className="insp-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="insp-modal-header">
              <h2>Inspection Report</h2>
              <button type="button" className="insp-modal-close" onClick={() => setReportOpen(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmitReport} className="insp-report-form">
              <div className="insp-report-fields">
                {HEALTH_FIELDS.map(({ key, label }) => (
                  <div key={key} className="insp-report-row">
                    <span className="insp-report-field-label">{label}</span>
                    <StarRating value={reportForm[key] || 0} onChange={(value) => setReportForm((prev) => ({ ...prev, [key]: value }))} />
                  </div>
                ))}
              </div>
              <div className="field">
                <label>Summary</label>
                <textarea rows="3" required value={reportForm.summary || ""} onChange={(e) => setReportForm((prev) => ({ ...prev, summary: e.target.value }))} />
              </div>
              <div className="field">
                <label>Inspection Photos</label>
                <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={(e) => setReportPhotos(Array.from(e.target.files || []))} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Submitting..." : "Submit Report"}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionPage;
