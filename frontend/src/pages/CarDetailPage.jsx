import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCarById } from "../services/carService";
import { getStoredUser } from "../services/authService";
import { startConversation } from "../services/messageService";

const fallback =
  "https://images.unsplash.com/photo-1584345604476-8ec5f452d1f2?auto=format&fit=crop&w=1200&q=80";

const CarDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = getStoredUser();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");

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

  const handleStartChat = async () => {
    try {
      setChatError("");
      const thread = await startConversation({
        carId: car._id,
        text: `Hi, I am interested in your listing: ${car.title}`,
      });
      navigate(`/messages?thread=${thread._id}`);
    } catch (err) {
      setChatError(err.response?.data?.message || "Failed to start chat");
    }
  };

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
          {chatError ? <p style={{ color: "#c63030" }}>{chatError}</p> : null}
          {car.ownerId && car.ownerId !== user?.id ? (
            <button type="button" className="btn btn-primary" onClick={handleStartChat}>
              Message Seller
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default CarDetailPage;
