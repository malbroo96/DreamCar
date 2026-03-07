import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarCard from "../components/CarCard";
import CarFilters from "../components/CarFilters";
import useCars from "../hooks/useCars";
import { getStoredUser } from "../services/authService";
import { startConversation } from "../services/messageService";

const defaultFilters = {
  brand: "",
  model: "",
  fuelType: "",
  year: "",
  minPrice: "",
  maxPrice: "",
};

const HomePage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const user = useMemo(() => getStoredUser(), []);
  const displayName = useMemo(() => {
    if (!user) return "";
    if (user.name && user.name.trim()) return user.name.trim();
    if (user.email) return user.email.split("@")[0];
    return "User";
  }, [user]);
  const queryParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  }, [filters]);

  const { cars, loading, error } = useCars(queryParams);
  const [chatError, setChatError] = useState("");

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleStartChat = async (car) => {
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
    <section>
      <div className="section-header">
        <div>
          {displayName ? <p style={{ margin: "0 0 0.25rem", color: "#4c6785" }}>Welcome, {displayName}</p> : null}
          <h1 style={{ margin: 0 }}>Dream Car Marketplace</h1>
        </div>
        <p style={{ margin: 0, color: "#4c6785" }}>{cars.length} cars</p>
      </div>

      <CarFilters filters={filters} onChange={handleFilterChange} onReset={() => setFilters(defaultFilters)} />

      {loading ? <p>Loading cars...</p> : null}
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}
      {chatError ? <p style={{ color: "#c63030" }}>{chatError}</p> : null}

      <div className="grid car-grid">
        {cars.map((car) => (
          <CarCard
            key={car._id}
            car={car}
            adminActions={
              car.ownerId && car.ownerId !== user?.id ? (
                <button type="button" className="btn btn-secondary" style={{ marginTop: "0.7rem" }} onClick={() => handleStartChat(car)}>
                  Message Seller
                </button>
              ) : null
            }
          />
        ))}
      </div>

      {!loading && cars.length === 0 ? <p>No cars found.</p> : null}
    </section>
  );
};

export default HomePage;
