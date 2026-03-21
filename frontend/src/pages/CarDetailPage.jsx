import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCarById, getCars } from "../services/carService";
import { getStoredUser } from "../services/authService";
import { startConversation } from "../services/messageService";
import { createInspectionOrder, verifyInspectionPayment } from "../services/paymentService";
import loadRazorpayCheckout from "../utils/loadRazorpayCheckout";
import CarCard from "../components/CarCard";
import "./CarDetailPage.css";

const fallback =
  "https://images.unsplash.com/photo-1584345604476-8ec5f452d1f2?auto=format&fit=crop&w=1200&q=80";

/* ── EMI Calculator ── */
const calcEMI = (principal, rate, months) => {
  const r = rate / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

/* ── Health Check Config ── */
const HEALTH_FIELDS = [
  { key: "engine",       label: "Engine",       icon: "🔧" },
  { key: "transmission", label: "Transmission", icon: "⚙️" },
  { key: "brakes",       label: "Brakes",       icon: "🛑" },
  { key: "tyres",        label: "Tyres",        icon: "🔄" },
  { key: "ac",           label: "AC & Climate", icon: "❄️" },
  { key: "electricals",  label: "Electricals",  icon: "⚡" },
  { key: "suspension",   label: "Suspension",   icon: "🔩" },
  { key: "body",         label: "Body & Paint", icon: "🎨" },
];

const scoreLabel = (s) => s >= 4.5 ? "Excellent" : s >= 3.5 ? "Good" : s >= 2.5 ? "Average" : "Poor";
const scoreColor = (s) => s >= 4 ? "#16a34a" : s >= 3 ? "#d97706" : "#dc2626";

const overallHealth = (hc) => {
  if (!hc) return null;
  const vals = HEALTH_FIELDS.map((f) => hc[f.key]).filter((v) => v !== null && v !== undefined && v > 0);
  if (!vals.length) return null;
  return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
};

const CarDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUser();

  const [car, setCar]                   = useState(null);
  const [similarCars, setSimilarCars]   = useState([]);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [chatError, setChatError]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [rcOpen, setRcOpen]             = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({ preferredDate: "", preferredTime: "Morning", location: "", notes: "" });
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionSuccess, setInspectionSuccess] = useState(false);
  const [inspectionError, setInspectionError]     = useState("");
  const [inspectionAmount, setInspectionAmount]   = useState(null);

  /* EMI state */
  const [emiDownPct, setEmiDownPct]     = useState(20);
  const [emiRate, setEmiRate]           = useState(8.5);
  const [emiMonths, setEmiMonths]       = useState(60);

  useEffect(() => {
    const fetchCar = async () => {
      try {
        setLoading(true);
        const data = await getCarById(id);
        setCar(data);
        /* Fetch similar cars by same brand */
        try {
          const similar = await getCars({ brand: data.brand, status: "approved" });
          setSimilarCars(similar.filter((c) => c._id !== id).slice(0, 4));
        } catch { /* silent */ }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load car");
      } finally {
        setLoading(false);
      }
    };
    fetchCar();
  }, [id]);

  useEffect(() => {
    if (!car) return;
    if (searchParams.get("requestInspection") !== "1") return;

    setInspectionOpen(true);
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("requestInspection");
      return next;
    }, { replace: true });
  }, [car, searchParams, setSearchParams]);

  /* Keyboard nav for lightbox */
  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setSelectedImage((i) => (i + 1) % (car?.images?.length || 1));
      if (e.key === "ArrowLeft")  setSelectedImage((i) => (i - 1 + (car?.images?.length || 1)) % (car?.images?.length || 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen, car]);

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

  const handleInspectionSubmit = async (e) => {
    e.preventDefault();
    try {
      setInspectionLoading(true);
      setInspectionError("");
      const Razorpay = await loadRazorpayCheckout();
      const orderPayload = await createInspectionOrder({
        carId: car._id,
        ...inspectionForm,
        location: inspectionForm.location || car.location,
      });
      setInspectionAmount(orderPayload.order.amount);

      await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: orderPayload.razorpayKeyId,
          amount: orderPayload.order.amount,
          currency: orderPayload.order.currency,
          name: "DreamCar",
          description: `Inspection booking for ${car.title}`,
          order_id: orderPayload.order.id,
          prefill: {
            name: user?.name || "",
            email: user?.email || "",
            contact: user?.phone || "",
          },
          notes: {
            bookingId: orderPayload.booking._id,
            carId: car._id,
          },
          theme: { color: "#0b6ef3" },
          modal: {
            ondismiss: () => reject(new Error("Payment checkout was closed before completion")),
          },
          handler: async (response) => {
            try {
              await verifyInspectionPayment(response);
              resolve(response);
            } catch (error) {
              reject(error);
            }
          },
        });

        checkout.on("payment.failed", (response) => {
          reject(new Error(response?.error?.description || "Payment failed"));
        });

        checkout.open();
      });

      setInspectionSuccess(true);
      setInspectionOpen(false);
      setInspectionForm({ preferredDate: "", preferredTime: "Morning", location: "", notes: "" });
    } catch (err) {
      setInspectionError(err.response?.data?.message || err.message || "Failed to start payment");
    } finally {
      setInspectionLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="cdp-skeleton">
        <div className="skel skel-img-lg" />
        <div className="cdp-skeleton-body">
          <div className="skel skel-line skel-xl" />
          <div className="skel skel-line skel-lg" />
          <div className="skel skel-line skel-md" />
        </div>
      </div>
    );
  }
  if (error) return <div className="cdp-error"><p>⚠ {error}</p><button className="btn btn-secondary" onClick={() => navigate(-1)}>← Go Back</button></div>;
  if (!car)  return <div className="cdp-error"><p>Car not found.</p></div>;

  const images   = car.images?.length ? car.images : [{ url: fallback }];
  const isOwner  = car.ownerId && car.ownerId === user?.id;
  const health   = overallHealth(car.healthCheck);

  const loanAmount    = car.price * (1 - emiDownPct / 100);
  const monthlyEMI    = calcEMI(loanAmount, emiRate, emiMonths);
  const totalPayable  = monthlyEMI * emiMonths + car.price * (emiDownPct / 100);
  const totalInterest = totalPayable - car.price;

  return (
    <div className="cdp">

      {/* ════════════════════════════════════════
          LIGHTBOX
      ════════════════════════════════════════ */}
      {lightboxOpen && (
        <div className="cdp-lightbox" onClick={() => setLightboxOpen(false)}>
          <button className="cdp-lightbox-close" onClick={() => setLightboxOpen(false)}>✕</button>
          <button className="cdp-lightbox-arrow cdp-lightbox-arrow--left"
            onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i - 1 + images.length) % images.length); }}>
            ‹
          </button>
          <img
            src={images[selectedImage]?.url || fallback}
            alt={car.title}
            className="cdp-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="cdp-lightbox-arrow cdp-lightbox-arrow--right"
            onClick={(e) => { e.stopPropagation(); setSelectedImage((i) => (i + 1) % images.length); }}>
            ›
          </button>
          <div className="cdp-lightbox-counter">{selectedImage + 1} / {images.length}</div>
        </div>
      )}

      {/* ════════════════════════════════════════
          BREADCRUMB
      ════════════════════════════════════════ */}
      <nav className="cdp-breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/">{car.brand}</Link>
        <span>›</span>
        <span>{car.title}</span>
      </nav>

      {/* ════════════════════════════════════════
          MAIN LAYOUT
      ════════════════════════════════════════ */}
      <div className="cdp-layout">

        {/* ── LEFT: Images + Details ── */}
        <div className="cdp-left">

          {/* Gallery */}
          <div className="cdp-gallery card">
            <div className="cdp-gallery-main" onClick={() => setLightboxOpen(true)}>
              <img
                src={images[selectedImage]?.url || fallback}
                alt={car.title}
                className="cdp-gallery-main-img"
              />
              <div className="cdp-gallery-badges">
                {car.featured  && <span className="cdp-badge cdp-badge--featured">⭐ Featured</span>}
                {car.rcVerified && <span className="cdp-badge cdp-badge--verified">✓ RC Verified</span>}
                {car.rcDocument?.publicId && !car.rcVerified && <span className="cdp-badge cdp-badge--uploaded">📄 RC Uploaded</span>}
              </div>
              {health && (
                <div className="cdp-gallery-health" style={{ background: scoreColor(parseFloat(health)) }}>
                  {Math.round((parseFloat(health) / 5) * 100)}% Health
                </div>
              )}
              <div className="cdp-gallery-expand">🔍 Click to expand</div>
            </div>

            {images.length > 1 && (
              <div className="cdp-gallery-thumbs">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`cdp-thumb ${selectedImage === idx ? "cdp-thumb--active" : ""}`}
                    onClick={() => setSelectedImage(idx)}
                  >
                    <img src={img.url} alt={`View ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Health Check Section ── */}
          {car.healthCheck && Object.values(car.healthCheck).some((v) => v !== null && v > 0) && (
            <div className="cdp-section card">
              <div className="cdp-section-header">
                <h2 className="cdp-section-title">🔍 Car Health Inspection</h2>
                {health && (
                  <div className="cdp-health-overall" style={{ background: scoreColor(parseFloat(health)) }}>
                    {health}/5 — {scoreLabel(parseFloat(health))}
                  </div>
                )}
              </div>

              {/* Overall score ring */}
              {health && (
                <div className="cdp-health-summary">
                  <div className="cdp-health-ring" style={{ "--pct": `${Math.round((parseFloat(health) / 5) * 100)}` }}>
                    <svg viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#e4ebf3" strokeWidth="8" />
                      <circle
                        cx="40" cy="40" r="32" fill="none"
                        stroke={scoreColor(parseFloat(health))}
                        strokeWidth="8"
                        strokeDasharray={`${Math.round((parseFloat(health) / 5) * 201)} 201`}
                        strokeLinecap="round"
                        transform="rotate(-90 40 40)"
                      />
                    </svg>
                    <div className="cdp-health-ring-text">
                      <span className="cdp-health-ring-score">{Math.round((parseFloat(health) / 5) * 100)}%</span>
                      <span className="cdp-health-ring-label">Overall</span>
                    </div>
                  </div>
                  <div className="cdp-health-legend">
                    <div className="cdp-health-legend-item"><span style={{background:"#16a34a"}} />Excellent (4–5)</div>
                    <div className="cdp-health-legend-item"><span style={{background:"#d97706"}} />Good (3–4)</div>
                    <div className="cdp-health-legend-item"><span style={{background:"#dc2626"}} />Needs Attention (&lt;3)</div>
                  </div>
                </div>
              )}

              {/* Individual bars */}
              <div className="cdp-health-bars">
                {HEALTH_FIELDS.map(({ key, label, icon }) => {
                  const val = car.healthCheck?.[key];
                  if (val === null || val === undefined || val === 0) return null;
                  const pct = (val / 5) * 100;
                  const col = scoreColor(val);
                  return (
                    <div key={key} className="cdp-health-bar-row">
                      <div className="cdp-health-bar-label">
                        <span>{icon} {label}</span>
                        <span className="cdp-health-bar-score" style={{ color: col }}>{val}/5</span>
                      </div>
                      <div className="cdp-health-bar-track">
                        <div
                          className="cdp-health-bar-fill"
                          style={{ width: `${pct}%`, background: col }}
                        />
                      </div>
                      <span className="cdp-health-bar-tag" style={{ color: col }}>{scoreLabel(val)}</span>
                    </div>
                  );
                })}
              </div>

              {car.healthCheck?.inspectedAt && (
                <p className="cdp-health-inspected">
                  Inspected on {new Date(car.healthCheck.inspectedAt).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })}
                  {car.healthCheck.inspectedBy && ` by ${car.healthCheck.inspectedBy}`}
                </p>
              )}
            </div>
          )}

          {/* ── RC Details (collapsible) ── */}
          {car.rcDetails && Object.values(car.rcDetails).some(Boolean) && (
            <div className="cdp-section card">
              <button
                type="button"
                className="cdp-collapsible-btn"
                onClick={() => setRcOpen((v) => !v)}
              >
                <span>📄 RC Confirmed Details</span>
                <span className="cdp-collapsible-arrow">{rcOpen ? "▲" : "▼"}</span>
              </button>
              {rcOpen && (
                <div className="cdp-rc-grid">
                  {[
                    ["Reg Number",      car.rcDetails.registrationNumber],
                    ["Owner Name",      car.rcDetails.ownerName],
                    ["Manufacturer",    car.rcDetails.manufacturer],
                    ["Vehicle Model",   car.rcDetails.vehicleModel],
                    ["Fuel Type",       car.rcDetails.fuelType],
                    ["Mfg Year",        car.rcDetails.manufacturingYear],
                    ["Reg Date",        car.rcDetails.registrationDate],
                    ["RTO Office",      car.rcDetails.rtoOffice],
                    ["Engine No.",      car.rcDetails.engineNumber],
                    ["Chassis No.",     car.rcDetails.chassisNumber],
                    ["Color",           car.rcDetails.vehicleColor],
                    ["Seating",         car.rcDetails.seatingCapacity],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label} className="cdp-rc-item">
                      <span className="cdp-rc-label">{label}</span>
                      <span className="cdp-rc-value">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div className="cdp-section card">
            <h2 className="cdp-section-title">About this Car</h2>
            <p className="cdp-description">{car.description}</p>
            <p className="cdp-posted-date">
              Listed on {new Date(car.createdAt).toLocaleDateString("en-IN", { year:"numeric", month:"long", day:"numeric" })}
            </p>
          </div>

        </div>{/* end cdp-left */}

        {/* ── RIGHT: Price + Specs + EMI + Dealer ── */}
        <div className="cdp-right">

          {/* Price card */}
          <div className="cdp-price-card card">
            <div className="cdp-price-header">
              {car.featured && <span className="cdp-badge cdp-badge--featured" style={{marginBottom:"0.5rem",display:"inline-block"}}>⭐ Featured</span>}
              <h1 className="cdp-title">{car.title}</h1>
              <div className="cdp-price">₹{Number(car.price).toLocaleString("en-IN")}</div>
              <div className="cdp-emi-hint">
                EMI from ₹{Math.round(calcEMI(car.price * 0.8, 8.5, 60)).toLocaleString("en-IN")}/mo
              </div>
            </div>

            {/* Spec chips */}
            <div className="cdp-spec-chips">
              {[
                { label: car.year,         icon: "📅" },
                { label: `${Number(car.kilometersDriven).toLocaleString("en-IN")} km`, icon: "🛣" },
                { label: car.fuelType,     icon: car.fuelType === "Electric" ? "⚡" : "⛽" },
                { label: car.transmission, icon: "⚙️" },
                { label: car.city || car.location, icon: "📍" },
              ].map(({ label, icon }) => (
                <span key={label} className="cdp-spec-chip">
                  {icon} {label}
                </span>
              ))}
            </div>

            {/* Action buttons */}
            {chatError && <p className="cdp-chat-error">⚠ {chatError}</p>}
            {inspectionSuccess && (
              <div className="cdp-inspection-success">
                ✅ Inspection request submitted! Our team will contact you shortly.
              </div>
            )}
            {!isOwner && car.ownerId && (
              <div className="cdp-actions">
                <button
                  type="button"
                  className="btn btn-primary cdp-btn-full"
                  onClick={handleStartChat}
                  disabled={chatLoading}
                >
                  {chatLoading ? "Connecting..." : "💬 Message Seller"}
                </button>
                <button
                  type="button"
                  className="btn cdp-btn-full cdp-btn-inspection"
                  onClick={() => setInspectionOpen(true)}
                  disabled={inspectionSuccess}
                >
                  🔍 Request Inspection
                </button>
                <Link to={`/dealer/${car.ownerId}`} className="btn btn-secondary cdp-btn-full" style={{textAlign:"center"}}>
                  👤 View Dealer Profile
                </Link>
              </div>
            )}
          </div>

          {/* Specs table */}
          <div className="cdp-section card">
            <h2 className="cdp-section-title">Specifications</h2>
            <div className="cdp-specs-table">
              {[
                ["Brand",        car.brand],
                ["Model",        car.model],
                ["Year",         car.year],
                ["Fuel Type",    car.fuelType],
                ["Transmission", car.transmission],
                ["KM Driven",    `${Number(car.kilometersDriven).toLocaleString("en-IN")} km`],
                ["Location",     car.location],
                ...(car.city  ? [["City",  car.city]]  : []),
                ...(car.area  ? [["Area",  car.area]]  : []),
              ].map(([label, value]) => (
                <div key={label} className="cdp-spec-row">
                  <span className="cdp-spec-label">{label}</span>
                  <span className="cdp-spec-value">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* EMI Calculator */}
          <div className="cdp-section card">
            <h2 className="cdp-section-title">🧮 EMI Calculator</h2>
            <div className="cdp-emi">
              <div className="cdp-emi-result">
                <span className="cdp-emi-monthly">₹{Math.round(monthlyEMI).toLocaleString("en-IN")}</span>
                <span className="cdp-emi-monthly-label">per month</span>
              </div>

              <div className="cdp-emi-field">
                <label>Down Payment: {emiDownPct}% (₹{Math.round(car.price * emiDownPct / 100).toLocaleString("en-IN")})</label>
                <input type="range" min="10" max="50" step="5" value={emiDownPct}
                  onChange={(e) => setEmiDownPct(Number(e.target.value))} className="cdp-slider" />
              </div>

              <div className="cdp-emi-field">
                <label>Interest Rate: {emiRate}% p.a.</label>
                <input type="range" min="6" max="18" step="0.5" value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))} className="cdp-slider" />
              </div>

              <div className="cdp-emi-field">
                <label>Tenure: {emiMonths} months ({emiMonths / 12} years)</label>
                <input type="range" min="12" max="84" step="12" value={emiMonths}
                  onChange={(e) => setEmiMonths(Number(e.target.value))} className="cdp-slider" />
              </div>

              <div className="cdp-emi-breakdown">
                <div className="cdp-emi-row">
                  <span>Loan Amount</span>
                  <span>₹{Math.round(loanAmount).toLocaleString("en-IN")}</span>
                </div>
                <div className="cdp-emi-row">
                  <span>Total Interest</span>
                  <span className="cdp-emi-interest">₹{Math.round(totalInterest).toLocaleString("en-IN")}</span>
                </div>
                <div className="cdp-emi-row cdp-emi-row--total">
                  <span>Total Payable</span>
                  <span>₹{Math.round(totalPayable).toLocaleString("en-IN")}</span>
                </div>
              </div>
              <p className="cdp-emi-disclaimer">* Indicative only. Actual EMI may vary by lender.</p>
            </div>
          </div>

          {/* Dealer card */}
          <div className="cdp-section card">
            <h2 className="cdp-section-title">Dealer Information</h2>
            <div className="cdp-dealer">
              <div className="cdp-dealer-avatar">
                {(car.ownerName || "D")[0].toUpperCase()}
              </div>
              <div className="cdp-dealer-info">
                <p className="cdp-dealer-name">{car.ownerName || "Dealer"}</p>
                <p className="cdp-dealer-sub">Verified Seller</p>
              </div>
              {car.ownerId && (
                <Link to={`/dealer/${car.ownerId}`} className="btn btn-secondary" style={{fontSize:"0.8rem",padding:"0.4rem 0.7rem",whiteSpace:"nowrap"}}>
                  View Profile →
                </Link>
              )}
            </div>
          </div>

        </div>{/* end cdp-right */}
      </div>{/* end cdp-layout */}

      {/* ════════════════════════════════════════
          INSPECTION REQUEST MODAL
      ════════════════════════════════════════ */}
      {inspectionOpen && (
        <div className="cdp-lightbox" onClick={() => setInspectionOpen(false)}>
          <div className="cdp-insp-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="cdp-insp-header">
              <div>
                <h2 className="cdp-insp-title">🔍 Request Inspection</h2>
                <p className="cdp-insp-subtitle">{car.title}</p>
              </div>
              <button className="cdp-lightbox-close" style={{ position:"static" }} onClick={() => setInspectionOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleInspectionSubmit} className="cdp-insp-form">
              <div className="field">
                <label>Preferred Date</label>
                <input
                  type="date"
                  value={inspectionForm.preferredDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, preferredDate: e.target.value }))}
                />
              </div>

              <div className="field">
                <label>Preferred Time</label>
                <select
                  value={inspectionForm.preferredTime}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, preferredTime: e.target.value }))}
                >
                  <option value="Morning">Morning (9 AM – 12 PM)</option>
                  <option value="Afternoon">Afternoon (12 PM – 4 PM)</option>
                  <option value="Evening">Evening (4 PM – 7 PM)</option>
                </select>
              </div>

              <div className="field">
                <label>Inspection Location</label>
                <input
                  type="text"
                  value={inspectionForm.location}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder={car.location || "Enter preferred location"}
                />
              </div>

              <div className="field">
                <label>Additional Notes (optional)</label>
                <textarea
                  rows="3"
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Any specific concerns or requirements..."
                />
              </div>

              {inspectionError && (
                <div className="cdp-chat-error">⚠ {inspectionError}</div>
              )}

              <div className="cdp-insp-info">
                <span>ℹ</span>
                <span>Payment is mandatory before booking confirmation. DreamCar validates the signature on the backend and treats the webhook as the source of truth.</span>
              </div>

              <div className="cdp-insp-info">
                <span>â‚¹</span>
                <span>
                  Inspection fee: {inspectionAmount ? `â‚¹${Number(inspectionAmount / 100).toLocaleString("en-IN")}` : "Calculated securely on the backend at checkout"}
                </span>
              </div>

              <div style={{ display:"flex", gap:"0.75rem", marginTop:"1rem" }}>
                <button type="button" className="btn btn-secondary" style={{ flex:1 }} onClick={() => setInspectionOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex:1 }} disabled={inspectionLoading}>
                  {inspectionLoading ? "Opening Payment..." : "Pay & Confirm Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════
          SIMILAR CARS
      ════════════════════════════════════════ */}
      {similarCars.length > 0 && (
        <div className="cdp-similar">
          <h2 className="cdp-similar-title">Similar {car.brand} Cars</h2>
          <div className="cdp-similar-grid">
            {similarCars.map((c) => (
              <CarCard key={c._id} car={c} />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default CarDetailPage;
