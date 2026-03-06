import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import CarDetailPage from "./pages/CarDetailPage";
import AddCarPage from "./pages/AddCarPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import "./App.css";

const App = () => {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <NavLink to="/" className="brand">
            DreamCar
          </NavLink>
          <nav className="nav-links">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/add-car">Sell Car</NavLink>
            <NavLink to="/admin">Admin</NavLink>
          </nav>
        </div>
      </header>

      <main className="container content-area">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/cars/:id" element={<CarDetailPage />} />
          <Route path="/add-car" element={<AddCarPage />} />
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
