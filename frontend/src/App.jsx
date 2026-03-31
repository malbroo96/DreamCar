import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider } from "./components/Toast";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/Spinner";
import ChatbotWidget from "./components/chatbot/ChatbotWidget";
import CarsAnimation from "./components/CarsAnimation";
import ThemeToggle from "./components/ThemeToggle";
import useDocumentMeta from "./hooks/useDocumentMeta";
import { getStoredUser, logout, refreshCurrentUser, setStoredUser } from "./services/authService";
import { clearMessageNotificationCache, getMessageNotifications } from "./services/messageService";
import { clearInspectionCache } from "./services/inspectionService";
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
const FooterInfoPage     = lazy(() => import("./pages/FooterInfoPage"));

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

const META_BY_PATH = {
  "/": {
    title: "Buy and Sell Used Cars in India",
    description: "Browse verified used car listings, compare details, and connect directly with sellers across India on DreamCar.",
  },
  "/login": {
    title: "Login",
    description: "Log in to DreamCar to browse listings, sell your car, chat with sellers, and manage your profile.",
  },
  "/add-car": {
    title: "Sell Your Car",
    description: "List your used car on DreamCar with photos, details, and pricing to reach buyers across India.",
  },
  "/messages": {
    title: "Messages",
    description: "Chat directly with buyers and sellers in real time on DreamCar.",
  },
  "/inspections": {
    title: "Car Inspections",
    description: "Review and manage vehicle inspections, condition details, and verification information on DreamCar.",
  },
  "/profile": {
    title: "Profile",
    description: "Manage your DreamCar account, listings, and personal details in one place.",
  },
  "/admin": {
    title: "Admin Dashboard",
    description: "Admin tools for managing listings, inspections, and marketplace activity on DreamCar.",
  },
  "/info": {
    title: "Information",
    description: "Read DreamCar policies, guides, support information, and footer content pages.",
  },
};

const App = () => {
  const location = useLocation();
  const [user, setUser]               = useState(() => getStoredUser());
  const [authResolved, setAuthResolved] = useState(() => !getStoredUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled]       = useState(false);
  const userRef   = useRef(null);

  const isAuthenticated = Boolean(user);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);
  const meta = META_BY_PATH[location.pathname] || {
    title: "Used Car Marketplace",
    description: "Explore verified pre-owned car listings and dealership information on DreamCar.",
  };

  useScrollReveal(location.pathname);
  useDocumentMeta({
    title: meta.title,
    description: meta.description,
    path: location.pathname,
  });

  useEffect(() => {
    if (!user) {
      setAuthResolved(true);
      return;
    }

    let mounted = true;
    refreshCurrentUser()
      .then((freshUser) => {
        if (!mounted) return;
        setUser(freshUser);
      })
      .catch(() => {
        if (!mounted) return;
        logout();
        setStoredUser(null);
        setUser(null);
      })
      .finally(() => {
        if (mounted) setAuthResolved(true);
      });

    return () => { mounted = false; };
  }, []);

  /* Close dropdowns on outside click or Escape */
  useEffect(() => {
    const handleClick = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setUserMenuOpen(false);
        setMobileNavOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
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
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    const load = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await getMessageNotifications();
        if (mounted) setUnreadCount(Number(data?.unreadCount || 0));
      } catch {
        if (mounted) setUnreadCount(0);
      }
    };
    load();
    const id = setInterval(load, 60000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        load();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      mounted = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    clearMessageNotificationCache();
    clearInspectionCache();
    setUnreadCount(0);
    setUser(null);
    setMobileNavOpen(false);
    setUserMenuOpen(false);
  };

  const initials = (user?.name || "U").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ToastProvider>
      <ErrorBoundary>
        <div className="app-shell">
          <a href="#main-content" className="skip-to-content">Skip to main content</a>
          <CarsAnimation />
          <div className="app-content-wrapper">

            {/* ══════════════════════════════════
                NAVBAR
            ══════════════════════════════════ */}
            <header className={`topbar ${scrolled ? "topbar--scrolled" : ""}`}>
              <div className="container topbar-inner">

                {/* Logo */}
                <Logo />

                <div className="topbar-actions">
                  <ThemeToggle />
                  {/* Hamburger */}
                  <button className="nav-hamburger" aria-label="Toggle navigation"
                    onClick={() => setMobileNavOpen((v) => !v)}>
                    <span /><span /><span />
                  </button>
                </div>

                {/* Nav links */}
                <nav className={`nav-links ${mobileNavOpen ? "nav-links--open" : ""}`}>

                  {isAuthenticated && (
                    <NavLink to="/add-car"
                      className={({ isActive }) => `nav-link nav-sell-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      + Sell Car
                    </NavLink>
                  )}

                  {isAuthenticated && (
                    <NavLink to="/"
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      onClick={() => setMobileNavOpen(false)}>
                      Home
                    </NavLink>
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

                  {isAuthenticated && isAdmin && (
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

            <main id="main-content" className="container content-area" tabIndex={-1}>
              <Suspense fallback={<PageLoader />}>
                {authResolved ? (
                  <Routes>
                    <Route path="/"            element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
                    <Route path="/cars/:id"    element={isAuthenticated ? <CarDetailPage /> : <Navigate to="/login" replace />} />
                    <Route path="/dealer/:id"  element={isAuthenticated ? <DealerProfilePage /> : <Navigate to="/login" replace />} />
                    <Route path="/add-car"     element={isAuthenticated ? <AddCarPage /> : <Navigate to="/login" replace />} />
                    <Route path="/messages"    element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" replace />} />
                    <Route path="/inspections" element={isAuthenticated ? <InspectionPage /> : <Navigate to="/login" replace />} />
                    <Route path="/profile"     element={isAuthenticated ? <ProfilePage onProfileUpdated={setUser} /> : <Navigate to="/login" replace />} />
                    <Route path="/info/:slug"  element={isAuthenticated ? <FooterInfoPage /> : <Navigate to="/login" replace />} />
                    <Route path="/login"       element={!isAuthenticated ? <LoginPage onLogin={setUser} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />} />
                    <Route path="/admin"       element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/login" replace />} />
                    <Route path="*"            element={<div style={{ textAlign:"center", padding:"3rem", color:"#7a96b4" }}><h2>Page not found</h2><p>The page you're looking for doesn't exist.</p></div>} />
                  </Routes>
                ) : (
                  <PageLoader />
                )}
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
