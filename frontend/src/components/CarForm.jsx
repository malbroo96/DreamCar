import { useMemo, useRef, useState } from "react";
import "./CarForm.css";

const defaultFormState = {
  title: "",
  brand: "",
  model: "",
  year: "",
  price: "",
  fuelType: "Petrol",
  transmission: "Manual",
  kilometersDriven: "",
  description: "",
  location: "",
  status: "approved",
};

const RC_ACCEPTED = ".pdf,.jpg,.jpeg,.png";
const RC_MAX_MB = 5;
const RC_MAX_BYTES = RC_MAX_MB * 1024 * 1024;
const RC_ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];

const CarForm = ({
  initialValues,
  onSubmit,
  submitLabel = "Submit",
  includeStatus = false,
  hasExistingRC = false,
}) => {
  const mergedInitialValues = useMemo(
    () => ({ ...defaultFormState, ...(initialValues || {}) }),
    [initialValues]
  );

  const [form, setForm] = useState(mergedInitialValues);
  const [imageFiles, setImageFiles] = useState([]);

  /* existing DB images — user can delete these individually */
  const [existingImages, setExistingImages] = useState(
    () => (initialValues?.images || [])
  );

  const [rcFile, setRcFile] = useState(null);
  const [rcRemoved, setRcRemoved] = useState(false); // user clicked "Remove RC"
  const [rcError, setRcError] = useState("");
  const [rcPreview, setRcPreview] = useState(null);
  const rcInputRef = useRef(null);

  const isEditing = Boolean(initialValues);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ── RC file validation ── */
  const handleRCChange = (e) => {
    const file = e.target.files?.[0];
    setRcError("");
    setRcPreview(null);

    if (!file) {
      setRcFile(null);
      return;
    }

    /* Type check */
    if (!RC_ALLOWED_TYPES.includes(file.mimetype || file.type)) {
      setRcError("Only PDF, JPG, or PNG files are accepted for RC document.");
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }

    /* Size check */
    if (file.size > RC_MAX_BYTES) {
      setRcError(`RC document must be smaller than ${RC_MAX_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }

    setRcFile(file);

    /* Show image preview if it's an image */
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setRcPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setRcPreview("pdf"); // flag for PDF icon display
    }
  };

  /* ── Form submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    /* Validate RC — required unless they have existing RC that isn't being removed */
    const rcAvailable = hasExistingRC && !rcRemoved;
    if (!rcFile && !rcAvailable) {
      setRcError("RC document is required. Please upload the vehicle's Registration Certificate.");
      return;
    }

    const payload = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    /* Always send keepImages so backend knows exactly which to keep.
       If keepImages is empty array, backend will remove all existing images. */
    existingImages.forEach((img) => {
      const id = img.publicId || img.public_id;
      if (id) payload.append("keepImages", id);
    });

    /* If no existing images kept and none removed, send empty marker */
    if (existingImages.length === 0 && isEditing) {
      payload.append("keepImages", "__none__");
    }

    /* Append new image files */
    imageFiles.forEach((file) => payload.append("images", file));

    if (rcFile) payload.append("rcDocument", rcFile);
    if (rcRemoved) payload.append("removeRC", "true");

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="car-form card">
      <div className="car-form-grid">

        {/* ── Basic details ── */}
        <div className="field">
          <label htmlFor="title">Title *</label>
          <input id="title" name="title" value={form.title} onChange={handleChange} required placeholder="e.g. 2020 Maruti Swift VXi" />
        </div>
        <div className="field">
          <label htmlFor="brand">Brand *</label>
          <input id="brand" name="brand" value={form.brand} onChange={handleChange} required placeholder="e.g. Maruti Suzuki" />
        </div>
        <div className="field">
          <label htmlFor="model">Model *</label>
          <input id="model" name="model" value={form.model} onChange={handleChange} required placeholder="e.g. Swift" />
        </div>
        <div className="field">
          <label htmlFor="year">Year *</label>
          <input id="year" name="year" type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="price">Price (INR) *</label>
          <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange} required placeholder="e.g. 450000" />
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
          <label htmlFor="kilometersDriven">Kilometers Driven *</label>
          <input id="kilometersDriven" name="kilometersDriven" type="number" min="0" value={form.kilometersDriven} onChange={handleChange} required placeholder="e.g. 45000" />
        </div>
        <div className="field">
          <label htmlFor="location">Location *</label>
          <input id="location" name="location" value={form.location} onChange={handleChange} required placeholder="e.g. Mumbai, Maharashtra" />
        </div>
        <div className="field field--full">
          <label htmlFor="description">Description *</label>
          <textarea id="description" name="description" rows="4" value={form.description} onChange={handleChange} required placeholder="Describe the car's condition, features, and history..." />
        </div>

        {/* ── Car Images ── */}
        <div className="field field--full">
          <label htmlFor="images">Car Photos</label>

          {/* ── Existing DB images (only when editing) ── */}
          {existingImages.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <span className="field-hint" style={{ marginBottom: "0.4rem", display: "block" }}>
                Current photos — click ✕ to remove:
              </span>
              <div className="img-preview-grid">
                {existingImages.map((img, idx) => (
                  <div key={img.publicId || idx} className="img-preview-item">
                    <img
                      src={img.url}
                      alt={`Car photo ${idx + 1}`}
                      className="img-preview-thumb"
                    />
                    <button
                      type="button"
                      className="img-preview-delete"
                      onClick={() => setExistingImages((prev) => prev.filter((_, i) => i !== idx))}
                      title="Remove this photo"
                    >
                      ✕
                    </button>
                    {idx === 0 && existingImages.length > 0 && (
                      <span className="img-preview-main-badge">Main</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              const totalAllowed = 8 - existingImages.length;
              const combined = [...imageFiles, ...selected].slice(0, totalAllowed);
              setImageFiles(combined);
              e.target.value = "";
            }}
          />
          <span className="field-hint">
            {existingImages.length > 0
              ? `${existingImages.length} current photo${existingImages.length !== 1 ? "s" : ""}. You can add up to ${8 - existingImages.length} more.`
              : "Upload up to 8 photos. JPG, PNG accepted. Max 5MB each."}
          </span>

          {/* ── New image previews ── */}
          {imageFiles.length > 0 && (
            <div style={{ marginTop: "0.5rem" }}>
              <span className="field-hint" style={{ marginBottom: "0.4rem", display: "block" }}>
                New photos to upload:
              </span>
              <div className="img-preview-grid">
                {imageFiles.map((file, idx) => (
                  <div key={idx} className="img-preview-item">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`New photo ${idx + 1}`}
                      className="img-preview-thumb"
                    />
                    <button
                      type="button"
                      className="img-preview-delete"
                      onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                      title="Remove image"
                    >
                      ✕
                    </button>
                    {idx === 0 && existingImages.length === 0 && (
                      <span className="img-preview-main-badge">Main</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RC Document (highlighted section) ── */}
        <div className="field field--full rc-upload-section">
          <div className="rc-upload-header">
            <div className="rc-upload-title">
              <span className="rc-icon">📄</span>
              <div>
                <label htmlFor="rcDocument" className="rc-label">
                  RC Document (Registration Certificate) *
                </label>
                <p className="rc-description">
                  Upload the vehicle's Registration Certificate to verify ownership.
                  This document is stored securely and is never shown to buyers.
                </p>
              </div>
            </div>
            {hasExistingRC && !rcFile && !rcRemoved && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div className="rc-existing-badge">
                  <span>✓</span> RC on file
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRcRemoved(true);
                    setRcError("");
                  }}
                  style={{
                    background: "none",
                    border: "1px solid #e4a0a0",
                    color: "#c63030",
                    borderRadius: "8px",
                    padding: "0.28rem 0.65rem",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  ✕ Remove RC
                </button>
              </div>
            )}
            {rcRemoved && !rcFile && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.6rem",
                background: "#fff0f0", border: "1px solid #ffd0d0",
                borderRadius: "8px", padding: "0.35rem 0.75rem",
              }}>
                <span style={{ fontSize: "0.8rem", color: "#c63030", fontWeight: 600 }}>
                  ⚠ RC will be removed — please upload a new one
                </span>
                <button
                  type="button"
                  onClick={() => { setRcRemoved(false); setRcError(""); }}
                  style={{
                    background: "none", border: "none",
                    color: "#4c6785", fontSize: "0.78rem",
                    cursor: "pointer", fontWeight: 600,
                  }}
                >
                  Undo
                </button>
              </div>
            )}
          </div>

          <div className={`rc-dropzone ${rcFile ? "rc-dropzone--selected" : ""} ${rcError ? "rc-dropzone--error" : ""}`}>
            <input
              id="rcDocument"
              ref={rcInputRef}
              type="file"
              accept={RC_ACCEPTED}
              onChange={handleRCChange}
              className="rc-file-input"
              required={!hasExistingRC}
            />

            {!rcFile ? (
              <div className="rc-dropzone-placeholder">
                <div className="rc-upload-icon">⬆</div>
                <div className="rc-upload-text">
                  {rcRemoved
                    ? "Upload new RC document (required)"
                    : hasExistingRC
                    ? "Upload new RC to replace existing"
                    : "Choose RC file to upload"}
                </div>
                <div className="rc-upload-formats">PDF · JPG · PNG &nbsp;·&nbsp; Max 5MB</div>
              </div>
            ) : (
              <div className="rc-file-selected">
                {rcPreview === "pdf" ? (
                  <div className="rc-pdf-icon">📄</div>
                ) : rcPreview ? (
                  <img src={rcPreview} alt="RC preview" className="rc-img-preview" />
                ) : null}
                <div className="rc-file-info">
                  <div className="rc-file-name">{rcFile.name}</div>
                  <div className="rc-file-size">{(rcFile.size / 1024).toFixed(0)} KB</div>
                </div>
                <button
                  type="button"
                  className="rc-remove-btn"
                  onClick={() => {
                    setRcFile(null);
                    setRcPreview(null);
                    setRcError("");
                    if (rcInputRef.current) rcInputRef.current.value = "";
                  }}
                >
                  ✕ Remove
                </button>
              </div>
            )}
          </div>

          {rcError && (
            <div className="rc-error">
              <span>⚠</span> {rcError}
            </div>
          )}

          <div className="rc-info-box">
            <span className="rc-info-icon">🔒</span>
            <span>
              Your RC document is encrypted and stored privately. It is only accessible
              to you and DreamCar administrators — never visible to buyers.
            </span>
          </div>
        </div>

        {/* ── Status (admin only) ── */}
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

      <div className="car-form-footer">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        {isEditing && hasExistingRC && !rcFile && (
          <p className="rc-edit-note">
            ℹ Existing RC document will be kept unless you upload a new one.
          </p>
        )}
      </div>
    </form>
  );
};

export default CarForm;