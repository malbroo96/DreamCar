import { useEffect, useMemo, useRef, useState } from "react";
import { extractCarFromRC } from "../services/carService";
import "./CarForm.css";

const defaultFormState = {
  title: "", brand: "", model: "", year: "", price: "0",
  fuelType: "Petrol", transmission: "Manual", kilometersDriven: "0",
  description: "", location: "", city: "", area: "", status: "approved",
};

const defaultRcDetails = {
  registrationNumber: "", ownerName: "", manufacturer: "", vehicleModel: "",
  fuelType: "", manufacturingYear: "", engineNumber: "", chassisNumber: "",
  vehicleColor: "", seatingCapacity: "", registrationDate: "", rtoOffice: "",
};

const defaultHealthCheck = {
  engine: "", transmission: "", brakes: "", tyres: "",
  ac: "", electricals: "", suspension: "", body: "", inspectedBy: "",
};

const HEALTH_FIELDS = [
  { key: "engine",       label: "Engine",       icon: "🔧" },
  { key: "transmission", label: "Transmission", icon: "⚙️" },
  { key: "brakes",       label: "Brakes",       icon: "🛑" },
  { key: "tyres",        label: "Tyres",        icon: "🔄" },
  { key: "ac",           label: "AC & Climate", icon: "❄️" },
  { key: "electricals",  label: "Electricals",  icon: "⚡" },
  { key: "suspension",   label: "Suspension",   icon: "🔩" },
  { key: "body",         label: "Body & Paint", icon: "🎨" },
];

const RATING_LABELS = { 1: "Poor", 2: "Below Avg", 3: "Average", 4: "Good", 5: "Excellent" };
const RATING_COLORS = { 1: "#dc2626", 2: "#f97316", 3: "#d97706", 4: "#16a34a", 5: "#15803d" };

const RC_ACCEPTED    = ".pdf,.jpg,.jpeg,.png";
const RC_MAX_BYTES   = 5 * 1024 * 1024;
const RC_ALLOWED_TYPES = ["application/pdf","image/jpeg","image/jpg","image/png"];

const INDIAN_CITIES = [
  "Chennai","Mumbai","Delhi","Bangalore","Hyderabad","Pune",
  "Kolkata","Ahmedabad","Surat","Jaipur","Lucknow","Kanpur",
  "Nagpur","Visakhapatnam","Bhopal","Patna","Indore","Thane",
  "Coimbatore","Kochi",
];

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="cf-section-header">
    <span className="cf-section-icon">{icon}</span>
    <div>
      <h3 className="cf-section-title">{title}</h3>
      {subtitle && <p className="cf-section-sub">{subtitle}</p>}
    </div>
  </div>
);

const CarForm = ({
  initialValues, onSubmit, submitLabel = "Submit",
  includeStatus = false, hasExistingRC = false,
}) => {
  const mergedInitialValues = useMemo(
    () => ({ ...defaultFormState, ...(initialValues || {}) }),
    [initialValues]
  );

  const [form, setForm]               = useState(mergedInitialValues);
  const [imageFiles, setImageFiles]   = useState([]);
  const [existingImages, setExistingImages] = useState(() => initialValues?.images || []);
  const [rcFile, setRcFile]           = useState(null);
  const [rcRemoved, setRcRemoved]     = useState(false);
  const [rcError, setRcError]         = useState("");
  const [rcPreview, setRcPreview]     = useState(null);
  const [rcExtracting, setRcExtracting] = useState(false);
  const [rcExtracted, setRcExtracted] = useState(false);
  const [rcDetails, setRcDetails]     = useState(() => ({ ...defaultRcDetails, ...(initialValues?.rcDetails || {}) }));
  const [healthCheck, setHealthCheck] = useState(() => ({ ...defaultHealthCheck, ...(initialValues?.healthCheck || {}) }));
  const [healthOpen, setHealthOpen]   = useState(false);
  const rcInputRef = useRef(null);
  const isEditing  = Boolean(initialValues);

  /* Detect if existing RC details are populated */
  const hasRcDetails = Object.values(rcDetails).some(Boolean);

  useEffect(() => {
    setForm(mergedInitialValues);
    setExistingImages(initialValues?.images || []);
    setRcDetails({ ...defaultRcDetails, ...(initialValues?.rcDetails || {}) });
    setHealthCheck({ ...defaultHealthCheck, ...(initialValues?.healthCheck || {}) });
    setImageFiles([]);
    setRcFile(null);
    setRcRemoved(false);
    setRcError("");
    setRcExtracted(false);
    setRcPreview(null);
  }, [mergedInitialValues, initialValues]);

  const [validationErrors, setValidationErrors] = useState({});

  const validate = () => {
    const errors = {};
    if (!form.title.trim())       errors.title = "Title is required";
    if (!form.brand.trim())       errors.brand = "Brand is required";
    if (!form.model.trim())       errors.model = "Model is required";
    if (!form.year)               errors.year  = "Year is required";
    else if (form.year < 1990 || form.year > new Date().getFullYear() + 1)
                                  errors.year  = `Year must be between 1990 and ${new Date().getFullYear() + 1}`;
    if (!form.price || Number(form.price) <= 0)
                                  errors.price = "Enter a valid price";
    if (!form.kilometersDriven && Number(form.kilometersDriven) !== 0)
                                  errors.kilometersDriven = "KM driven is required";
    if (!form.location.trim())    errors.location = "Location is required";
    if (!form.description.trim()) errors.description = "Description is required";
    return errors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => { const next = { ...prev }; delete next[name]; return next; });
    }
  };

  const handleRcDetailsChange = (e) => {
    const { name, value } = e.target;
    setRcDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleHealthChange = (key, value) => {
    setHealthCheck((prev) => ({ ...prev, [key]: value }));
  };

  const handleRCChange = (e) => {
    const file = e.target.files?.[0];
    setRcError(""); setRcPreview(null); setRcExtracted(false);
    if (!file) { setRcFile(null); return; }
    if (!RC_ALLOWED_TYPES.includes(file.type)) {
      setRcError("Only PDF, JPG, or PNG files are accepted.");
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }
    if (file.size > RC_MAX_BYTES) {
      setRcError(`File must be under 5MB. Yours is ${(file.size/1024/1024).toFixed(1)}MB.`);
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }
    setRcFile(file);
    if (file.type.startsWith("image/")) {
      const r = new FileReader();
      r.onload = (ev) => setRcPreview(ev.target.result);
      r.readAsDataURL(file);
    } else {
      setRcPreview("pdf");
    }
  };

  const handleExtractFromRC = async () => {
    if (!rcFile) { setRcError("Upload RC document first."); return; }
    try {
      setRcExtracting(true); setRcError("");
      const extracted = await extractCarFromRC(rcFile);
      const autoFill  = extracted?.autoFill || {};
      const nextRc    = extracted?.rcDetails || {};
      setForm((prev) => ({
        ...prev,
        title:    autoFill.title    || prev.title,
        brand:    autoFill.brand    || prev.brand,
        model:    autoFill.model    || prev.model,
        year:     autoFill.year     || prev.year,
        fuelType: autoFill.fuelType || prev.fuelType,
        location: autoFill.location || prev.location,
      }));
      setRcDetails((prev) => ({ ...prev, ...nextRc }));
      setRcExtracted(true);
    } catch (err) {
      setRcError(err.response?.data?.message || err.message || "Failed to extract RC details");
    } finally {
      setRcExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      /* Scroll to first error */
      const firstField = Object.keys(errors)[0];
      document.getElementById(firstField)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setValidationErrors({});
    const rcAvailable = hasExistingRC && !rcRemoved;
    if (!rcFile && !rcAvailable) {
      setRcError("RC document is required. Please upload the Registration Certificate.");
      document.getElementById("rc-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") payload.append(key, value);
    });
    existingImages.forEach((img) => {
      const id = img.publicId || img.public_id;
      if (id) payload.append("keepImages", id);
    });
    if (existingImages.length === 0 && isEditing) payload.append("keepImages", "__none__");
    imageFiles.forEach((file) => payload.append("images", file));
    if (rcFile)    payload.append("rcDocument", rcFile);
    if (rcRemoved) payload.append("removeRC", "true");
    payload.append("rcDetails", JSON.stringify(rcDetails));

    const hcPayload = {};
    HEALTH_FIELDS.forEach(({ key }) => {
      const v = healthCheck[key];
      if (v !== "" && v !== null && v !== undefined) hcPayload[key] = Number(v);
    });
    if (healthCheck.inspectedBy) hcPayload.inspectedBy = healthCheck.inspectedBy;
    if (Object.keys(hcPayload).length) payload.append("healthCheck", JSON.stringify(hcPayload));

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="car-form card">

      {/* ══════════════════════════════════════
          SECTION 1 — RC UPLOAD & AUTO-FILL
      ══════════════════════════════════════ */}
      <div id="rc-section" className="cf-section">
        <SectionHeader
          icon="📄"
          title="RC Document"
          subtitle="Upload your Registration Certificate first — we'll auto-fill the vehicle details for you."
        />

        <div className="cf-rc-row">
          {/* Dropzone */}
          <div className={`rc-dropzone cf-rc-dropzone ${rcFile ? "rc-dropzone--selected" : ""} ${rcError ? "rc-dropzone--error" : ""}`}>
            <input
              id="rcDocument" ref={rcInputRef} type="file"
              accept={RC_ACCEPTED} onChange={handleRCChange}
              className="rc-file-input"
            />
            {!rcFile ? (
              <div className="rc-dropzone-placeholder">
                {hasExistingRC && !rcRemoved ? (
                  <>
                    <div className="rc-existing-badge" style={{ margin: "0 auto 0.5rem" }}>✓ RC on file</div>
                    <div className="rc-upload-text">Upload new RC to replace</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "2rem", marginBottom: "0.4rem" }}>📤</div>
                    <div className="rc-upload-text">Click to upload RC</div>
                  </>
                )}
                <div className="rc-upload-formats">PDF · JPG · PNG · Max 5MB</div>
              </div>
            ) : (
              <div className="rc-file-selected">
                {rcPreview === "pdf"
                  ? <div className="rc-pdf-icon">PDF</div>
                  : rcPreview
                    ? <img src={rcPreview} alt="RC preview" className="rc-img-preview" />
                    : null
                }
                <div className="rc-file-info">
                  <div className="rc-file-name">{rcFile.name}</div>
                  <div className="rc-file-size">{(rcFile.size/1024).toFixed(0)} KB</div>
                </div>
                <button type="button" className="rc-remove-btn"
                  onClick={() => { setRcFile(null); setRcPreview(null); setRcError(""); setRcExtracted(false); if(rcInputRef.current) rcInputRef.current.value=""; }}>
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Extract + status */}
          <div className="cf-rc-actions">
            {hasExistingRC && !rcFile && !rcRemoved && (
              <button type="button" className="btn btn-danger" style={{ marginBottom:"0.5rem" }}
                onClick={() => { setRcRemoved(true); setRcError(""); }}>
                Remove existing RC
              </button>
            )}
            <button
              type="button"
              className={`btn ${rcFile ? "btn-primary" : "btn-secondary"} cf-extract-btn`}
              onClick={handleExtractFromRC}
              disabled={!rcFile || rcExtracting}
            >
              {rcExtracting
                ? <><span className="cf-spinner" /> Extracting...</>
                : rcExtracted
                  ? "🔄 Re-extract Details"
                  : "🤖 Extract Details from RC"
              }
            </button>
            {rcExtracted && (
              <div className="cf-extract-success">
                ✓ Details auto-filled! Review and edit below.
              </div>
            )}
            {rcError && <div className="rc-error"><span>!</span> {rcError}</div>}
            <div className="rc-info-box" style={{ marginTop:"0.75rem" }}>
              <span className="rc-info-icon">🔒</span>
              <span>RC stored privately. Buyers never see the file.</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 2 — BASIC INFO (auto-filled from RC)
      ══════════════════════════════════════ */}
      <div className="cf-section cf-section--border">
        <SectionHeader
          icon="🚗"
          title="Vehicle Information"
          subtitle={rcExtracted ? "Auto-filled from RC — please verify and correct if needed." : "Fill in your vehicle details."}
        />
        {rcExtracted && (
          <div className="cf-autofill-banner">
            🤖 Fields below were auto-filled from your RC document. Please verify each one.
          </div>
        )}
        <div className="car-form-grid">
          <div className="field">
            <label htmlFor="title">Listing Title *</label>
            <input id="title" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. 2020 Maruti Swift VXI"
              className={validationErrors.title ? "field-input--error" : ""} />
            {validationErrors.title && <span className="field-error">{validationErrors.title}</span>}
          </div>
          <div className="field">
            <label htmlFor="brand">Brand *</label>
            <input id="brand" name="brand" value={form.brand} onChange={handleChange} required placeholder="e.g. Maruti Suzuki"
              className={validationErrors.brand ? "field-input--error" : ""} />
            {validationErrors.brand && <span className="field-error">{validationErrors.brand}</span>}
          </div>
          <div className="field">
            <label htmlFor="model">Model *</label>
            <input id="model" name="model" value={form.model} onChange={handleChange} required placeholder="e.g. Swift VXI"
              className={validationErrors.model ? "field-input--error" : ""} />
            {validationErrors.model && <span className="field-error">{validationErrors.model}</span>}
          </div>
          <div className="field">
            <label htmlFor="year">Year *</label>
            <input id="year" name="year" type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year} onChange={handleChange} required
              className={validationErrors.year ? "field-input--error" : ""} />
            {validationErrors.year && <span className="field-error">{validationErrors.year}</span>}
          </div>
          <div className="field">
            <label htmlFor="price">Price (₹) *</label>
            <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange} required
              className={validationErrors.price ? "field-input--error" : ""} />
            {validationErrors.price && <span className="field-error">{validationErrors.price}</span>}
          </div>
          <div className="field">
            <label htmlFor="fuelType">Fuel Type *</label>
            <select id="fuelType" name="fuelType" value={form.fuelType} onChange={handleChange}>
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Electric">Electric</option>
              <option value="Hybrid">Hybrid</option>
              <option value="CNG">CNG</option>
              <option value="LPG">LPG</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="transmission">Transmission *</label>
            <select id="transmission" name="transmission" value={form.transmission} onChange={handleChange}>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic</option>
              <option value="CVT">CVT</option>
              <option value="AMT">AMT</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="kilometersDriven">KM Driven *</label>
            <input id="kilometersDriven" name="kilometersDriven" type="number" min="0" value={form.kilometersDriven} onChange={handleChange} required />
          </div>
          <div className="field">
            <label htmlFor="city">City</label>
            <select id="city" name="city" value={form.city} onChange={handleChange}>
              <option value="">Select City</option>
              {INDIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="area">Area / Locality</label>
            <input id="area" name="area" value={form.area} onChange={handleChange} placeholder="e.g. Anna Nagar, Whitefield" />
          </div>
          <div className="field field--full">
            <label htmlFor="location">Full Location *</label>
            <input id="location" name="location" value={form.location} onChange={handleChange} required placeholder="e.g. Anna Nagar, Chennai, Tamil Nadu" />
          </div>
          <div className="field field--full">
            <label htmlFor="description">Description *</label>
            <textarea id="description" name="description" rows="4" value={form.description} onChange={handleChange} required placeholder="Describe the condition, any modifications, reason for selling, etc." />
          </div>
          {includeStatus && (
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={form.status} onChange={handleChange}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 3 — RC CONFIRMED DETAILS
          Only shown after extraction or if editing with existing RC details
      ══════════════════════════════════════ */}
      {(rcExtracted || hasRcDetails) && (
        <div className="cf-section cf-section--border cf-section--green">
          <SectionHeader
            icon="✅"
            title="RC Confirmed Details"
            subtitle="Extracted from your RC document. Verify and correct if anything is wrong."
          />
          <div className="car-form-grid">
            {[
              ["registrationNumber","Registration No."],
              ["ownerName","Owner Name"],
              ["manufacturer","Manufacturer"],
              ["vehicleModel","Vehicle Model"],
              ["fuelType","Fuel Type (RC)"],
              ["manufacturingYear","Mfg Year"],
              ["registrationDate","Reg Date"],
              ["rtoOffice","RTO Office"],
              ["engineNumber","Engine No."],
              ["chassisNumber","Chassis No."],
              ["vehicleColor","Color"],
              ["seatingCapacity","Seating Capacity"],
            ].map(([name, label]) => (
              <div key={name} className="field">
                <label htmlFor={`rc-${name}`}>{label}</label>
                <input id={`rc-${name}`} name={name} value={rcDetails[name]} onChange={handleRcDetailsChange} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          SECTION 4 — PHOTOS
      ══════════════════════════════════════ */}
      <div className="cf-section cf-section--border">
        <SectionHeader
          icon="📸"
          title="Car Photos"
          subtitle="Upload up to 8 photos. The first photo will be shown as the main listing image."
        />

        {existingImages.length > 0 && (
          <div style={{ marginBottom:"0.85rem" }}>
            <p className="field-hint" style={{ marginBottom:"0.4rem" }}>Current photos — click × to remove:</p>
            <div className="img-preview-grid">
              {existingImages.map((img, idx) => (
                <div key={img.publicId || idx} className="img-preview-item">
                  <img src={img.url} alt={`Car ${idx+1}`} className="img-preview-thumb" />
                  <button type="button" className="img-preview-delete"
                    onClick={() => setExistingImages((p) => p.filter((_,i) => i !== idx))}>×</button>
                  {idx === 0 && <span className="img-preview-main-badge">Main</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="cf-photo-upload">
          <label htmlFor="images" className="cf-photo-label">
            <span style={{ fontSize:"1.5rem" }}>🖼</span>
            <span>Click to add photos</span>
            <span className="field-hint">JPG / PNG · Max 5MB each · Up to {8 - existingImages.length} more</span>
            <input id="images" name="images" type="file" accept="image/*" multiple style={{ display:"none" }}
              onChange={(e) => {
                const sel = Array.from(e.target.files || []);
                const allowed = 8 - existingImages.length;
                setImageFiles((p) => [...p, ...sel].slice(0, allowed));
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {imageFiles.length > 0 && (
          <div style={{ marginTop:"0.75rem" }}>
            <p className="field-hint" style={{ marginBottom:"0.4rem" }}>New photos to upload ({imageFiles.length}):</p>
            <div className="img-preview-grid">
              {imageFiles.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="img-preview-item">
                  <img src={URL.createObjectURL(file)} alt={`New ${idx+1}`} className="img-preview-thumb" />
                  <button type="button" className="img-preview-delete"
                    onClick={() => setImageFiles((p) => p.filter((_,i) => i !== idx))}>×</button>
                  {idx === 0 && existingImages.length === 0 && <span className="img-preview-main-badge">Main</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          SECTION 5 — HEALTH CHECK (collapsible)
      ══════════════════════════════════════ */}
      <div className="cf-section cf-section--border">
        <button type="button" className="cf-collapsible" onClick={() => setHealthOpen((v) => !v)}>
          <div className="cf-section-header" style={{ margin:0 }}>
            <span className="cf-section-icon">🔍</span>
            <div>
              <h3 className="cf-section-title" style={{ margin:0 }}>Vehicle Health Check <span className="cf-optional-tag">Optional</span></h3>
              <p className="cf-section-sub" style={{ margin:0 }}>Rate each component 1–5 to build buyer trust</p>
            </div>
          </div>
          <span className="cf-collapsible-arrow">{healthOpen ? "▲" : "▼"}</span>
        </button>

        {healthOpen && (
          <div style={{ marginTop:"1.25rem" }}>
            <div className="cf-health-grid">
              {HEALTH_FIELDS.map(({ key, label, icon }) => {
                const val = Number(healthCheck[key]) || 0;
                return (
                  <div key={key} className="cf-health-row">
                    <div className="cf-health-label"><span>{icon}</span><span>{label}</span></div>
                    <div className="cf-health-stars">
                      {[1,2,3,4,5].map((n) => (
                        <button key={n} type="button"
                          className={`cf-star ${val >= n ? "cf-star--active" : ""}`}
                          style={val >= n ? { color: RATING_COLORS[val] } : {}}
                          onClick={() => handleHealthChange(key, val === n ? "" : n)}
                          title={RATING_LABELS[n]}>★</button>
                      ))}
                      {val > 0 && <span className="cf-health-tag" style={{ color: RATING_COLORS[val] }}>{RATING_LABELS[val]}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="field" style={{ marginTop:"1rem" }}>
              <label htmlFor="inspectedBy">Inspected By</label>
              <input id="inspectedBy" value={healthCheck.inspectedBy || ""}
                onChange={(e) => handleHealthChange("inspectedBy", e.target.value)}
                placeholder="e.g. Certified Mechanic, Self-inspected" />
            </div>
          </div>
        )}
      </div>

      {/* ── Submit ── */}
      <div className="car-form-footer">
        <button type="submit" className="btn btn-primary cf-submit-btn">{submitLabel}</button>
        {isEditing && hasExistingRC && !rcFile && (
          <p className="rc-edit-note">Existing RC will be kept unless you upload a new one.</p>
        )}
      </div>

    </form>
  );
};

export default CarForm;