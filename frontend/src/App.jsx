import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { useMemo, useState } from "react";
import HomePage from "./pages/HomePage";
import CarDetailPage from "./pages/CarDetailPage";
import AddCarPage from "./pages/AddCarPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import LoginPage from "./pages/LoginPage";
import { getStoredUser, logout } from "./services/authService";
import "./App.css";

const App = () => {
  const [user, setUser] = useState(() => getStoredUser());
  const isAuthenticated = Boolean(user);
  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand">
            DreamCar
          </NavLink>
          <nav className="nav-links">
            {isAuthenticated ? <NavLink to="/">Home</NavLink> : null}
            {isAuthenticated ? <NavLink to="/add-car">Sell Car</NavLink> : null}
            {isAdmin ? <NavLink to="/admin">Admin</NavLink> : <NavLink to="/login">Login</NavLink>}
            {user ? (
              <button type="button" className="btn btn-secondary" onClick={handleLogout}>
                Logout
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="container content-area">
        <Routes>
          <Route path="/" element={isAuthenticated ? <HomePage /> : <Navigate to="/login" replace />} />
          <Route path="/cars/:id" element={isAuthenticated ? <CarDetailPage /> : <Navigate to="/login" replace />} />
          <Route path="/add-car" element={isAuthenticated ? <AddCarPage /> : <Navigate to="/login" replace />} />
          <Route
            path="/login"
            element={!isAuthenticated ? <LoginPage onLogin={setUser} /> : <Navigate to={isAdmin ? "/admin" : "/"} replace />}
          />
          <Route path="/admin" element={isAdmin ? <AdminDashboardPage /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
