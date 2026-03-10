import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import HomePage from "./pages/HomePage";
import CarDetailPage from "./pages/CarDetailPage";
import AddCarPage from "./pages/AddCarPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import MessagesPage from "./pages/MessagesPage";
import ChatbotWidget from "./components/chatbot/ChatbotWidget";
import DealerProfilePage from "./pages/DealerProfilePage";
import CarsAnimation from "./components/CarsAnimation";
import { getStoredUser, logout } from "./services/authService";
import { getMessageNotifications } from "./services/messageService";
import useScrollReveal from "./hooks/useScrollReveal";
import "./App.css";

const App = () => {
  const location = useLocation();
  const [user, setUser] = useState(() => getStoredUser());
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAuthenticated = Boolean(user);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  useScrollReveal(location.pathname);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let isMounted = true;

    const loadUnreadCount = async () => {
      try {
        const data = await getMessageNotifications();
        if (isMounted) setUnreadCount(Number(data?.unreadCount || 0));
      } catch {
        if (isMounted) setUnreadCount(0);
      }
    };

    loadUnreadCount();
    const intervalId = setInterval(loadUnreadCount, 20000);
    return () => { isMounted = false; clearInterval(intervalId); };
  }, [isAuthenticated]);

  const handleLogout = () => {
    logout();
    setUnreadCount(0);
    setUser(null);
    setMobileNavOpen(false);
  };

  return (
    <div className="app-shell">
      {/* Background car animations */}
      <CarsAnimation />
      <div className="app-content-wrapper">
      <header className="topbar">
        <div className="container topbar-inner">
          {/* Brand */}
          <NavLink to="/" className="brand" onClick={() => setMobileNavOpen(false)}>
            <span className="brand-icon">🚗</span>
            DreamCar
          </NavLink>

          {/* Hamburger (mobile) */}
          <button
            className="nav-hamburger"
            aria-label="Toggle navigation"
            onClick={() => setMobileNavOpen((v) => !v)}
          >
            <span /><span /><span />
          </button>

          {/* Nav links */}
          <nav className={`nav-links ${mobileNavOpen ? "nav-links--open" : ""}`}>
            {isAuthenticated && (
              <NavLink to="/" onClick={() => setMobileNavOpen(false)}>
                Browse Cars
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/add-car" className="nav-sell-link" onClick={() => setMobileNavOpen(false)}>
                + Sell Car
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/messages" className="nav-messages-link" onClick={() => setMobileNavOpen(false)}>
                Messages
                {unreadCount > 0 && (
                  <span className="nav-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
              </NavLink>
            )}
            {isAdmin && (
              <NavLink to="/admin" onClick={() => setMobileNavOpen(false)}>
                Admin
              </NavLink>
            )}
            {!isAuthenticated && (
              <NavLink to="/login" onClick={() => setMobileNavOpen(false)}>
                Login
              </NavLink>
            )}
            {isAuthenticated && (
              <NavLink to="/profile" className="nav-profile-link" onClick={() => setMobileNavOpen(false)}>
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="nav-avatar" />
                ) : (
                  <span className="nav-avatar nav-avatar--initials">
                    {(user?.name || "U")[0].toUpperCase()}
                  </span>
                )}
                {user?.name?.split(" ")[0] || "Profile"}
              </NavLink>
            )}
            {isAuthenticated && (
              <button type="button" className="btn btn-secondary btn-logout" onClick={handleLogout}>
                Logout
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="container content-area">
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
          <Route path="/cars/:id" element={isAuthenticated ? <CarDetailPage /> : <Navigate to="/login" replace />} />
          <Route path="/dealer/:id" element={isAuthenticated ? <DealerProfilePage /> : <Navigate to="/login" replace />} />
          <Route path="/add-car" element={isAuthenticated ? <AddCarPage /> : <Navigate to="/login" replace />} />
          <Route path="/messages" element={isAuthenticated ? <MessagesPage /> : <Navigate to="/login" replace />} />
          <Route
            path="/profile"
            element={isAuthenticated ? <ProfilePage onProfileUpdated={setUser} /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage onLogin={setUser} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />}
          />
          <Route path="/admin" element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<div style={{ textAlign: "center", padding: "3rem", color: "#7a96b4" }}><h2>Page not found</h2><p>The page you're looking for doesn't exist.</p></div>} />
        </Routes>
      </main>

      </div>{/* end app-content-wrapper */}

      {/* AI Customer Support Chatbot — shown only when logged in */}
      {isAuthenticated && <ChatbotWidget />}
    </div>
  );
};

export default App;
