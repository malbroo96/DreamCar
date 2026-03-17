import { Link, useNavigate } from "react-router-dom";
import { memo } from "react";
import "./CarCard.css";

const placeholder =
  "https://images.unsplash.com/photo-1549925862-990f9f1d0c9f?auto=format&fit=crop&w=900&q=80";

const calcEMI = (price) => {
  const r = 0.075 / 12;
  const n = 60;
  const emi = (price * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi).toLocaleString("en-IN");
};

const healthScore = (hc) => {
  if (!hc) return null;
  const fields = ["engine", "transmission", "brakes", "tyres", "ac", "electricals", "suspension", "body"];
  const values = fields.map((f) => hc[f]).filter((v) => v !== null && v !== undefined);
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / (values.length * 5)) * 100);
};

const CarCard = ({ car, adminActions, currentUserId }) => {
  const navigate  = useNavigate();
  const score     = healthScore(car.healthCheck);
  const scoreColor =
    score === null ? null :
    score >= 80 ? "#16a34a" :
    score >= 60 ? "#d97706" : "#dc2626";

  const isOwner = currentUserId && car.ownerId === currentUserId;

  return (
    <article className="carcard">
      <Link to={`/cars/${car._id}`} className="carcard-img-wrap">
        <img src={car.images?.[0]?.url || placeholder} alt={car.title} className="carcard-img" loading="lazy" />
        <div className="carcard-badges">
          {car.featured && <span className="carcard-badge carcard-badge--featured">⭐ Featured</span>}
          {car.rcVerified && <span className="carcard-badge carcard-badge--verified">✓ RC Verified</span>}
          {car.rcDocument?.publicId && !car.rcVerified && <span className="carcard-badge carcard-badge--uploaded">📄 RC Uploaded</span>}
        </div>
        {score !== null && (
          <div className="carcard-health" style={{ background: scoreColor }}>{score}% Health</div>
        )}
      </Link>

      <div className="carcard-body">
        <Link to={`/cars/${car._id}`}>
          <h3 className="carcard-title">{car.title}</h3>
        </Link>
        <div className="carcard-price-row">
          <span className="carcard-price">₹{Number(car.price).toLocaleString("en-IN")}</span>
          <span className="carcard-emi">EMI ₹{calcEMI(car.price)}/mo</span>
        </div>
        <div className="carcard-chips">
          <span className="carcard-chip">📅 {car.year}</span>
          <span className="carcard-chip">🛣 {Number(car.kilometersDriven).toLocaleString("en-IN")} km</span>
          <span className="carcard-chip">{car.fuelType === "Electric" ? "⚡" : "⛽"} {car.fuelType}</span>
          <span className="carcard-chip">⚙ {car.transmission}</span>
        </div>
        <p className="carcard-location">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          {car.city || car.location}
        </p>

        {/* Request Inspection button — shown to non-owners */}
        {!isOwner && !adminActions && (
          <button
            type="button"
            className="carcard-insp-btn"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/inspections?car=${car._id}&title=${encodeURIComponent(car.title)}`);
            }}
          >
            🔍 Request Inspection
          </button>
        )}

        {adminActions && <div className="carcard-actions">{adminActions}</div>}
      </div>
    </article>
  );
};

export default memo(CarCard);