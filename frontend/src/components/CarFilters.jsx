import { memo, useState } from "react";
import "./CarFilters.css";

const POPULAR_CITIES = ["Chennai", "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune", "Kolkata", "Ahmedabad"];

const BRANDS = ["", "Maruti Suzuki", "Hyundai", "Tata", "Mahindra", "Honda", "Toyota", "Kia", "Ford", "Volkswagen", "BMW", "Mercedes-Benz", "Audi", "Skoda", "Renault", "Nissan", "MG", "Jeep"];

const BUDGET_RANGES = [
  { label: "Under ₹3L",   min: "",      max: 300000  },
  { label: "₹3L – ₹5L",  min: 300000,  max: 500000  },
  { label: "₹5L – ₹10L", min: 500000,  max: 1000000 },
  { label: "₹10L – ₹20L",min: 1000000, max: 2000000 },
  { label: "₹20L+",      min: 2000000, max: ""      },
];

const KM_RANGES = [
  { label: "Under 20k", max: 20000  },
  { label: "20–50k",    min: 20000, max: 50000  },
  { label: "50–100k",   min: 50000, max: 100000 },
  { label: "100k+",     min: 100000 },
];

const CarFilters = ({ filters, onChange, onReset }) => {
  const [expanded, setExpanded] = useState(false);

  const handleBudget = (range) => {
    onChange({ target: { name: "minPrice", value: String(range.min || "") } });
    onChange({ target: { name: "maxPrice", value: String(range.max || "") } });
  };

  const handleKm = (range) => {
    onChange({ target: { name: "minKm", value: String(range.min || "") } });
    onChange({ target: { name: "maxKm", value: String(range.max || "") } });
  };

  const activeCount = Object.entries(filters).filter(([, v]) => v !== "").length;

  return (
    <div className="cf-wrap">
      {/* ── City quick-select ── */}
      <div className="cf-cities">
        <span className="cf-cities-label">Popular Cities:</span>
        {POPULAR_CITIES.map((city) => (
          <button
            key={city}
            type="button"
            className={`cf-city-btn ${filters.city === city ? "cf-city-btn--active" : ""}`}
            onClick={() =>
              onChange({ target: { name: "city", value: filters.city === city ? "" : city } })
            }
          >
            {city}
          </button>
        ))}
      </div>

      {/* ── Main filter bar ── */}
      <div className="cf-bar card">
        {/* Search */}
        <div className="cf-search-wrap">
          <svg className="cf-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            className="cf-search"
            name="search"
            value={filters.search || ""}
            onChange={onChange}
            placeholder="Search brand, model, location..."
          />
          {filters.search && (
            <button className="cf-search-clear" onClick={() => onChange({ target: { name: "search", value: "" } })}>✕</button>
          )}
        </div>

        {/* Brand */}
        <select className="cf-select" name="brand" value={filters.brand} onChange={onChange}>
          <option value="">All Brands</option>
          {BRANDS.filter(Boolean).map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        {/* Fuel */}
        <select className="cf-select" name="fuelType" value={filters.fuelType} onChange={onChange}>
          <option value="">All Fuels</option>
          <option value="Petrol">⛽ Petrol</option>
          <option value="Diesel">🛢 Diesel</option>
          <option value="Electric">⚡ Electric</option>
          <option value="Hybrid">🔋 Hybrid</option>
          <option value="CNG">🌿 CNG</option>
        </select>

        {/* Transmission */}
        <select className="cf-select" name="transmission" value={filters.transmission || ""} onChange={onChange}>
          <option value="">All Transmissions</option>
          <option value="Manual">Manual</option>
          <option value="Automatic">Automatic</option>
          <option value="CVT">CVT</option>
          <option value="AMT">AMT</option>
        </select>

        {/* Year */}
        <select className="cf-select" name="year" value={filters.year} onChange={onChange}>
          <option value="">Any Year</option>
          {Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* More filters toggle */}
        <button
          type="button"
          className={`cf-more-btn ${expanded ? "cf-more-btn--active" : ""}`}
          onClick={() => setExpanded((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/></svg>
          Filters {activeCount > 0 && <span className="cf-badge">{activeCount}</span>}
        </button>

        {activeCount > 0 && (
          <button type="button" className="cf-reset-btn" onClick={onReset}>✕ Clear</button>
        )}
      </div>

      {/* ── Expanded filters ── */}
      {expanded && (
        <div className="cf-expanded card">
          {/* Budget ranges */}
          <div className="cf-group">
            <p className="cf-group-label">Budget</p>
            <div className="cf-pills">
              {BUDGET_RANGES.map((r) => {
                const active = String(filters.minPrice || "") === String(r.min || "") &&
                               String(filters.maxPrice || "") === String(r.max || "");
                return (
                  <button
                    key={r.label}
                    type="button"
                    className={`cf-pill ${active ? "cf-pill--active" : ""}`}
                    onClick={() => active
                      ? (onChange({ target: { name: "minPrice", value: "" } }), onChange({ target: { name: "maxPrice", value: "" } }))
                      : handleBudget(r)
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
            {/* Manual price inputs */}
            <div className="cf-range-inputs">
              <input className="cf-input" type="number" name="minPrice" placeholder="Min ₹" value={filters.minPrice} onChange={onChange} />
              <span className="cf-range-dash">–</span>
              <input className="cf-input" type="number" name="maxPrice" placeholder="Max ₹" value={filters.maxPrice} onChange={onChange} />
            </div>
          </div>

          {/* KM driven */}
          <div className="cf-group">
            <p className="cf-group-label">KM Driven</p>
            <div className="cf-pills">
              {KM_RANGES.map((r) => {
                const active = String(filters.minKm || "") === String(r.min || "") &&
                               String(filters.maxKm || "") === String(r.max || "");
                return (
                  <button
                    key={r.label}
                    type="button"
                    className={`cf-pill ${active ? "cf-pill--active" : ""}`}
                    onClick={() => active
                      ? (onChange({ target: { name: "minKm", value: "" } }), onChange({ target: { name: "maxKm", value: "" } }))
                      : handleKm(r)
                    }
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* City + Area */}
          <div className="cf-group">
            <p className="cf-group-label">Location</p>
            <div className="cf-range-inputs">
              <input className="cf-input" name="city" placeholder="City (e.g. Chennai)" value={filters.city || ""} onChange={onChange} />
              <input className="cf-input" name="area" placeholder="Area (e.g. Anna Nagar)" value={filters.area || ""} onChange={onChange} />
            </div>
          </div>

          {/* Featured only */}
          <div className="cf-group">
            <label className="cf-checkbox-label">
              <input
                type="checkbox"
                checked={filters.featured === "true"}
                onChange={(e) => onChange({ target: { name: "featured", value: e.target.checked ? "true" : "" } })}
              />
              ⭐ Featured listings only
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(CarFilters);