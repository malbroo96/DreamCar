const CarFilters = ({ filters, onChange, onReset }) => {
  return (
    <section className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
        <div className="field">
          <label htmlFor="brand">Brand</label>
          <input id="brand" name="brand" value={filters.brand} onChange={onChange} />
        </div>
        <div className="field">
          <label htmlFor="model">Model</label>
          <input id="model" name="model" value={filters.model} onChange={onChange} />
        </div>
        <div className="field">
          <label htmlFor="fuelType">Fuel</label>
          <select id="fuelType" name="fuelType" value={filters.fuelType} onChange={onChange}>
            <option value="">All</option>
            <option value="Petrol">Petrol</option>
            <option value="Diesel">Diesel</option>
            <option value="Electric">Electric</option>
            <option value="Hybrid">Hybrid</option>
            <option value="CNG">CNG</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="year">Year</label>
          <input id="year" name="year" type="number" value={filters.year} onChange={onChange} />
        </div>
        <div className="field">
          <label htmlFor="minPrice">Min Price</label>
          <input id="minPrice" name="minPrice" type="number" value={filters.minPrice} onChange={onChange} />
        </div>
        <div className="field">
          <label htmlFor="maxPrice">Max Price</label>
          <input id="maxPrice" name="maxPrice" type="number" value={filters.maxPrice} onChange={onChange} />
        </div>
      </div>
      <div style={{ marginTop: "0.85rem" }}>
        <button type="button" className="btn btn-secondary" onClick={onReset}>
          Reset Filters
        </button>
      </div>
    </section>
  );
};

export default CarFilters;
