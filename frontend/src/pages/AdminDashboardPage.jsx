import { useEffect, useState } from "react";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import {
  deleteAdminCar,
  getAdminCars,
  updateAdminCar,
} from "../services/carService";
import {
  getAllInspections,
  getInspectionStats,
  updateInspectionStatus,
} from "../services/inspectionService";
import "./AdminDashboardPage.css";

const STATUS_COLORS = {
  pending:   { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  approved:  { bg: "#d1fae5", color: "#065f46", label: "Approved" },
  rejected:  { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  completed: { bg: "#dbeafe", color: "#1e40af", label: "Completed" },
};

const AdminDashboardPage = () => {
  const [activeTab, setActiveTab]     = useState("cars");
  const [cars, setCars]               = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [carsLoading, setCarsLoading] = useState(true);
  const [carsError, setCarsError]     = useState("");

  const [inspections, setInspections]     = useState([]);
  const [inspStats, setInspStats]         = useState(null);
  const [inspLoading, setInspLoading]     = useState(false);
  const [inspFilter, setInspFilter]       = useState("");
  const [selectedInsp, setSelectedInsp]   = useState(null);
  const [adminNotes, setAdminNotes]       = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [updatingInsp, setUpdatingInsp]   = useState(false);

  /* ── Load cars ── */
  const fetchCars = async () => {
    try {
      setCarsLoading(true);
      const data = await getAdminCars();
      setCars(data);
    } catch (err) {
      setCarsError(err.response?.data?.message || "Failed to load cars");
    } finally {
      setCarsLoading(false);
    }
  };

  /* ── Load inspections ── */
  const fetchInspections = async () => {
    try {
      setInspLoading(true);
      const [data, stats] = await Promise.all([
        getAllInspections(inspFilter),
        getInspectionStats(),
      ]);
      setInspections(data);
      setInspStats(stats);
    } catch (err) {
      console.error("Failed to load inspections", err);
    } finally {
      setInspLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, []);
  useEffect(() => { if (activeTab === "inspections") fetchInspections(); }, [activeTab, inspFilter]);

  const handleDeleteCar = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    await deleteAdminCar(id);
    setCars((prev) => prev.filter((c) => c._id !== id));
    if (selectedCar?._id === id) setSelectedCar(null);
  };

  const handleUpdateCar = async (payload) => {
    if (!selectedCar) return;
    await updateAdminCar(selectedCar._id, payload);
    await fetchCars();
    setSelectedCar(null);
  };

  const handleUpdateInspection = async (id, status) => {
    try {
      setUpdatingInsp(true);
      await updateInspectionStatus(id, {
        status,
        adminNotes: adminNotes || undefined,
        inspectionDate: inspectionDate || undefined,
      });
      setSelectedInsp(null);
      setAdminNotes("");
      setInspectionDate("");
      await fetchInspections();
    } catch (err) {
      console.error("Failed to update inspection", err);
    } finally {
      setUpdatingInsp(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">Admin Dashboard</h1>
        <p className="adm-sub">Manage listings, inspections and platform activity</p>
      </div>

      {/* ── Tabs ── */}
      <div className="adm-tabs">
        <button
          className={`adm-tab ${activeTab === "cars" ? "adm-tab--active" : ""}`}
          onClick={() => setActiveTab("cars")}
        >
          🚗 Car Listings
          <span className="adm-tab-badge">{cars.length}</span>
        </button>
        <button
          className={`adm-tab ${activeTab === "inspections" ? "adm-tab--active" : ""}`}
          onClick={() => setActiveTab("inspections")}
        >
          🔍 Inspections
          {inspStats?.pending > 0 && (
            <span className="adm-tab-badge adm-tab-badge--alert">{inspStats.pending}</span>
          )}
        </button>
      </div>

      {/* ════════════════════════════════════
          CARS TAB
      ════════════════════════════════════ */}
      {activeTab === "cars" && (
        <div>
          {carsError && <p style={{ color:"#dc2626" }}>{carsError}</p>}
          {carsLoading && <p style={{ color:"#7a96b4" }}>Loading listings...</p>}

          {selectedCar && (
            <div className="adm-edit-section">
              <div className="adm-edit-header">
                <h2 className="adm-edit-title">✏ Edit Listing</h2>
                <button className="btn btn-secondary" onClick={() => setSelectedCar(null)}>✕ Cancel</button>
              </div>
              <CarForm
                key={selectedCar._id}
                initialValues={selectedCar}
                hasExistingRC={Boolean(selectedCar.rcDocument?.publicId)}
                includeStatus
                submitLabel="Update Listing"
                onSubmit={handleUpdateCar}
              />
            </div>
          )}

          <div className="car-grid">
            {cars.map((car) => (
              <CarCard
                key={car._id}
                car={car}
                adminActions={
                  <div style={{ marginTop:"0.8rem", display:"flex", gap:"0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => { setSelectedCar(car); window.scrollTo({ top: 0, behavior:"smooth" }); }}>
                      ✏ Edit
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDeleteCar(car._id)}>
                      🗑 Delete
                    </button>
                  </div>
                }
              />
            ))}
          </div>
          {!carsLoading && cars.length === 0 && (
            <p style={{ textAlign:"center", color:"#7a96b4", padding:"2rem" }}>No listings found.</p>
          )}
        </div>
      )}

      {/* ════════════════════════════════════
          INSPECTIONS TAB
      ════════════════════════════════════ */}
      {activeTab === "inspections" && (
        <div>
          {/* Stats */}
          {inspStats && (
            <div className="adm-stats-grid">
              {[
                { label: "Total",     value: inspStats.total,     color: "#0b6ef3" },
                { label: "Pending",   value: inspStats.pending,   color: "#d97706" },
                { label: "Approved",  value: inspStats.approved,  color: "#16a34a" },
                { label: "Completed", value: inspStats.completed, color: "#7c3aed" },
                { label: "Rejected",  value: inspStats.rejected,  color: "#dc2626" },
              ].map((s) => (
                <div key={s.label} className="adm-stat-card card">
                  <span className="adm-stat-value" style={{ color: s.color }}>{s.value}</span>
                  <span className="adm-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Filter */}
          <div className="adm-filter-row">
            {["", "pending", "approved", "rejected", "completed"].map((s) => (
              <button
                key={s || "all"}
                type="button"
                className={`adm-filter-btn ${inspFilter === s ? "adm-filter-btn--active" : ""}`}
                onClick={() => setInspFilter(s)}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
              </button>
            ))}
          </div>

          {inspLoading && <p style={{ color:"#7a96b4" }}>Loading inspections...</p>}

          {/* Inspection list */}
          <div className="adm-insp-list">
            {inspections.map((insp) => {
              const sc = STATUS_COLORS[insp.status] || STATUS_COLORS.pending;
              const isSelected = selectedInsp?._id === insp._id;
              return (
                <div key={insp._id} className="adm-insp-card card">
                  <div className="adm-insp-top">
                    {/* Car info */}
                    <div className="adm-insp-car">
                      {insp.carImage && (
                        <img src={insp.carImage} alt={insp.carTitle} className="adm-insp-car-img" />
                      )}
                      <div>
                        <p className="adm-insp-car-title">{insp.carTitle || "Unknown Car"}</p>
                        <p className="adm-insp-car-sub">{insp.carBrand} {insp.carModel} · {insp.carYear}</p>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className="adm-insp-status" style={{ background: sc.bg, color: sc.color }}>
                      {sc.label}
                    </span>
                  </div>

                  {/* Buyer info */}
                  <div className="adm-insp-details">
                    <div className="adm-insp-detail">
                      <span className="adm-insp-detail-label">Buyer</span>
                      <span>{insp.buyerName || "—"} · {insp.buyerEmail}</span>
                    </div>
                    <div className="adm-insp-detail">
                      <span className="adm-insp-detail-label">Preferred</span>
                      <span>
                        {insp.preferredDate ? new Date(insp.preferredDate).toLocaleDateString("en-IN") : "Not set"}
                        {insp.preferredTime ? ` · ${insp.preferredTime}` : ""}
                      </span>
                    </div>
                    <div className="adm-insp-detail">
                      <span className="adm-insp-detail-label">Location</span>
                      <span>{insp.location || "—"}</span>
                    </div>
                    {insp.notes && (
                      <div className="adm-insp-detail adm-insp-detail--full">
                        <span className="adm-insp-detail-label">Notes</span>
                        <span>{insp.notes}</span>
                      </div>
                    )}
                    <div className="adm-insp-detail">
                      <span className="adm-insp-detail-label">Requested</span>
                      <span>{new Date(insp.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="adm-insp-actions">
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize:"0.8rem" }}
                      onClick={() => setSelectedInsp(isSelected ? null : insp)}
                    >
                      {isSelected ? "▲ Close" : "▼ Manage"}
                    </button>
                    {insp.status === "pending" && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize:"0.8rem" }}
                          onClick={() => handleUpdateInspection(insp._id, "approved")} disabled={updatingInsp}>
                          ✓ Approve
                        </button>
                        <button className="btn btn-danger" style={{ fontSize:"0.8rem" }}
                          onClick={() => handleUpdateInspection(insp._id, "rejected")} disabled={updatingInsp}>
                          ✕ Reject
                        </button>
                      </>
                    )}
                    {insp.status === "approved" && (
                      <button className="btn btn-primary" style={{ fontSize:"0.8rem", background:"#7c3aed", border:"none" }}
                        onClick={() => handleUpdateInspection(insp._id, "completed")} disabled={updatingInsp}>
                        ✓ Mark Complete
                      </button>
                    )}
                  </div>

                  {/* Expanded manage panel */}
                  {isSelected && (
                    <div className="adm-insp-manage">
                      <div className="field">
                        <label>Admin Notes</label>
                        <textarea rows="2" value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Add notes visible to admin only..." />
                      </div>
                      <div className="field">
                        <label>Scheduled Inspection Date</label>
                        <input type="date" value={inspectionDate}
                          onChange={(e) => setInspectionDate(e.target.value)} />
                      </div>
                      <div style={{ display:"flex", gap:"0.5rem", flexWrap:"wrap" }}>
                        {["pending","approved","rejected","completed"].map((s) => (
                          <button key={s} type="button"
                            className="btn btn-secondary"
                            style={{ fontSize:"0.78rem", textTransform:"capitalize" }}
                            onClick={() => handleUpdateInspection(insp._id, s)}
                            disabled={updatingInsp || insp.status === s}>
                            Set {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!inspLoading && inspections.length === 0 && (
            <div style={{ textAlign:"center", padding:"3rem", color:"#7a96b4" }}>
              <p style={{ fontSize:"2rem", marginBottom:"0.5rem" }}>🔍</p>
              <p>No inspection requests found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;