import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/Spinner";
import ChatbotWidget from "./components/chatbot/ChatbotWidget";
import CarsAnimation from "./components/CarsAnimation";
import { getStoredUser, logout } from "./services/authService";
import { getMessageNotifications } from "./services/messageService";
import useScrollReveal from "./hooks/useScrollReveal";
import "./App.css";

const HomePage           = lazy(() => import("./pages/HomePage"));
const CarDetailPage      = lazy(() => import("./pages/CarDetailPage"));
const AddCarPage         = lazy(() => import("./pages/AddCarPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const LoginPage          = lazy(() => import("./pages/LoginPage"));
const ProfilePage        = lazy(() => import("./pages/ProfilePage"));
const MessagesPage       = lazy(() => import("./pages/MessagesPage"));
const InspectionPage     = lazy(() => import("./pages/InspectionPage"));
const DealerProfilePage  = lazy(() => import("./pages/DealerProfilePage"));

const PageLoader = () => <Spinner size="lg" text="Loading..." />;

/* ── Logo component ── */
const Logo = () => (
  <NavLink to="/" className="brand">
    <svg className="brand-hex" viewBox="0 0 38 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 2L35 10V28C35 35 28 40 19 43C10 40 3 35 3 28V10L19 2Z"
        fill="#0f2035" stroke="#d4af37" strokeWidth="1.5"/>
      <path d="M19 6L31 13V27C31 33 25.5 37.5 19 40C12.5 37.5 7 33 7 27V13L19 6Z"
        fill="none" stroke="rgba(212,175,55,0.3)" strokeWidth="0.75"/>
      <text x="10" y="29" fontFamily="Arial,sans-serif" fontSize="14" fontWeight="700" fill="#d4af37">DC</text>
    </svg>
    <div className="brand-text">
      <span className="brand-dream">Dream</span>
      <span className="brand-car">Car</span>
    </div>
  </NavLink>
);

/* ── Browse dropdown ── */
const BRANDS = ["Maruti Suzuki","Hyundai","Tata","Honda","Toyota","Kia","Mahindra","Ford"];
const CITIES = ["Chennai","Mumbai","Bangalore","Delhi","Hyderabad","Pune","Kolkata","Ahmedabad"];

const BrowseDropdown = ({ onClose, onFilter }) => (
  <div className="nav-dropdown-menu">
    <div className="nav-dropdown-col">
      <p className="nav-dropdown-heading">By Brand</p>
      {BRANDS.map((b) => (
        <button key={b} className="nav-dropdown-item" onClick={() => { onFilter("brand", b); onClose(); }}>
          🚗 {b}
        </button>
      ))}
    </div>
    <div className="nav-dropdown-divider" />
    <div className="nav-dropdown-col">
      <p className="nav-dropdown-heading">By City</p>
      {CITIES.map((c) => (
        <button key={c} className="nav-dropdown-item" onClick={() => { onFilter("city", c); onClose(); }}>
          📍 {c}
        </button>
      ))}
    </div>
  </div>
);

const App = () => {
  const location = useLocation();
  const [user, setUser]               = useState(() => getStoredUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [browseOpen, setBrowseOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const browseRef = useRef(null);
  const userRef   = useRef(null);

  const isAuthenticated = Boolean(user);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useScrollReveal(location.pathname);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (browseRef.current && !browseRef.current.contains(e.target)) setBrowseOpen(false);
      if (userRef.current   && !userRef.current.contains(e.target))   setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* Scroll shadow */
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  /* Close mobile nav on route change */
  useEffect(() => {
    setMobileNavOpen(false);
    setBrowseOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const load = async () => {
      try {
        const data = await getMessageNotifications();
        if (mounted) setUnreadCount(Number(data?.unreadCount || 0));
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => { mounted = false; clearInterval(id); };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setUnreadCount(0);
    setUser(null);
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  };

  const handleBrowseFilter = (key, value) => {
    /* Navigate to home with filter param */
    window.location.href = `/?${key}=${encodeURIComponent(value)}`;
  };

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="app-shell">
          <CarsAnimation />
          <div className="app-content-wrapper">

            {/* ══════════════════════════════════
                NAVBAR
            ══════════════════════════════════ */}
            <header className={`topbar ${scrolled ? "topbar--scrolled" : ""}`}>
              <div className="container topbar-inner">

                {/* Logo */}
                <Logo />

                {/* Hamburger */}
                <button className="nav-hamburger" aria-label="Toggle navigation"
                  onClick={() => setMobileNavOpen((v) => !v)}>
                  <span /><span /><span />
                </button>

                {/* Nav links */}
                <nav className={`nav-links ${mobileNavOpen ? "nav-links--open" : ""}`}>

                  {/* Browse Cars + dropdown */}
                  {isAuthenticated && (
                    <div className="nav-dropdown-wrap" ref={browseRef}>
                      <button
                        className={`nav-link nav-link-btn ${browseOpen ? "nav-link--open" : ""}`}
                        onClick={() => setBrowseOpen((v) => !v)}
                      >
                        Browse Cars
                        <span className={`nav-chevron ${browseOpen ? "nav-chevron--up" : ""}`}>▼</span>
                      </button>
                      {browseOpen && (
                        <BrowseDropdown onClose={() => setBrowseOpen(false)} onFilter={handleBrowseFilter} />
                      )}
                    </div>
                  )}

                  {isAuthenticated && (
                    <NavLink to="/messages"
                      className={({ isActive }) => `nav-link nav-messages-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      Messages
                      {unreadCount > 0 && (
                        <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                      )}
                    </NavLink>
                  )}

                  {isAuthenticated && (
                    <NavLink to="/inspections"
                      className={({ isActive }) => `nav-link nav-inspection-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      🔍 Inspections
                    </NavLink>
                  )}

                  {isAuthenticated && (
                    <NavLink to="/add-car"
                      className={({ isActive }) => `nav-link nav-sell-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      + Sell Car
                    </NavLink>
                  )}

                  {isAdmin && (
                    <NavLink to="/admin"
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      Admin
                    </NavLink>
                  )}

                  {!isAuthenticated && (
                    <NavLink to="/login"
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      Login
                    </NavLink>
                  )}

                  {/* User menu */}
                  {isAuthenticated && (
                    <div className="nav-user-wrap" ref={userRef}>
                      <button className="nav-user-btn" onClick={() => setUserMenuOpen((v) => !v)}>
                        {user?.picture ? (
                          <img src={user.picture} alt={user.name} className="nav-user-avatar nav-user-avatar--img" />
                        ) : (
                          <span className="nav-user-avatar nav-user-avatar--initials">{initials}</span>
                        )}
                        <span className="nav-user-name">{user?.name?.split(" ")[0] || "Profile"}</span>
                        <span className={`nav-chevron ${userMenuOpen ? "nav-chevron--up" : ""}`}>▼</span>
                      </button>

                      {userMenuOpen && (
                        <div className="nav-user-menu">
                          <div className="nav-user-menu-header">
                            <p className="nav-user-menu-name">{user?.name}</p>
                            <p className="nav-user-menu-email">{user?.email}</p>
                          </div>
                          <div className="nav-user-menu-divider" />
                          <NavLink to="/profile" className="nav-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                            👤 My Profile
                          </NavLink>
                          <NavLink to="/inspections" className="nav-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                            🔍 My Inspections
                          </NavLink>
                          <NavLink to="/messages" className="nav-user-menu-item" onClick={() => setUserMenuOpen(false)}>
                            💬 Messages
                          </NavLink>
                          <div className="nav-user-menu-divider" />
                          <button className="nav-user-menu-item nav-user-menu-item--danger" onClick={handleLogout}>
                            🚪 Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </nav>
              </div>
            </header>

            <main className="container content-area">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/"            element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
                  <Route path="/cars/:id"    element={isAuthenticated ? <CarDetailPage /> : <Navigate to="/login" replace />} />
                  <Route path="/dealer/:id"  element={isAuthenticated ? <DealerProfilePage /> : <Navigate to="/login" replace />} />
                  <Route path="/add-car"     element={isAuthenticated ? <AddCarPage /> : <Navigate to="/login" replace />} />
                  <Route path="/messages"    element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" replace />} />
                  <Route path="/inspections" element={isAuthenticated ? <InspectionPage /> : <Navigate to="/login" replace />} />
                  <Route path="/profile"     element={isAuthenticated ? <ProfilePage onProfileUpdated={setUser} /> : <Navigate to="/login" replace />} />
                  <Route path="/login"       element={!isAuthenticated ? <LoginPage onLogin={setUser} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />} />
                  <Route path="/admin"       element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/login" replace />} />
                  <Route path="*"            element={<div style={{ textAlign:"center", padding:"3rem", color:"#7a96b4" }}><h2>Page not found</h2><p>The page you're looking for doesn't exist.</p></div>} />
                </Routes>
              </Suspense>
            </main>
          </div>

          {isAuthenticated && <ChatbotWidget />}
        </div>
      </ErrorBoundary>
    </ToastProvider>
  );
};

export default App;