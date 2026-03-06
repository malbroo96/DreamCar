import { useMemo, useState } from "react";

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

const CarForm = ({ initialValues, onSubmit, submitLabel = "Submit", includeStatus = false }) => {
  const mergedInitialValues = useMemo(
    () => ({ ...defaultFormState, ...(initialValues || {}) }),
    [initialValues]
  );

  const [form, setForm] = useState(mergedInitialValues);
  const [files, setFiles] = useState([]);

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

    files.forEach((file) => payload.append("images", file));
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ padding: "1rem" }}>
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
          <label htmlFor="images">Images</label>
          <input
            id="images"
            name="images"
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
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
