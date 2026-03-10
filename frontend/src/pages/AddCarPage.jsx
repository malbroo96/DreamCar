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
      <h1>Add a Car Listing</h1>
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}
      {submitting ? <p>Submitting listing...</p> : null}
      <CarForm onSubmit={handleCreate} submitLabel="Publish Listing" manualEntryEnabled={false} />
    </section>
  );
};

export default AddCarPage;
