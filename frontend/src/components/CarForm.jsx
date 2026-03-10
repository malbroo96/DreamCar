import { useEffect, useMemo, useRef, useState } from "react";
import { extractCarFromRC } from "../services/carService";
import "./CarForm.css";

const defaultFormState = {
  title: "",
  brand: "",
  model: "",
  year: "",
  price: "0",
  fuelType: "Petrol",
  transmission: "Manual",
  kilometersDriven: "0",
  description: "Details extracted from RC document.",
  location: "",
  status: "approved",
};

const defaultRcDetails = {
  registrationNumber: "",
  ownerName: "",
  manufacturer: "",
  vehicleModel: "",
  fuelType: "",
  manufacturingYear: "",
  engineNumber: "",
  chassisNumber: "",
  vehicleColor: "",
  seatingCapacity: "",
  registrationDate: "",
  rtoOffice: "",
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
  manualEntryEnabled = true,
}) => {
  const mergedInitialValues = useMemo(
    () => ({ ...defaultFormState, ...(initialValues || {}) }),
    [initialValues]
  );

  const [form, setForm] = useState(mergedInitialValues);
  const [imageFiles, setImageFiles] = useState([]);
  const [existingImages, setExistingImages] = useState(() => initialValues?.images || []);

  const [rcFile, setRcFile] = useState(null);
  const [rcRemoved, setRcRemoved] = useState(false);
  const [rcError, setRcError] = useState("");
  const [rcPreview, setRcPreview] = useState(null);
  const [rcExtracting, setRcExtracting] = useState(false);
  const [rcExtractMessage, setRcExtractMessage] = useState("");
  const [rcDetails, setRcDetails] = useState(() => ({ ...defaultRcDetails, ...(initialValues?.rcDetails || {}) }));
  const rcInputRef = useRef(null);

  const isEditing = Boolean(initialValues);

  useEffect(() => {
    setForm(mergedInitialValues);
    setExistingImages(initialValues?.images || []);
    setRcDetails({ ...defaultRcDetails, ...(initialValues?.rcDetails || {}) });
    setImageFiles([]);
    setRcFile(null);
    setRcRemoved(false);
    setRcError("");
    setRcExtractMessage("");
    setRcPreview(null);
  }, [mergedInitialValues, initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRcDetailsChange = (e) => {
    const { name, value } = e.target;
    setRcDetails((prev) => ({ ...prev, [name]: value }));
  };

  const handleRCChange = (e) => {
    const file = e.target.files?.[0];
    setRcError("");
    setRcPreview(null);
    setRcExtractMessage("");

    if (!file) {
      setRcFile(null);
      return;
    }

    if (!RC_ALLOWED_TYPES.includes(file.type)) {
      setRcError("Only PDF, JPG, or PNG files are accepted for RC document.");
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }

    if (file.size > RC_MAX_BYTES) {
      setRcError(`RC document must be smaller than ${RC_MAX_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      setRcFile(null);
      if (rcInputRef.current) rcInputRef.current.value = "";
      return;
    }

    setRcFile(file);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setRcPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setRcPreview("pdf");
    }
  };

  const handleExtractFromRC = async () => {
    if (!rcFile) {
      setRcError("Please upload RC document first, then extract details.");
      return;
    }

    try {
      setRcExtracting(true);
      setRcExtractMessage("");
      setRcError("");

      const extracted = await extractCarFromRC(rcFile);
      const autoFill = extracted?.autoFill || {};
      const nextRcDetails = extracted?.rcDetails || {};

      setForm((prev) => ({
        ...prev,
        title: autoFill.title || prev.title,
        brand: autoFill.brand || prev.brand,
        model: autoFill.model || prev.model,
        year: autoFill.year || prev.year,
        fuelType: autoFill.fuelType || prev.fuelType,
        location: autoFill.location || prev.location,
      }));

      setRcDetails((prev) => ({ ...prev, ...nextRcDetails }));
      setRcExtractMessage("RC details extracted. Please verify and edit if needed before publishing.");
    } catch (err) {
      setRcError(err.response?.data?.message || err.message || "Failed to extract RC details");
    } finally {
      setRcExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const rcAvailable = hasExistingRC && !rcRemoved;
    if (!rcFile && !rcAvailable) {
      setRcError("RC document is required. Please upload the vehicle Registration Certificate.");
      return;
    }

    if (!manualEntryEnabled) {
      const missingAutoFields = ["title", "brand", "model", "year", "fuelType", "location"].filter(
        (field) => !String(form[field] || "").trim()
      );
      if (missingAutoFields.length) {
        setRcError("Please extract RC details first so required vehicle fields are auto-filled.");
        return;
      }
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    existingImages.forEach((img) => {
      const id = img.publicId || img.public_id;
      if (id) payload.append("keepImages", id);
    });

    if (existingImages.length === 0 && isEditing) {
      payload.append("keepImages", "__none__");
    }

    imageFiles.forEach((file) => payload.append("images", file));

    if (rcFile) payload.append("rcDocument", rcFile);
    if (rcRemoved) payload.append("removeRC", "true");
    payload.append("rcDetails", JSON.stringify(rcDetails));

    await onSubmit(payload);
  };

  const carPhotosSection = (
    <div className="field field--full">
      <label htmlFor="images">Car Photos</label>

      {existingImages.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <span className="field-hint" style={{ marginBottom: "0.4rem", display: "block" }}>
            Current photos - click x to remove:
          </span>
          <div className="img-preview-grid">
            {existingImages.map((img, idx) => (
              <div key={img.publicId || idx} className="img-preview-item">
                <img src={img.url} alt={`Car photo ${idx + 1}`} className="img-preview-thumb" />
                <button
                  type="button"
                  className="img-preview-delete"
                  onClick={() => setExistingImages((prev) => prev.filter((_, i) => i !== idx))}
                  title="Remove this photo"
                >
                  x
                </button>
                {idx === 0 && existingImages.length > 0 ? <span className="img-preview-main-badge">Main</span> : null}
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

      {imageFiles.length > 0 && (
        <div style={{ marginTop: "0.5rem" }}>
          <span className="field-hint" style={{ marginBottom: "0.4rem", display: "block" }}>
            New photos to upload:
          </span>
          <div className="img-preview-grid">
            {imageFiles.map((file, idx) => (
              <div key={`${file.name}-${idx}`} className="img-preview-item">
                <img src={URL.createObjectURL(file)} alt={`New photo ${idx + 1}`} className="img-preview-thumb" />
                <button
                  type="button"
                  className="img-preview-delete"
                  onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                  title="Remove image"
                >
                  x
                </button>
                {idx === 0 && existingImages.length === 0 ? <span className="img-preview-main-badge">Main</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="car-form card">
      <div className="car-form-grid">
        {manualEntryEnabled ? (
          <>
            <div className="field">
              <label htmlFor="title">Title *</label>
              <input id="title" name="title" value={form.title} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="brand">Brand *</label>
              <input id="brand" name="brand" value={form.brand} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="model">Model *</label>
              <input id="model" name="model" value={form.model} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="year">Year *</label>
              <input id="year" name="year" type="number" min="1990" max={new Date().getFullYear() + 1} value={form.year} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="price">Price (INR) *</label>
              <input id="price" name="price" type="number" min="0" value={form.price} onChange={handleChange} required />
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
              <input id="kilometersDriven" name="kilometersDriven" type="number" min="0" value={form.kilometersDriven} onChange={handleChange} required />
            </div>
            <div className="field">
              <label htmlFor="location">Location *</label>
              <input id="location" name="location" value={form.location} onChange={handleChange} required />
            </div>
            <div className="field field--full">
              <label htmlFor="description">Description *</label>
              <textarea id="description" name="description" rows="4" value={form.description} onChange={handleChange} required />
            </div>
          </>
        ) : (
          <div className="field field--full">
            <p style={{ margin: 0, color: "#4c6785" }}>
              Basic car fields are auto-filled from RC extraction in Sell Car mode.
            </p>
          </div>
        )}

        <div className="field field--full rc-upload-section">
          <div className="rc-upload-header">
            <div className="rc-upload-title">
              <span className="rc-icon">RC</span>
              <div>
                <label htmlFor="rcDocument" className="rc-label">RC Document (Registration Certificate) *</label>
                <p className="rc-description">
                  Upload the RC document, extract details, verify them, and edit before publishing.
                </p>
              </div>
            </div>
            {hasExistingRC && !rcFile && !rcRemoved && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div className="rc-existing-badge">RC on file</div>
                <button
                  type="button"
                  onClick={() => {
                    setRcRemoved(true);
                    setRcError("");
                  }}
                  className="btn btn-danger"
                >
                  Remove RC
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
                <div className="rc-upload-text">Choose RC file to upload</div>
                <div className="rc-upload-formats">PDF | JPG | PNG | Max 5MB</div>
              </div>
            ) : (
              <div className="rc-file-selected">
                {rcPreview === "pdf" ? <div className="rc-pdf-icon">PDF</div> : rcPreview ? <img src={rcPreview} alt="RC preview" className="rc-img-preview" /> : null}
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
                    setRcExtractMessage("");
                    if (rcInputRef.current) rcInputRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: "0.65rem" }}>
            <button type="button" className="btn btn-secondary" onClick={handleExtractFromRC} disabled={rcExtracting}>
              {rcExtracting ? "Extracting..." : "Extract RC Details"}
            </button>
            {rcExtractMessage ? <p style={{ marginTop: "0.45rem", marginBottom: 0, color: "#177245" }}>{rcExtractMessage}</p> : null}
          </div>

          {rcError ? (
            <div className="rc-error">
              <span>!</span> {rcError}
            </div>
          ) : null}

          <div style={{ marginTop: "0.9rem", borderTop: "1px solid #d7e2f0", paddingTop: "0.75rem" }}>
            <p style={{ marginTop: 0, marginBottom: "0.65rem", color: "#4c6785", fontWeight: 600 }}>
              RC Details (confirm/edit before publish)
            </p>
            <div className="car-form-grid">
              <div className="field">
                <label htmlFor="registrationNumber">Registration Number</label>
                <input id="registrationNumber" name="registrationNumber" value={rcDetails.registrationNumber} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="ownerName">Owner Name</label>
                <input id="ownerName" name="ownerName" value={rcDetails.ownerName} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="manufacturer">Manufacturer</label>
                <input id="manufacturer" name="manufacturer" value={rcDetails.manufacturer} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="vehicleModel">Vehicle Model</label>
                <input id="vehicleModel" name="vehicleModel" value={rcDetails.vehicleModel} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="fuelTypeRc">Fuel Type</label>
                <input id="fuelTypeRc" name="fuelType" value={rcDetails.fuelType} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="manufacturingYear">Manufacturing Year</label>
                <input id="manufacturingYear" name="manufacturingYear" value={rcDetails.manufacturingYear} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="registrationDate">Registration Date</label>
                <input id="registrationDate" name="registrationDate" value={rcDetails.registrationDate} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="rtoOffice">RTO Office</label>
                <input id="rtoOffice" name="rtoOffice" value={rcDetails.rtoOffice} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="engineNumber">Engine Number</label>
                <input id="engineNumber" name="engineNumber" value={rcDetails.engineNumber} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="chassisNumber">Chassis Number</label>
                <input id="chassisNumber" name="chassisNumber" value={rcDetails.chassisNumber} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="vehicleColor">Vehicle Color</label>
                <input id="vehicleColor" name="vehicleColor" value={rcDetails.vehicleColor} onChange={handleRcDetailsChange} />
              </div>
              <div className="field">
                <label htmlFor="seatingCapacity">Seating Capacity</label>
                <input id="seatingCapacity" name="seatingCapacity" value={rcDetails.seatingCapacity} onChange={handleRcDetailsChange} />
              </div>
            </div>
          </div>

          <div className="rc-info-box">
            <span className="rc-info-icon">Secure</span>
            <span>RC document is stored privately. Buyers only see confirmed vehicle details, not the RC file.</span>
          </div>
        </div>

        {carPhotosSection}

        {includeStatus ? (
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={form.status} onChange={handleChange}>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        ) : null}
      </div>

      <div className="car-form-footer">
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
        {isEditing && hasExistingRC && !rcFile ? (
          <p className="rc-edit-note">Existing RC document will be kept unless you upload a new one.</p>
        ) : null}
      </div>
    </form>
  );
};

export default CarForm;
