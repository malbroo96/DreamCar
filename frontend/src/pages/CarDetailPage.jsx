import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCarById } from "../services/carService";

const fallback =
  "https://images.unsplash.com/photo-1584345604476-8ec5f452d1f2?auto=format&fit=crop&w=1200&q=80";

const CarDetailPage = () => {
  const { id } = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setLoading(true);
        const data = await getCarById(id);
        setCar(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load car");
      } finally {
        setLoading(false);
      }
    };

    fetchCar();
  }, [id]);

  if (loading) return <p>Loading car details...</p>;
  if (error) return <p style={{ color: "#c63030" }}>{error}</p>;
  if (!car) return <p>Car not found.</p>;

  return (
    <section className="card" style={{ padding: "1rem" }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
        <img
          src={car.images?.[0]?.url || fallback}
          alt={car.title}
          style={{ width: "100%", borderRadius: "12px", height: 240, objectFit: "cover" }}
        />
        <div>
          <h1 style={{ marginTop: 0 }}>{car.title}</h1>
          <h2 style={{ marginTop: 0, color: "#0b6ef3" }}>INR {Number(car.price).toLocaleString("en-IN")}</h2>
          <p>
            {car.brand} {car.model} | {car.year}
          </p>
          <p>
            {car.fuelType} | {car.transmission}
          </p>
          <p>{Number(car.kilometersDriven).toLocaleString("en-IN")} km driven</p>
          <p>{car.location}</p>
          <p>{car.description}</p>
          <p style={{ color: "#4c6785" }}>Posted on {new Date(car.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </section>
  );
};

export default CarDetailPage;
