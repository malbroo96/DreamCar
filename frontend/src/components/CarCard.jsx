import { Link } from "react-router-dom";

const placeholder =
  "https://images.unsplash.com/photo-1549925862-990f9f1d0c9f?auto=format&fit=crop&w=900&q=80";

const CarCard = ({ car, adminActions }) => {
  return (
    <article className="card" style={{ overflow: "hidden" }}>
      <Link to={`/cars/${car._id}`} style={{ position: "relative", display: "block" }}>
        <img
          src={car.images?.[0]?.url || placeholder}
          alt={car.title}
          style={{ height: 165, width: "100%", objectFit: "cover" }}
        />
        {/* RC Verified badge — shown on the image */}
        {car.rcVerified && (
          <span style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "linear-gradient(135deg, #177245, #22c55e)",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.25rem 0.55rem",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            letterSpacing: "0.02em",
          }}>
            ✓ RC Verified
          </span>
        )}
        {/* RC Uploaded (not yet verified) badge */}
        {car.rcDocument?.publicId && !car.rcVerified && (
          <span style={{
            position: "absolute",
            top: 8,
            left: 8,
            background: "rgba(11,110,243,0.9)",
            color: "#fff",
            fontSize: "0.7rem",
            fontWeight: 700,
            padding: "0.25rem 0.55rem",
            borderRadius: 20,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.25rem",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}>
            📄 RC Uploaded
          </span>
        )}
      </Link>
      <div style={{ padding: "0.85rem" }}>
        <Link to={`/cars/${car._id}`}>
          <h3 style={{ margin: "0 0 0.5rem" }}>{car.title}</h3>
        </Link>
        <p style={{ margin: "0 0 0.35rem", fontWeight: 700 }}>
          INR {Number(car.price).toLocaleString("en-IN")}
        </p>
        <p style={{ margin: "0 0 0.35rem", color: "#4c6785" }}>{car.location}</p>
        <p style={{ margin: 0, color: "#4c6785" }}>{car.year}</p>
        {adminActions}
      </div>
    </article>
  );
};

export default CarCard;
