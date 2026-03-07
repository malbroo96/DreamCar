import { useEffect, useState } from "react";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import { deleteCar, getCars, updateCar } from "../services/carService";
import { setStoredUser } from "../services/authService";
import { getMyProfile, updateMyProfile } from "../services/userService";

const ProfilePage = ({ onProfileUpdated }) => {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", bio: "", phone: "", location: "" });
  const [cars, setCars] = useState([]);
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [profileData, myCars] = await Promise.all([getMyProfile(), getCars({ mine: true })]);
      setProfile(profileData);
      setForm({
        name: profileData.name || "",
        bio: profileData.bio || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
      });
      setCars(myCars);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      const updated = await updateMyProfile(form);
      const storedUser = {
        id: updated.googleId,
        name: updated.name,
        email: updated.email,
        picture: updated.picture,
        role: updated.role,
        bio: updated.bio,
        phone: updated.phone,
        location: updated.location,
      };
      setStoredUser(storedUser);
      onProfileUpdated?.(storedUser);
      setProfile(updated);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;
    await deleteCar(id);
    setCars((prev) => prev.filter((car) => car._id !== id));
    if (selectedCar?._id === id) setSelectedCar(null);
  };

  const handleUpdateCar = async (payload) => {
    if (!selectedCar) return;
    await updateCar(selectedCar._id, payload);
    await fetchData();
  };

  if (loading) return <p>Loading profile...</p>;

  return (
    <section>
      <h1>My Profile</h1>
      {error ? <p style={{ color: "#c63030" }}>{error}</p> : null}

      <form onSubmit={handleProfileSave} className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              value={form.location}
              onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="bio">Bio</label>
            <textarea id="bio" rows="3" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: "0.75rem" }}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <div className="section-header">
        <h2 style={{ margin: 0 }}>My Listings</h2>
        <p style={{ margin: 0, color: "#4c6785" }}>{cars.length} cars</p>
      </div>

      {selectedCar ? (
        <div style={{ marginBottom: "1rem" }}>
          <h3>Edit Listing</h3>
          <CarForm key={selectedCar._id} initialValues={selectedCar} onSubmit={handleUpdateCar} submitLabel="Update Listing" />
        </div>
      ) : null}

      <div className="grid car-grid">
        {cars.map((car) => (
          <CarCard
            key={car._id}
            car={car}
            adminActions={
              <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.5rem" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedCar(car)}>
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(car._id)}>
                  Delete
                </button>
              </div>
            }
          />
        ))}
      </div>
    </section>
  );
};

export default ProfilePage;
