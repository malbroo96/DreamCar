import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarCard from "../components/CarCard";
import CarFilters from "../components/CarFilters";
import Spinner from "../components/Spinner";
import useCars from "../hooks/useCars";
import useDebounce from "../hooks/useDebounce";
import { getStoredUser } from "../services/authService";
import { getCarStats } from "../services/carService";
import { startConversation } from "../services/messageService";
import "./HomePage.css";

const defaultFilters = {
  brand: "", model: "", fuelType: "", year: "",
  minPrice: "", maxPrice: "", minKm: "", maxKm: "",
  transmission: "", city: "", area: "", featured: "", search: "",
};

const FOOTER_LINK_GROUPS = {
  company: [
    { label: "Buyer Protection Policy", slug: "buyer-protection-policy" },
    { label: "Seller Verification Policy", slug: "seller-verification-policy" },
    { label: "RC & Ownership Check Policy", slug: "rc-ownership-check-policy" },
    { label: "Safe Payments Policy", slug: "safe-payments-policy" },
    { label: "Privacy & Data Protection", slug: "privacy-data-protection" },
    { label: "Fair Listing Terms", slug: "fair-listing-terms" },
  ],
  discover: [
    { label: "Buy a Used Car", slug: "buy-a-used-car" },
    { label: "Sell Your Car", slug: "sell-your-car" },
    { label: "Car EMI Calculator", slug: "car-emi-calculator" },
    { label: "RC Transfer Guide", slug: "rc-transfer-guide" },
    { label: "Car Insurance Tips", slug: "car-insurance-tips" },
    { label: "Check Vehicle Details", slug: "check-vehicle-details" },
  ],
  support: [
    { label: "FAQs", slug: "faqs" },
    { label: "Contact Us", slug: "contact-us" },
    { label: "Report an Issue", slug: "report-an-issue" },
    { label: "Safety Tips", slug: "safety-tips" },
    { label: "Dealer Guidelines", slug: "dealer-guidelines" },
    { label: "Feedback", slug: "feedback" },
  ],
};

const getPrimaryLocation = (value = "") =>
  String(value)
    .split(",")[0]
    .trim()
    .toLowerCase();

const HomePage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(defaultFilters);
  const [heroSearch, setHeroSearch] = useState("");
  const [stats, setStats] = useState({
    carsListed: 0,
    usersPosted: 0,
    citiesCovered: 0,
    verifiedListings: 0,
  });
  const user = useMemo(() => getStoredUser(), []);

  const displayName = useMemo(() => {
    if (!user) return "";
    return user.name?.trim() || user.email?.split("@")[0] || "User";
  }, [user]);

  const queryParams = useMemo(() => {
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    return active;
  }, [filters]);

  /* Debounce text inputs (search, city, area, model) to avoid API call every keystroke */
  const debouncedParams = useDebounce(queryParams, 400);

  const { cars, loading, error, hasMore, total, loadingMore, loadMore } = useCars(debouncedParams);

  /* Infinite scroll sentinel */
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  useEffect(() => {
    let active = true;

    const loadStats = async () => {
      try {
        const data = await getCarStats();
        if (active) setStats(data);
      } catch {
        // Keep the default zero values if stats fail to load.
      }
    };

    loadStats();

    return () => {
      active = false;
    };
  }, []);

  const [chatError, setChatError] = useState("");
  const [emiOpen, setEmiOpen]     = useState(false);
  const [emiPrice, setEmiPrice]   = useState(500000);
  const [emiDown, setEmiDown]     = useState(20);
  const [emiRate, setEmiRate]     = useState(8.5);
  const [emiMonths, setEmiMonths] = useState(60);

  const userCity = useMemo(() => getPrimaryLocation(user?.location), [user]);
  const sortCarsByNearby = (list) => {
    if (!userCity || filters.city) return list;

    return [...list].sort((a, b) => {
      const aNearby = getPrimaryLocation(a.city || a.location) === userCity ? 1 : 0;
      const bNearby = getPrimaryLocation(b.city || b.location) === userCity ? 1 : 0;
      return bNearby - aNearby;
    });
  };

  const featuredCars = useMemo(
    () => sortCarsByNearby(cars.filter((c) => c.featured)),
    [cars, userCity, filters.city]
  );
  const regularCars  = useMemo(
    () => sortCarsByNearby(cars.filter((c) => !c.featured)),
    [cars, userCity, filters.city]
  );
  const heroStats = useMemo(() => ([
    { value: stats.carsListed.toLocaleString("en-IN"), label: "Cars Listed" },
    { value: stats.usersPosted.toLocaleString("en-IN"), label: "Users Posted" },
    { value: stats.citiesCovered.toLocaleString("en-IN"), label: "Cities Covered" },
    { value: stats.verifiedListings.toLocaleString("en-IN"), label: "Verified Listings" },
  ]), [stats]);

  const scrollToListings = () => {
    document.getElementById("car-listings")?.scrollIntoView({ behavior: "smooth" });
  };

  const browseBrandCars = (brand) => {
    setHeroSearch("");
    setFilters({ ...defaultFilters, brand });
    scrollToListings();
  };

  const browseAllCars = () => {
    setHeroSearch("");
    setFilters(defaultFilters);
    scrollToListings();
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      setFilters((prev) => ({ ...prev, search: heroSearch.trim() }));
      document.getElementById("car-listings")?.scrollIntoView({ behavior: "smooth" });
    }
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

  const openFooterPage = (slug) => {
    navigate(`/info/${slug}`);
  };

  return (
    <div className="homepage">

      {/* ═══════════════════════════════════════
          HERO
      ═══════════════════════════════════════ */}
      <section className="hero">
        <div className="hero-content">
          {displayName && (
            <p className="hero-greeting">👋 Welcome back, {displayName.split(" ")[0]}!</p>
          )}
          <h1 className="hero-title">
            Find Your <span className="hero-title-accent">Dream Car</span>
          </h1>
          <p className="hero-subtitle">
            Browse thousands of verified pre-owned cars across India
          </p>

          {/* Search bar */}
          <form className="hero-search-form" onSubmit={handleHeroSearch}>
            <div className="hero-search-wrap">
              <svg className="hero-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                className="hero-search-input"
                value={heroSearch}
                onChange={(e) => setHeroSearch(e.target.value)}
                placeholder="Search by brand, model, or city..."
              />
              <button type="submit" className="hero-search-btn">Search</button>
            </div>
          </form>

          {/* Quick links */}
          <div className="hero-quick-links">
            {["Maruti Suzuki", "Hyundai", "Tata", "Honda", "Toyota"].map((brand) => (
              <button
                key={brand}
                type="button"
                className="hero-quick-chip"
                onClick={() => browseBrandCars(brand)}
              >
                {brand}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="hero-stats">
          {heroStats.map((s) => (
            <div key={s.label} className="hero-stat">
              <span className="hero-stat-value">{s.value}</span>
              <span className="hero-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FILTERS + LISTINGS
      ═══════════════════════════════════════ */}
      <section id="car-listings" className="listings-section">

        {/* Section header */}
        <div className="listings-header">
          <div>
            <h2 className="listings-title">
              {Object.values(queryParams).some(Boolean) ? "Search Results" : "All Cars"}
            </h2>
            <p className="listings-count">
              {loading ? "Loading..." : `${total} car${total !== 1 ? "s" : ""} found`}
            </p>
          </div>
          <div className="listings-header-right">
            {Object.values(queryParams).some(Boolean) && (
              <button className="btn btn-secondary" onClick={() => setFilters(defaultFilters)}>
                ✕ Clear all filters
              </button>
            )}
          </div>
        </div>

        <CarFilters filters={filters} onChange={handleFilterChange} onReset={() => setFilters(defaultFilters)} />

        {error    && <p className="listings-error">⚠ {error}</p>}
        {chatError && <p className="listings-error">⚠ {chatError}</p>}

        {/* Featured cars */}
        {!loading && featuredCars.length > 0 && (
          <div className="listings-featured-section">
            <div className="listings-section-label">
              <span className="listings-section-badge listings-section-badge--featured">⭐ Featured</span>
              <span className="listings-section-count">{featuredCars.length} listings</span>
            </div>
            <div className="car-grid">
              {featuredCars.map((car) => (
                <CarCard
                  key={car._id}
                  car={car}
                  adminActions={
                    car.ownerId && car.ownerId !== user?.id ? (
                      <button type="button" className="btn btn-secondary" onClick={() => handleStartChat(car)}>
                        💬 Message Seller
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular cars */}
        {!loading && regularCars.length > 0 && (
          <div>
            {featuredCars.length > 0 && (
              <div className="listings-section-label">
                <span className="listings-section-badge">All Listings</span>
                <span className="listings-section-count">{regularCars.length} listings</span>
              </div>
            )}
            <div className="car-grid">
              {regularCars.map((car) => (
                <CarCard
                  key={car._id}
                  car={car}
                  adminActions={
                    car.ownerId && car.ownerId !== user?.id ? (
                      <button type="button" className="btn btn-secondary" onClick={() => handleStartChat(car)}>
                        💬 Message Seller
                      </button>
                    ) : null
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="car-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="carcard-skeleton">
                <div className="skel skel-img" />
                <div className="carcard-skeleton-body">
                  <div className="skel skel-line skel-lg" />
                  <div className="skel skel-line skel-md" />
                  <div className="skel skel-line skel-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel + load more spinner */}
        {!loading && hasMore && (
          <>
            <div ref={sentinelRef} style={{ height: 1 }} />
            {loadingMore && <Spinner size="sm" text="Loading more cars..." />}
          </>
        )}

        {!loading && cars.length === 0 && (
          <div className="listings-empty">
            <div className="listings-empty-icon">🔍</div>
            <h3>No cars found</h3>
            <p>Try adjusting your filters or search terms</p>
            <button className="btn btn-primary" onClick={() => setFilters(defaultFilters)}>
              Clear Filters
            </button>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════
          OUR SERVICES
      ═══════════════════════════════════════ */}
      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Everything You Need</h2>
          <p className="home-section-sub">Buy, sell, and manage your car journey in one place</p>
        </div>
        <div className="services-grid">
          {[
            {
              icon: "🚗",
              title: "Buy a Car",
              desc: "Browse thousands of RC-verified pre-owned cars across India with full inspection reports.",
              color: "#0b6ef3",
              cta: "Browse Cars",
              action: browseAllCars,
            },
            {
              icon: "💰",
              title: "Sell Your Car",
              desc: "List your car in minutes. Upload RC, add photos, and reach lakhs of buyers instantly.",
              color: "#16a34a",
              cta: "Sell Now",
              action: () => navigate("/add-car"),
            },
            {
              icon: "🧮",
              title: "EMI Calculator",
              desc: "Calculate monthly instalments at competitive interest rates. Plan your purchase smartly.",
              color: "#7c3aed",
              cta: "Try Calculator",
              action: () => {
                setEmiOpen(true);
                setTimeout(() => document.getElementById("emi-modal")?.scrollIntoView({ behavior: "smooth" }), 100);
              },
            },
            {
              icon: "🔍",
              title: "Car Health Check",
              desc: "Every listing includes a detailed health inspection — engine, brakes, AC, tyres and more.",
              color: "#d97706",
              cta: "View Inspected Cars",
              action: () => {
                setFilters((prev) => ({ ...prev, search: "verified" }));
                document.getElementById("car-listings")?.scrollIntoView({ behavior: "smooth" });
              },
            },
            {
              icon: "💬",
              title: "Chat with Seller",
              desc: "Message dealers directly in real-time. No middlemen. Get answers instantly.",
              color: "#0891b2",
              cta: "Open Messages",
              action: () => navigate("/messages"),
            },
            {
              icon: "🤖",
              title: "AI Assistant",
              desc: "DreamBot is available 24/7 to answer your questions about any listing or platform feature.",
              color: "#db2777",
              cta: "Ask DreamBot ↘",
              action: () => {
                /* Open chatbot widget by dispatching a custom event */
                window.dispatchEvent(new CustomEvent("dreamcar:open-chatbot"));
              },
            },
          ].map((s) => (
            <div key={s.title} className="service-card card">
              <div className="service-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
              <h3 className="service-title">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
              <button
                type="button"
                className="service-cta"
                style={{ color: s.color, borderColor: `${s.color}40` }}
                onClick={s.action}
              >
                {s.cta} →
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CUSTOMER REVIEWS
      ═══════════════════════════════════════ */}
      <section className="home-section home-section--alt">
        <div className="home-section-header">
          <div className="reviews-header-left">
            <div className="reviews-rating">4.8+</div>
            <div>
              <h2 className="home-section-title" style={{ margin: 0 }}>Happy Drive Stories</h2>
              <p className="home-section-sub" style={{ margin: 0 }}>What our users are saying</p>
            </div>
          </div>
        </div>
        <div className="reviews-scroll">
          {[
            { name: "Aravind K.", city: "Chennai", rating: 5, text: "Found my dream Swift in under 10 minutes. The RC verification badge gave me full confidence. Super smooth process!", date: "March 2026" },
            { name: "Priya M.", city: "Bangalore", rating: 5, text: "Listed my Honda City and got 3 serious inquiries within a day. The chat feature made it easy to respond quickly.", date: "February 2026" },
            { name: "Rahul S.", city: "Mumbai", rating: 5, text: "The health check report on the car I bought was detailed and accurate. No surprises after purchase. Highly recommended.", date: "March 2026" },
            { name: "Deepika R.", city: "Hyderabad", rating: 4, text: "EMI calculator helped me plan my budget perfectly. Bought a 2021 Nexon at a great price. DreamCar is the future!", date: "January 2026" },
            { name: "Vikram N.", city: "Pune", rating: 5, text: "DreamBot answered all my questions at midnight when I was comparing two cars. Amazing AI assistant. 10/10 experience.", date: "February 2026" },
            { name: "Sunita P.", city: "Delhi", rating: 5, text: "The dealer profile page helped me check the seller's history before buying. Felt very safe and transparent throughout.", date: "March 2026" },
          ].map((r) => (
            <div key={r.name} className="review-card card">
              <div className="review-stars">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              <p className="review-text">"{r.text}"</p>
              <div className="review-author">
                <div className="review-avatar">{r.name[0]}</div>
                <div>
                  <p className="review-name">{r.name}</p>
                  <p className="review-meta">{r.city} · {r.date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          AUTO NEWS / BLOG
      ═══════════════════════════════════════ */}
      <section className="home-section">
        <div className="home-section-header">
          <h2 className="home-section-title">Latest from AutoVerse</h2>
          <p className="home-section-sub">Stay updated with the Indian auto industry</p>
        </div>
        <div className="news-grid">
          {[
            { tag: "Buying Guide", title: "Top 5 Pre-Owned Cars Under ₹5 Lakh in 2026", img: "https://images.unsplash.com/photo-1542362567-b07e54358753?w=400&q=80", read: "3 min read" },
            { tag: "Tips & Tricks", title: "How to Inspect a Used Car Before Buying — Complete Checklist", img: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&q=80", read: "5 min read" },
            { tag: "Market Update", title: "Used Car Prices in India: What's Changing in 2026?", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80", read: "4 min read" },
            { tag: "EV Special", title: "Best Pre-Owned Electric Cars Available Right Now in India", img: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80", read: "4 min read" },
          ].map((n) => (
            <div key={n.title} className="news-card card">
              <div className="news-img-wrap">
                <img src={n.img} alt={n.title} className="news-img" />
                <span className="news-tag">{n.tag}</span>
              </div>
              <div className="news-body">
                <h3 className="news-title">{n.title}</h3>
                <p className="news-meta">DreamCar AutoVerse · {n.read}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
      ═══════════════════════════════════════ */}
      <footer className="home-footer">
        <div className="footer-top">
          <div className="footer-brand-col">
            <div className="footer-brand">🚗 DreamCar</div>
            <p className="footer-tagline">India's trusted marketplace for pre-owned cars. Buy and sell with confidence.</p>
            <div className="footer-social">
              {["📘","🐦","📸","▶️","💼"].map((icon, i) => (
                <button key={i} type="button" className="footer-social-btn">{icon}</button>
              ))}
            </div>
          </div>
          <div className="footer-links-grid">
            <div className="footer-col">
              <h4 className="footer-col-title">Company</h4>
              {FOOTER_LINK_GROUPS.company.map((item) => (
                <button key={item.slug} type="button" className="footer-link footer-link-btn" onClick={() => openFooterPage(item.slug)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Discover</h4>
              {FOOTER_LINK_GROUPS.discover.map((item) => (
                <button key={item.slug} type="button" className="footer-link footer-link-btn" onClick={() => openFooterPage(item.slug)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="footer-col">
              <h4 className="footer-col-title">Help & Support</h4>
              {FOOTER_LINK_GROUPS.support.map((item) => (
                <button key={item.slug} type="button" className="footer-link footer-link-btn" onClick={() => openFooterPage(item.slug)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="footer-help-bar">
          {[
            { icon: "💬", title: "Ask DreamBot", desc: "Get instant help from our AI assistant" },
            { icon: "📞", title: "Call Support", desc: "Mon–Sat, 9 AM – 7 PM" },
            { icon: "❓", title: "FAQs", desc: "Browse common questions" },
          ].map((h) => (
            <div key={h.title} className="footer-help-card">
              <span className="footer-help-icon">{h.icon}</span>
              <div>
                <p className="footer-help-title">{h.title}</p>
                <p className="footer-help-desc">{h.desc}</p>
              </div>
              <span className="footer-help-arrow">›</span>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <p>© 2026 DreamCar. All rights reserved.</p>
          <p>Made with ❤️ in India</p>
        </div>
      </footer>

      {/* ═══════════════════════════════════════
          EMI CALCULATOR MODAL
      ═══════════════════════════════════════ */}
      {emiOpen && (
        <div className="emi-modal-overlay" onClick={() => setEmiOpen(false)}>
          <div id="emi-modal" className="emi-modal card" onClick={(e) => e.stopPropagation()}>
            <div className="emi-modal-header">
              <h2 className="emi-modal-title">🧮 EMI Calculator</h2>
              <button type="button" className="emi-modal-close" onClick={() => setEmiOpen(false)}>✕</button>
            </div>

            {/* Result */}
            <div className="emi-result-box">
              <div>
                <p className="emi-result-label">Monthly EMI</p>
                <p className="emi-result-value">
                  ₹{Math.round(
                    (() => {
                      const p = emiPrice * (1 - emiDown / 100);
                      const r = emiRate / 100 / 12;
                      return r === 0 ? p / emiMonths : (p * r * Math.pow(1+r, emiMonths)) / (Math.pow(1+r, emiMonths) - 1);
                    })()
                  ).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="emi-result-breakdown">
                <div className="emi-result-row">
                  <span>Loan Amount</span>
                  <span>₹{Math.round(emiPrice * (1 - emiDown / 100)).toLocaleString("en-IN")}</span>
                </div>
                <div className="emi-result-row">
                  <span>Down Payment ({emiDown}%)</span>
                  <span>₹{Math.round(emiPrice * emiDown / 100).toLocaleString("en-IN")}</span>
                </div>
                <div className="emi-result-row emi-result-row--total">
                  <span>Total Payable</span>
                  <span>₹{Math.round(
                    (() => {
                      const p = emiPrice * (1 - emiDown / 100);
                      const r = emiRate / 100 / 12;
                      const emi = r === 0 ? p / emiMonths : (p * r * Math.pow(1+r, emiMonths)) / (Math.pow(1+r, emiMonths) - 1);
                      return emi * emiMonths + emiPrice * emiDown / 100;
                    })()
                  ).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Sliders */}
            <div className="emi-sliders">
              <div className="emi-slider-field">
                <label>Car Price: ₹{emiPrice.toLocaleString("en-IN")}</label>
                <input type="range" min="100000" max="5000000" step="50000" value={emiPrice}
                  onChange={(e) => setEmiPrice(Number(e.target.value))} className="emi-slider" />
                <div className="emi-slider-minmax"><span>₹1L</span><span>₹50L</span></div>
              </div>
              <div className="emi-slider-field">
                <label>Down Payment: {emiDown}% (₹{Math.round(emiPrice * emiDown / 100).toLocaleString("en-IN")})</label>
                <input type="range" min="10" max="50" step="5" value={emiDown}
                  onChange={(e) => setEmiDown(Number(e.target.value))} className="emi-slider" />
                <div className="emi-slider-minmax"><span>10%</span><span>50%</span></div>
              </div>
              <div className="emi-slider-field">
                <label>Interest Rate: {emiRate}% p.a.</label>
                <input type="range" min="6" max="18" step="0.5" value={emiRate}
                  onChange={(e) => setEmiRate(Number(e.target.value))} className="emi-slider" />
                <div className="emi-slider-minmax"><span>6%</span><span>18%</span></div>
              </div>
              <div className="emi-slider-field">
                <label>Tenure: {emiMonths} months ({emiMonths / 12} years)</label>
                <input type="range" min="12" max="84" step="12" value={emiMonths}
                  onChange={(e) => setEmiMonths(Number(e.target.value))} className="emi-slider" />
                <div className="emi-slider-minmax"><span>1 yr</span><span>7 yrs</span></div>
              </div>
            </div>
            <p className="emi-disclaimer">* Indicative only. Actual EMI may vary by lender.</p>
            <button type="button" className="btn btn-primary" style={{ width:"100%", marginTop:"0.5rem" }}
              onClick={() => { setEmiOpen(false); document.getElementById("car-listings")?.scrollIntoView({ behavior:"smooth" }); }}>
              Browse Cars with this Budget →
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default HomePage;
