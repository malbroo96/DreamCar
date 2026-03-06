import { useMemo, useState } from "react";
import CarCard from "../components/CarCard";
import CarFilters from "../components/CarFilters";
import useCars from "../hooks/useCars";

const defaultFilters = {
  brand: "",
  model: "",
  fuelType: "",
  year: "",
  minPrice: "",
  maxPrice: "",
};

const HomePage = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const queryParams = useMemo(() => {
    return Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
  }, [filters]);

  const { cars, loading, error } = useCars(queryParams);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section>
      <div className="section-header">
        <h1 style={{ margin: 0 }}>Dream Car Marketplace</h1>
        <p style={{ margin: 0, color: "#4c6785" }}>{cars.length} cars</p>
      </div>

      <CarFilters filters={filters} onChange={handleFilterChange} onReset={() => setFilters(defaultFilters)} />

      {loading ? <p>Loading cars...</p> : null}
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}

      <div className="grid car-grid">
        {cars.map((car) => (
          <CarCard key={car._id} car={car} />
        ))}
      </div>

      {!loading && cars.length === 0 ? <p>No cars found.</p> : null}
    </section>
  );
};

export default HomePage;
