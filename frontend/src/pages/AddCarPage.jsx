import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CarForm from "../components/CarForm";
import { createCar } from "../services/carService";

const AddCarPage = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (payload) => {
    try {
      setSubmitting(true);
      setError("");
      await createCar(payload);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h1>Sell Your Car</h1>
      <p style={{ color: "#4c6785", marginTop: 0, marginBottom: "1.5rem" }}>
        Fill in the details below. Upload your RC document to auto-fill vehicle information.
      </p>
      {error && <p style={{ color: "#c63030", background: "#fff0f0", border: "1px solid #fecaca", borderRadius: 10, padding: "0.65rem 1rem" }}>{error}</p>}
      {submitting && <p style={{ color: "#0b6ef3" }}>Publishing your listing...</p>}
      <CarForm onSubmit={handleCreate} submitLabel="Publish Listing" />
    </section>
  );
};

export default AddCarPage;