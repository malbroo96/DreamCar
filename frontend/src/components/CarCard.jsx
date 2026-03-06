import { Link } from "react-router-dom";

const placeholder =
  "https://images.unsplash.com/photo-1549925862-990f9f1d0c9f?auto=format&fit=crop&w=900&q=80";

const CarCard = ({ car, adminActions }) => {
  return (
    <article className="card" style={{ overflow: "hidden" }}>
      <Link to={`/cars/${car._id}`}>
        <img
          src={car.images?.[0]?.url || placeholder}
          alt={car.title}
          style={{ height: 165, width: "100%", objectFit: "cover" }}
        />
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
