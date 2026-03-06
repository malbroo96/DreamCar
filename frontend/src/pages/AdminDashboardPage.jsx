import { useEffect, useState } from "react";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import {
  deleteAdminCar,
  getAdminCars,
  updateAdminCar,
} from "../services/carService";

const AdminDashboardPage = () => {
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchCars = async () => {
    try {
      setLoading(true);
      const data = await getAdminCars();
      setCars(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load admin cars");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;

    await deleteAdminCar(id);
    setCars((prev) => prev.filter((car) => car._id !== id));
    if (selectedCar?._id === id) setSelectedCar(null);
  };

  const handleUpdate = async (payload) => {
    if (!selectedCar) return;
    await updateAdminCar(selectedCar._id, payload);
    await fetchCars();
  };

  return (
    <section>
      <div className="section-header">
        <h1 style={{ margin: 0 }}>Admin Dashboard</h1>
      </div>

      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}
      {loading ? <p>Loading listings...</p> : null}

      {selectedCar ? (
        <div style={{ marginBottom: "1rem" }}>
          <h2>Edit Listing</h2>
          <CarForm
            key={selectedCar._id}
            initialValues={selectedCar}
            includeStatus
            submitLabel="Update Listing"
            onSubmit={handleUpdate}
          />
        </div>
      ) : null}

      <div className="grid car-grid">
        {cars.map((car) => (
          <CarCard
            key={car._id}
            car={car}
            adminActions={
              <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCar(car)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(car._id)}>
                  Delete
                </button>
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
};

export default AdminDashboardPage;
