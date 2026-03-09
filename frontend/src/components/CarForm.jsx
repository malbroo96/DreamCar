import { useEffect, useMemo, useState } from "react";
import { extractCarFromRc, getRcExtractionHealth } from "../services/carService";

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

const photoViews = [
  { key: "frontView", label: "Front View" },
  { key: "rightView", label: "Right View" },
  { key: "leftView", label: "Left View" },
  { key: "backView", label: "Back View" },
  { key: "frontSeat", label: "Front Seat" },
  { key: "rearSeat", label: "Rear Seat" },
  { key: "meterBoard", label: "Meter Board" },
];

const CarForm = ({ initialValues, onSubmit, submitLabel = "Submit", includeStatus = false, enableRcAutofill = false }) => {
  const mergedInitialValues = useMemo(
    () => ({ ...defaultFormState, ...(initialValues || {}) }),
    [initialValues]
  );

  const [form, setForm] = useState(mergedInitialValues);
  const [viewFiles, setViewFiles] = useState({});
  const [currentPhotoStep, setCurrentPhotoStep] = useState(0);
  const [rcFile, setRcFile] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [healthLoading, setHealthLoading] = useState(false);
  const [geminiHealth, setGeminiHealth] = useState({ connected: false, message: "Checking Gemini connection..." });

  useEffect(() => {
    setForm(mergedInitialValues);
  }, [mergedInitialValues]);

  useEffect(() => {
    if (!enableRcAutofill) return;
    const checkHealth = async () => {
      try {
        setHealthLoading(true);
        const data = await getRcExtractionHealth();
        setGeminiHealth({
          connected: Boolean(data?.connected),
          message: data?.message || (data?.connected ? "Gemini is connected" : "Gemini is not connected"),
        });
      } catch (err) {
        setGeminiHealth({
          connected: false,
          message: err.response?.data?.message || "Failed to check Gemini connection",
        });
      } finally {
        setHealthLoading(false);
      }
    };

    checkHealth();
  }, [enableRcAutofill]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        payload.append(key, value);
      }
    });

    photoViews.forEach((view) => {
      const file = viewFiles[view.key];
      if (!file) return;
      payload.append("images", file);
      payload.append("imageLabels", view.label);
    });
    await onSubmit(payload);
  };

  const handlePhotoSelect = (viewKey, file) => {
    setViewFiles((prev) => ({
      ...prev,
      [viewKey]: file || null,
    }));

    if (file && currentPhotoStep < photoViews.length - 1) {
      setCurrentPhotoStep((prev) => Math.min(prev + 1, photoViews.length - 1));
    }
  };

  const handleRcExtract = async () => {
    if (!rcFile) {
      setAiError("Please upload an RC book image first.");
      return;
    }

    try {
      setAiLoading(true);
      setAiError("");
      setAiSuccess("");

      const result = await extractCarFromRc(rcFile);
      const autoFill = result?.autoFill || {};
      const fieldsToUpdate = Object.fromEntries(
        Object.entries(autoFill).filter(([, value]) => value !== undefined && value !== null && value !== "")
      );

      setForm((prev) => ({ ...prev, ...fieldsToUpdate }));

      const confidence = Number(result?.confidence || 0);
      const verifiedText = result?.verified ? "RC verified" : "Could not fully verify RC";
      setAiSuccess(`${verifiedText}. Confidence: ${confidence}%`);
    } catch (err) {
      setAiError(err.response?.data?.message || "Failed to extract RC details");
    } finally {
      setAiLoading(false);
    }
  };

  const uploadedCount = photoViews.reduce((count, view) => (viewFiles[view.key] ? count + 1 : count), 0);
  const currentPhotoView = photoViews[currentPhotoStep];

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "1rem" }}>
      {enableRcAutofill ? (
        <div
          style={{
            marginBottom: "1rem",
            border: "1px solid #d7e2f0",
            borderRadius: 12,
            padding: "0.85rem",
            background: "#f8fbff",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>RC Book Auto Fill (Gemini AI)</h3>
          <p style={{ marginTop: 0, color: "#4c6785" }}>
            Upload RC image or PDF to extract vehicle details and auto-fill the form.
          </p>
          <div style={{ marginBottom: "0.65rem", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <p style={{ margin: 0, color: geminiHealth.connected ? "#177245" : "#c63030" }}>
              {healthLoading ? "Checking Gemini connection..." : geminiHealth.message}
            </p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={async () => {
                try {
                  setHealthLoading(true);
                  const data = await getRcExtractionHealth();
                  setGeminiHealth({
                    connected: Boolean(data?.connected),
                    message: data?.message || (data?.connected ? "Gemini is connected" : "Gemini is not connected"),
                  });
                } catch (err) {
                  setGeminiHealth({
                    connected: false,
                    message: err.response?.data?.message || "Failed to check Gemini connection",
                  });
                } finally {
                  setHealthLoading(false);
                }
              }}
              disabled={healthLoading}
            >
              {healthLoading ? "Checking..." : "Recheck"}
            </button>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input type="file" accept="image/*,.pdf,application/pdf" onChange={(event) => setRcFile(event.target.files?.[0] || null)} />
            <button type="button" className="btn btn-secondary" onClick={handleRcExtract} disabled={aiLoading}>
              {aiLoading ? "Extracting..." : "Extract From RC"}
            </button>
          </div>
          {aiError ? <p style={{ marginBottom: 0, color: "#c63030" }}>{aiError}</p> : null}
          {aiSuccess ? <p style={{ marginBottom: 0, color: "#177245" }}>{aiSuccess}</p> : null}
        </div>
      ) : null}

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))" }}>
        <div className="field">
          <label htmlFor="title">Title</label>
          <input id="title" name="title" value={form.title} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <input id="brand" name="brand" value={form.brand} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="model">Model</label>
          <input id="model" name="model" value={form.model} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="year">Year</label>
          <input id="year" name="year" type="number" value={form.year} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="price">Price</label>
          <input id="price" name="price" type="number" value={form.price} onChange={handleChange} required />
        </div>
        <div className="field">
          <label htmlFor="fuelType">Fuel Type</label>
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
          <label htmlFor="transmission">Transmission</label>
          <select id="transmission" name="transmission" value={form.transmission} onChange={handleChange}>
            <option value="Manual">Manual</option>
            <option value="Automatic">Automatic</option>
            <option value="CVT">CVT</option>
            <option value="AMT">AMT</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="kilometersDriven">Kilometers Driven</label>
          <input
            id="kilometersDriven"
            name="kilometersDriven"
            type="number"
            value={form.kilometersDriven}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="location">Location</label>
          <input id="location" name="location" value={form.location} onChange={handleChange} required />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows="4"
            value={form.description}
            onChange={handleChange}
            required
          />
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label>Vehicle Photos</label>
          <div style={{ border: "1px solid #e4ebf3", borderRadius: 12, padding: "0.8rem", background: "#f9fbff" }}>
            <p style={{ marginTop: 0, marginBottom: "0.55rem", color: "#4c6785" }}>
              Upload photos step-by-step: {uploadedCount}/{photoViews.length} completed
            </p>
            <div style={{ marginBottom: "0.65rem", padding: "0.6rem", borderRadius: 10, background: "#fff", border: "1px solid #deebff" }}>
              <label htmlFor={`photo-${currentPhotoView.key}`} style={{ display: "block", marginBottom: "0.35rem", fontWeight: 700 }}>
                Step {currentPhotoStep + 1}: {currentPhotoView.label}
              </label>
              <input
                id={`photo-${currentPhotoView.key}`}
                name={`photo-${currentPhotoView.key}`}
                type="file"
                accept="image/*"
                onChange={(event) => handlePhotoSelect(currentPhotoView.key, event.target.files?.[0] || null)}
              />
              {viewFiles[currentPhotoView.key] ? (
                <p style={{ marginBottom: 0, marginTop: "0.45rem", color: "#177245" }}>
                  Uploaded: {viewFiles[currentPhotoView.key].name}
                </p>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPhotoStep((prev) => Math.max(prev - 1, 0))}
                disabled={currentPhotoStep === 0}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setCurrentPhotoStep((prev) => Math.min(prev + 1, photoViews.length - 1))}
                disabled={currentPhotoStep === photoViews.length - 1}
              >
                Next
              </button>
            </div>

            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: "0.5rem" }}>
              {photoViews.map((view, index) => (
                <button
                  key={view.key}
                  type="button"
                  className="btn"
                  onClick={() => setCurrentPhotoStep(index)}
                  style={{
                    textAlign: "left",
                    background: index === currentPhotoStep ? "#dce8fc" : "#ffffff",
                    border: "1px solid #e4ebf3",
                  }}
                >
                  {view.label}
                  <span style={{ marginLeft: "0.35rem", color: viewFiles[view.key] ? "#177245" : "#9aa9bc" }}>
                    {viewFiles[view.key] ? "Uploaded" : "Pending"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
        {includeStatus ? (
          <div className="field">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" value={form.status} onChange={handleChange}>
              <option value="approved">approved</option>
              <option value="pending">pending</option>
              <option value="rejected">rejected</option>
            </select>
          </div>
        ) : null}
      </div>

      <button type="submit" className="btn btn-primary" style={{ marginTop: "1rem" }}>
        {submitLabel}
      </button>
    </form>
  );
};

export default CarForm;
