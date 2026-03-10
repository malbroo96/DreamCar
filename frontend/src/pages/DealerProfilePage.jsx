import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPublicProfile } from "../services/userService";
import { startConversation } from "../services/messageService";
import { getStoredUser } from "../services/authService";
import "../styles/dealerProfile.css";

const placeholder =
  "https://images.unsplash.com/photo-1549925862-990f9f1d0c9f?auto=format&fit=crop&w=900&q=80";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const DealerProfilePage = () => {
  const { id } = useParams(); // dealer's googleId
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [dealer, setDealer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatLoading, setChatLoading] = useState(null); // carId being chatted
  const [chatError, setChatError] = useState("");
  const [activeTab, setActiveTab] = useState("listings");

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getPublicProfile(id);
        setDealer(data);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load dealer profile",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  const handleContactAboutCar = async (car) => {
    try {
      setChatError("");
      setChatLoading(car._id);
      const thread = await startConversation({
        carId: car._id,
        text: `Hi, I am interested in your listing: ${car.title}`,
      });
      navigate(`/messages?thread=${thread._id}`);
    } catch (err) {
      setChatError(
        err.response?.data?.message || "Failed to start conversation",
      );
    } finally {
      setChatLoading(null);
    }
  };

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="dealer-page">
        <div className="dealer-skeleton">
          <div className="skel skel-avatar" />
          <div className="skel skel-line skel-lg" />
          <div className="skel skel-line skel-md" />
          <div className="skel skel-line skel-sm" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dealer-page">
        <div className="dealer-error">
          <div className="dealer-error-icon">😕</div>
          <h2>Profile not found</h2>
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const memberYear = dealer.memberSince
    ? new Date(dealer.memberSince).getFullYear()
    : new Date().getFullYear();

  const rcVerifiedCount = dealer.listings.filter((c) => c.rcVerified).length;

  return (
    <div className="dealer-page">
      {/* ══════════════════════════════════════════
          HERO CARD
      ══════════════════════════════════════════ */}
      <div className="dealer-hero-card">
        {/* Cover */}
        <div className="dealer-cover">
          <div className="dealer-cover-pattern" />
        </div>

        <div className="dealer-hero-body">
          {/* Avatar */}
          <div className="dealer-avatar-wrap">
            <div className="dealer-avatar">
              {dealer.picture ? (
                <img
                  src={dealer.picture || placeholder}
                  alt={dealer.name}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = placeholder;
                  }}
                />
              ) : (
                <span>{getInitials(dealer.name)}</span>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="dealer-hero-info">
            <h1 className="dealer-name">{dealer.name}</h1>
            {dealer.username && (
              <p className="dealer-username">@{dealer.username}</p>
            )}
            {dealer.bio && <p className="dealer-bio">{dealer.bio}</p>}
            <div className="dealer-meta-row">
              {dealer.location && (
                <span className="dealer-meta-chip">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {dealer.location}
                </span>
              )}
              <span className="dealer-meta-chip">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Member since {memberYear}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="dealer-hero-actions">
            {isOwnProfile ? (
              <Link to="/profile" className="btn btn-secondary">
                ✏ Edit My Profile
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (dealer.listings.length > 0) {
                    handleContactAboutCar(dealer.listings[0]);
                  } else {
                    navigate("/messages");
                  }
                }}
              >
                💬 Message Dealer
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="dealer-stats-bar">
          <div className="dealer-stat">
            <span className="dealer-stat-value">{dealer.totalListings}</span>
            <span className="dealer-stat-label">Active Listings</span>
          </div>
          <div className="dealer-stat-divider" />
          <div className="dealer-stat">
            <span className="dealer-stat-value">{rcVerifiedCount}</span>
            <span className="dealer-stat-label">RC Verified</span>
          </div>
          <div className="dealer-stat-divider" />
          <div className="dealer-stat">
            <div className="dealer-stat-stars">★★★★☆</div>
            <span className="dealer-stat-label">Dealer Rating</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TABS
      ══════════════════════════════════════════ */}
      <div className="dealer-tabs">
        <button
          className={`dealer-tab ${activeTab === "listings" ? "dealer-tab--active" : ""}`}
          onClick={() => setActiveTab("listings")}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Listings
          <span className="dealer-tab-badge">{dealer.totalListings}</span>
        </button>
        <button
          className={`dealer-tab ${activeTab === "about" ? "dealer-tab--active" : ""}`}
          onClick={() => setActiveTab("about")}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          About
        </button>
      </div>

      {/* ══════════════════════════════════════════
          LISTINGS TAB
      ══════════════════════════════════════════ */}
      {activeTab === "listings" && (
        <div className="dealer-section">
          {chatError && <div className="dealer-chat-error">⚠ {chatError}</div>}

          {dealer.listings.length === 0 ? (
            <div className="dealer-empty">
              <div className="dealer-empty-icon">🚗</div>
              <h3>No active listings</h3>
              <p>This dealer hasn't posted any cars yet.</p>
            </div>
          ) : (
            <div className="dealer-listings-grid">
              {dealer.listings.map((car) => (
                <article key={car._id} className="dealer-car-card card">
                  <Link to={`/cars/${car._id}`} className="dealer-car-img-wrap">
                    <img
                      src={car.images?.[0]?.url || placeholder}
                      alt={car.title}
                      className="dealer-car-img"
                    />
                    {/* RC Verified badge */}
                    {car.rcVerified && (
                      <span className="dealer-rc-badge dealer-rc-badge--verified">
                        ✓ RC Verified
                      </span>
                    )}
                    {car.rcDocument && !car.rcVerified && (
                      <span className="dealer-rc-badge dealer-rc-badge--uploaded">
                        📄 RC Uploaded
                      </span>
                    )}
                  </Link>

                  <div className="dealer-car-body">
                    <Link to={`/cars/${car._id}`}>
                      <h3 className="dealer-car-title">{car.title}</h3>
                    </Link>
                    <p className="dealer-car-price">
                      INR {Number(car.price).toLocaleString("en-IN")}
                    </p>
                    <div className="dealer-car-meta">
                      <span>{car.year}</span>
                      <span>·</span>
                      <span>{car.fuelType}</span>
                      <span>·</span>
                      <span>
                        {Number(car.kilometersDriven).toLocaleString("en-IN")}{" "}
                        km
                      </span>
                    </div>
                    <p className="dealer-car-location">
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {car.location}
                    </p>

                    <div className="dealer-car-actions">
                      <Link
                        to={`/cars/${car._id}`}
                        className="btn btn-secondary btn--sm"
                      >
                        View Details
                      </Link>
                      {!isOwnProfile && (
                        <button
                          type="button"
                          className="btn btn-primary btn--sm"
                          onClick={() => handleContactAboutCar(car)}
                          disabled={chatLoading === car._id}
                        >
                          {chatLoading === car._id ? "..." : "💬 Contact"}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          ABOUT TAB
      ══════════════════════════════════════════ */}
      {activeTab === "about" && (
        <div className="dealer-section">
          <div className="dealer-about-card card">
            <h3 className="dealer-about-title">About this Dealer</h3>

            <div className="dealer-about-grid">
              <div className="dealer-about-item">
                <span className="dealer-about-label">Full Name</span>
                <span className="dealer-about-value">{dealer.name}</span>
              </div>
              {dealer.username && (
                <div className="dealer-about-item">
                  <span className="dealer-about-label">Username</span>
                  <span className="dealer-about-value">@{dealer.username}</span>
                </div>
              )}
              {dealer.location && (
                <div className="dealer-about-item">
                  <span className="dealer-about-label">Location</span>
                  <span className="dealer-about-value">{dealer.location}</span>
                </div>
              )}
              <div className="dealer-about-item">
                <span className="dealer-about-label">Member Since</span>
                <span className="dealer-about-value">
                  {new Date(dealer.memberSince).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                  })}
                </span>
              </div>
              <div className="dealer-about-item">
                <span className="dealer-about-label">Total Listings</span>
                <span className="dealer-about-value">
                  {dealer.totalListings} cars
                </span>
              </div>
              <div className="dealer-about-item">
                <span className="dealer-about-label">RC Verified Listings</span>
                <span className="dealer-about-value">
                  {rcVerifiedCount} cars
                </span>
              </div>
            </div>

            {dealer.bio && (
              <div className="dealer-about-bio">
                <span className="dealer-about-label">Bio</span>
                <p>{dealer.bio}</p>
              </div>
            )}

            {!isOwnProfile && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: "1.25rem" }}
                onClick={() => {
                  if (dealer.listings.length > 0) {
                    handleContactAboutCar(dealer.listings[0]);
                  } else {
                    navigate("/messages");
                  }
                }}
              >
                💬 Message Dealer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DealerProfilePage;
