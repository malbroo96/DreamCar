import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  const [selectedImage, setSelectedImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleStartChat = async () => {
    try {
      setChatError("");
      setChatLoading(true);
      const thread = await startConversation({
        carId: car._id,
        text: `Hi, I am interested in your listing: ${car.title}`,
      });
      navigate(`/messages?thread=${thread._id}`);
    } catch (err) {
      setChatError(err.response?.data?.message || "Failed to start chat");
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <p>Loading car details...</p>;
  if (error) return <p style={{ color: "#c63030" }}>{error}</p>;
  if (!car) return <p>Car not found.</p>;

  const images = car.images?.length ? car.images : [{ url: fallback }];
  const isOwner = car.ownerId && car.ownerId === user?.id;

  return (
    <section>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: "1.5rem" }}>

        {/* ── Image gallery ── */}
        <div>
          <div className="card" style={{ overflow: "hidden", position: "relative" }}>
            <img
              src={images[selectedImage]?.url || fallback}
              alt={car.title}
              style={{ width: "100%", height: 280, objectFit: "cover", display: "block" }}
            />
            {/* RC Verified badge on main image */}
            {car.rcVerified && (
              <span style={{
                position: "absolute", top: 12, left: 12,
                background: "linear-gradient(135deg,#177245,#22c55e)",
                color: "#fff", fontSize: "0.75rem", fontWeight: 700,
                padding: "0.3rem 0.7rem", borderRadius: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}>
                ✓ RC Verified
              </span>
            )}
            {car.rcDocument?.publicId && !car.rcVerified && (
              <span style={{
                position: "absolute", top: 12, left: 12,
                background: "rgba(11,110,243,0.92)",
                color: "#fff", fontSize: "0.75rem", fontWeight: 700,
                padding: "0.3rem 0.7rem", borderRadius: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}>
                📄 RC Uploaded
              </span>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              {images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImage(idx)}
                  style={{
                    padding: 0, border: "none", cursor: "pointer",
                    borderRadius: 8, overflow: "hidden",
                    outline: selectedImage === idx ? "2.5px solid #0b6ef3" : "2px solid transparent",
                  }}
                >
                  <img
                    src={img.url}
                    alt={`View ${idx + 1}`}
                    style={{ width: 60, height: 46, objectFit: "cover", display: "block" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Car details ── */}
        <div>
          <h1 style={{ marginTop: 0, fontSize: "1.4rem" }}>{car.title}</h1>
          <h2 style={{ marginTop: 0, color: "#0b6ef3", fontSize: "1.5rem" }}>
            INR {Number(car.price).toLocaleString("en-IN")}
          </h2>

          {/* Specs grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "0.6rem", marginBottom: "1rem",
          }}>
            {[
              ["Brand", car.brand],
              ["Model", car.model],
              ["Year", car.year],
              ["Fuel Type", car.fuelType],
              ["Transmission", car.transmission],
              ["KM Driven", `${Number(car.kilometersDriven).toLocaleString("en-IN")} km`],
              ["Location", car.location],
            ].map(([label, value]) => (
              <div key={label} className="card" style={{ padding: "0.6rem 0.8rem" }}>
                <div style={{ fontSize: "0.72rem", color: "#7a96b4", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.15rem" }}>
                  {label}
                </div>
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0c1f36" }}>{value}</div>
              </div>
            ))}
          </div>

          <p style={{ color: "#2a3f58", lineHeight: 1.6, fontSize: "0.9rem" }}>{car.description}</p>

          {car.rcDetails ? (
            <div className="card" style={{ padding: "0.9rem", marginBottom: "0.9rem" }}>
              <p style={{ margin: "0 0 0.45rem", fontWeight: 700 }}>RC Confirmed Details</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.45rem" }}>
                {car.rcDetails.registrationNumber ? <p style={{ margin: 0 }}>Reg No: {car.rcDetails.registrationNumber}</p> : null}
                {car.rcDetails.ownerName ? <p style={{ margin: 0 }}>Owner: {car.rcDetails.ownerName}</p> : null}
                {car.rcDetails.manufacturer ? <p style={{ margin: 0 }}>Manufacturer: {car.rcDetails.manufacturer}</p> : null}
                {car.rcDetails.vehicleModel ? <p style={{ margin: 0 }}>Model: {car.rcDetails.vehicleModel}</p> : null}
                {car.rcDetails.fuelType ? <p style={{ margin: 0 }}>Fuel: {car.rcDetails.fuelType}</p> : null}
                {car.rcDetails.manufacturingYear ? <p style={{ margin: 0 }}>Mfg Year: {car.rcDetails.manufacturingYear}</p> : null}
                {car.rcDetails.registrationDate ? <p style={{ margin: 0 }}>Reg Date: {car.rcDetails.registrationDate}</p> : null}
                {car.rcDetails.rtoOffice ? <p style={{ margin: 0 }}>RTO: {car.rcDetails.rtoOffice}</p> : null}
                {car.rcDetails.engineNumber ? <p style={{ margin: 0 }}>Engine: {car.rcDetails.engineNumber}</p> : null}
                {car.rcDetails.chassisNumber ? <p style={{ margin: 0 }}>Chassis: {car.rcDetails.chassisNumber}</p> : null}
                {car.rcDetails.vehicleColor ? <p style={{ margin: 0 }}>Color: {car.rcDetails.vehicleColor}</p> : null}
                {car.rcDetails.seatingCapacity ? <p style={{ margin: 0 }}>Seats: {car.rcDetails.seatingCapacity}</p> : null}
              </div>
            </div>
          ) : null}

          <p style={{ color: "#7a96b4", fontSize: "0.82rem" }}>
            Posted on {new Date(car.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          {/* ── Dealer info card ── */}
          <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 0.35rem", fontSize: "0.75rem", fontWeight: 600, color: "#7a96b4", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Posted by
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <p style={{ margin: "0 0 0.15rem", fontWeight: 700, color: "#0c1f36", fontSize: "0.95rem" }}>
                  {car.ownerName || "Dealer"}
                </p>
                {car.ownerEmail && (
                  <p style={{ margin: 0, color: "#7a96b4", fontSize: "0.82rem" }}>{car.ownerEmail}</p>
                )}
              </div>
              {car.ownerId && (
                <Link
                  to={`/dealer/${car.ownerId}`}
                  className="btn btn-secondary"
                  style={{ fontSize: "0.82rem", padding: "0.45rem 0.85rem", whiteSpace: "nowrap" }}
                >
                  View Profile →
                </Link>
              )}
            </div>
          </div>

          {/* ── Actions ── */}
          {chatError && <p style={{ color: "#c63030", fontSize: "0.88rem" }}>{chatError}</p>}

          {!isOwner && car.ownerId && (
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStartChat}
                disabled={chatLoading}
                style={{ flex: 1 }}
              >
                {chatLoading ? "Starting chat..." : "💬 Message Seller"}
              </button>
              <Link
                to={`/dealer/${car.ownerId}`}
                className="btn btn-secondary"
                style={{ flex: 1, textAlign: "center" }}
              >
                👤 View Dealer Profile
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CarDetailPage;
