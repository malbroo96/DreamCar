import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import { deleteCar, getCars, updateCar } from "../services/carService";
import { setStoredUser } from "../services/authService";
import { getMessageNotifications } from "../services/messageService";
import { getMyProfile, updateMyProfile } from "../services/userService";

const ProfilePage = ({ onProfileUpdated }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", bio: "", phone: "", location: "" });
  const [savedProfile, setSavedProfile] = useState({ name: "", username: "", bio: "", phone: "", location: "" });
  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [cars, setCars] = useState([]);
  const [notifications, setNotifications] = useState({ unreadCount: 0, items: [] });
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      const [profileData, myCars, notificationData] = await Promise.all([
        getMyProfile(),
        getCars({ mine: true }),
        getMessageNotifications(),
      ]);
      setForm({
        name: profileData.name || "",
        username: profileData.username || "",
        bio: profileData.bio || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
      });
      setSavedProfile({
        name: profileData.name || "",
        username: profileData.username || "",
        bio: profileData.bio || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
      });
      setIsEditingProfile(false);
      setCars(myCars);
      setNotifications(notificationData);
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
      setSuccess("");
      const payload = {
        name: String(form.name || "").trim(),
        username: String(form.username || "").trim().toLowerCase(),
        bio: String(form.bio || "").trim(),
        phone: String(form.phone || "").trim(),
        location: String(form.location || "").trim(),
      };
      if (!payload.name) {
        setError("Name is required");
        return;
      }
      if (!payload.username) {
        setError("Username is required");
        return;
      }
      const updated = await updateMyProfile(payload);
      const storedUser = {
        id: updated.googleId,
        name: updated.name,
        username: updated.username,
        googleName: updated.googleName,
        email: updated.email,
        picture: updated.picture,
        role: updated.role,
        bio: updated.bio,
        phone: updated.phone,
        location: updated.location,
      };
      setStoredUser(storedUser);
      onProfileUpdated?.(storedUser);
      setForm({
        name: updated.name || "",
        username: updated.username || "",
        bio: updated.bio || "",
        phone: updated.phone || "",
        location: updated.location || "",
      });
      setSavedProfile({
        name: updated.name || "",
        username: updated.username || "",
        bio: updated.bio || "",
        phone: updated.phone || "",
        location: updated.location || "",
      });
      setIsEditingProfile(false);
      setSuccess("Profile saved successfully.");
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
      {success ? <p style={{ color: "#177245" }}>{success}</p> : null}

      {isEditingProfile ? (
        <form onSubmit={handleProfileSave} className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="field">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                required
                value={form.username}
                onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              />
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
          <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.75rem" }}>
            <button type="submit" className="btn btn-primary">
              {saving ? "Saving..." : "Save Profile"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setForm(savedProfile);
                setIsEditingProfile(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ marginTop: 0 }}>{savedProfile.name || "Profile"}</h2>
          <p style={{ margin: "0 0 0.35rem", color: "#4c6785" }}>@{savedProfile.username || "username"}</p>
          <p style={{ margin: "0 0 0.35rem" }}>{savedProfile.phone || "No phone added"}</p>
          <p style={{ margin: "0 0 0.35rem" }}>{savedProfile.location || "No location added"}</p>
          <p style={{ marginTop: "0.2rem" }}>{savedProfile.bio || "No bio added"}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setIsEditingProfile(true)}>
            Edit Profile
          </button>
        </div>
      )}

      <div className="card" style={{ padding: "1rem", marginBottom: "1rem" }}>
        <h2 style={{ marginTop: 0 }}>Message Notifications</h2>
        {notifications.unreadCount > 0 ? (
          <p style={{ marginTop: "0.25rem" }}>
            You have <strong>{notifications.unreadCount}</strong> unread message
            {notifications.unreadCount > 1 ? "s" : ""}.
          </p>
        ) : (
          <p style={{ marginTop: "0.25rem" }}>No new messages.</p>
        )}
        {notifications.items.map((item) => (
          <div
            key={item._id}
            style={{
              border: "1px solid #e4ebf3",
              borderRadius: 12,
              padding: "0.7rem",
              marginBottom: "0.5rem",
            }}
          >
            <p style={{ margin: "0 0 0.2rem", fontWeight: 700 }}>{item.carTitle}</p>
            <p style={{ margin: "0 0 0.3rem", color: "#4c6785" }}>From: {item.senderName}</p>
            <p style={{ margin: "0 0 0.5rem" }}>{item.text}</p>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(`/messages?thread=${item.threadId}`)}>
              Open Chat
            </button>
          </div>
        ))}
      </div>

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
