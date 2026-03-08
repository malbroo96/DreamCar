import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import CarCard from "../components/CarCard";
import CarForm from "../components/CarForm";
import { deleteCar, getCars, updateCar } from "../services/carService";
import { setStoredUser } from "../services/authService";
import { getMessageNotifications } from "../services/messageService";
import { getMyProfile, updateMyProfile } from "../services/userService";
import "../styles/profile.css";

/* ─── tiny helpers ─── */
const getInitials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const ProfilePage = ({ onProfileUpdated }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  /* ── state ── */
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    name: "", username: "", bio: "", phone: "", location: "",
  });
  const [avatarPreview, setAvatarPreview] = useState(null); // base64 preview
  const [isEditing, setIsEditing] = useState(false);
  const [cars, setCars] = useState([]);
  const [notifications, setNotifications] = useState({ unreadCount: 0, items: [] });
  const [selectedCar, setSelectedCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("listings"); // listings | notifications

  /* ── data fetch ── */
  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [profileData, myCars, notificationData] = await Promise.all([
        getMyProfile(),
        getCars({ mine: true }),
        getMessageNotifications(),
      ]);
      setProfile(profileData);
      setForm({
        name: profileData.name || "",
        username: profileData.username || "",
        bio: profileData.bio || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
      });
      setCars(myCars);
      setNotifications(notificationData);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  /* ── avatar preview (local only — wire to upload API if backend supports it) ── */
  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  /* ── save profile ── */
  const handleProfileSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      bio: form.bio.trim(),
      phone: form.phone.trim(),
      location: form.location.trim(),
    };
    if (!payload.name) return setError("Name is required");
    if (!payload.username) return setError("Username is required");

    try {
      setSaving(true);
      setError("");
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
      setProfile(updated);
      setForm({
        name: updated.name || "",
        username: updated.username || "",
        bio: updated.bio || "",
        phone: updated.phone || "",
        location: updated.location || "",
      });
      setIsEditing(false);
      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing?")) return;
    await deleteCar(id);
    setCars((prev) => prev.filter((c) => c._id !== id));
    if (selectedCar?._id === id) setSelectedCar(null);
  };

  const handleUpdateCar = async (payload) => {
    if (!selectedCar) return;
    await updateCar(selectedCar._id, payload);
    setSelectedCar(null);
    await fetchData();
  };

  const cancelEdit = () => {
    setForm({
      name: profile?.name || "",
      username: profile?.username || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
    });
    setAvatarPreview(null);
    setIsEditing(false);
    setError("");
  };

  /* ── loading skeleton ── */
  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-skeleton">
          <div className="skel skel-avatar" />
          <div className="skel skel-line skel-lg" />
          <div className="skel skel-line skel-md" />
          <div className="skel skel-line skel-sm" />
        </div>
      </div>
    );
  }

  const avatarSrc = avatarPreview || profile?.picture || null;
  const displayName = profile?.name || "Dealer";
  const totalListings = cars.length;
  const activeSince = profile?.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="profile-page">

      {/* ── Toast messages ── */}
      {error && (
        <div className="profile-toast profile-toast--error">
          <span>⚠ {error}</span>
          <button onClick={() => setError("")}>✕</button>
        </div>
      )}
      {success && (
        <div className="profile-toast profile-toast--success">
          <span>✓ {success}</span>
        </div>
      )}

      {/* ══════════════════════════════════════════
          PROFILE HERO CARD
      ══════════════════════════════════════════ */}
      <div className="profile-hero-card">

        {/* Cover banner */}
        <div className="profile-cover">
          <div className="profile-cover-pattern" />
        </div>

        {/* Avatar + meta */}
        <div className="profile-hero-body">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} />
              ) : (
                <span className="profile-avatar-initials">{getInitials(displayName)}</span>
              )}
            </div>
            {isEditing && (
              <>
                <button
                  type="button"
                  className="avatar-edit-btn"
                  title="Change photo"
                  onClick={() => fileInputRef.current?.click()}
                >
                  📷
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
              </>
            )}
          </div>

          <div className="profile-hero-info">
            {!isEditing ? (
              <>
                <h1 className="profile-name">{displayName}</h1>
                <p className="profile-username">@{profile?.username || "username"}</p>
                {profile?.bio && <p className="profile-bio">{profile.bio}</p>}

                <div className="profile-meta-row">
                  {profile?.location && (
                    <span className="profile-meta-chip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {profile.location}
                    </span>
                  )}
                  {profile?.phone && (
                    <span className="profile-meta-chip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.37 2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.29 6.29l.89-.89a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                      {profile.phone}
                    </span>
                  )}
                  {profile?.email && (
                    <span className="profile-meta-chip">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
                      {profile.email}
                    </span>
                  )}
                  <span className="profile-meta-chip">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    Member since {activeSince}
                  </span>
                </div>
              </>
            ) : null}
          </div>

          {!isEditing && (
            <button
              type="button"
              className="btn-edit-profile"
              onClick={() => setIsEditing(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit Profile
            </button>
          )}
        </div>

        {/* Stats bar */}
        {!isEditing && (
          <div className="profile-stats-bar">
            <div className="profile-stat">
              <span className="stat-value">{totalListings}</span>
              <span className="stat-label">Listings</span>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <span className="stat-value">{notifications.unreadCount}</span>
              <span className="stat-label">New Messages</span>
            </div>
            <div className="profile-stat-divider" />
            <div className="profile-stat">
              <div className="stat-stars">
                {"★★★★☆"}
              </div>
              <span className="stat-label">Dealer Rating</span>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          EDIT PROFILE FORM
      ══════════════════════════════════════════ */}
      {isEditing && (
        <div className="profile-edit-card">
          <div className="profile-edit-header">
            <h2>Edit Profile</h2>
            <p>Update your dealer information</p>
          </div>
          <form onSubmit={handleProfileSave} className="profile-edit-form">
            <div className="profile-form-grid">
              <div className="field">
                <label htmlFor="pf-name">Full Name *</label>
                <input
                  id="pf-name"
                  required
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="pf-username">Username *</label>
                <input
                  id="pf-username"
                  required
                  placeholder="yourhandle"
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="pf-phone">Phone Number</label>
                <input
                  id="pf-phone"
                  placeholder="+91 98765 43210"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="pf-location">Location</label>
                <input
                  id="pf-location"
                  placeholder="City, State"
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div className="field field--full">
                <label htmlFor="pf-bio">Bio</label>
                <textarea
                  id="pf-bio"
                  rows="3"
                  placeholder="Tell buyers about yourself and your dealership..."
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
            </div>
            <div className="profile-edit-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <span className="btn-loading">
                    <span className="spinner" /> Saving...
                  </span>
                ) : "Save Changes"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════
          TABS: Listings | Notifications
      ══════════════════════════════════════════ */}
      {!isEditing && (
        <>
          <div className="profile-tabs">
            <button
              className={`profile-tab ${activeTab === "listings" ? "profile-tab--active" : ""}`}
              onClick={() => setActiveTab("listings")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              My Listings
              <span className="tab-badge">{cars.length}</span>
            </button>
            <button
              className={`profile-tab ${activeTab === "notifications" ? "profile-tab--active" : ""}`}
              onClick={() => setActiveTab("notifications")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              Notifications
              {notifications.unreadCount > 0 && (
                <span className="tab-badge tab-badge--alert">{notifications.unreadCount}</span>
              )}
            </button>
          </div>

          {/* ── Listings Tab ── */}
          {activeTab === "listings" && (
            <div className="profile-section">
              {selectedCar && (
                <div className="profile-edit-car-panel">
                  <div className="edit-car-header">
                    <h3>Editing: {selectedCar.title}</h3>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setSelectedCar(null)}
                    >
                      ✕ Cancel Edit
                    </button>
                  </div>
                  <CarForm
                    key={selectedCar._id}
                    initialValues={selectedCar}
                    onSubmit={handleUpdateCar}
                    submitLabel="Update Listing"
                    hasExistingRC={Boolean(selectedCar.rcDocument?.publicId)}
                  />
                </div>
              )}

              {cars.length === 0 ? (
                <div className="profile-empty-state">
                  <div className="empty-icon">🚗</div>
                  <h3>No listings yet</h3>
                  <p>Start selling by adding your first car listing</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate("/add-car")}
                  >
                    + Add Your First Car
                  </button>
                </div>
              ) : (
                <div className="profile-listings-header">
                  <p className="listings-count">{cars.length} active listing{cars.length !== 1 ? "s" : ""}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn--sm"
                    onClick={() => navigate("/add-car")}
                  >
                    + Add Listing
                  </button>
                </div>
              )}

              <div className="grid car-grid">
                {cars.map((car) => (
                  <CarCard
                    key={car._id}
                    car={car}
                    adminActions={
                      <div className="car-card-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn--sm"
                          onClick={() => {
                            setSelectedCar(car);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          ✏ Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn--sm"
                          onClick={() => handleDelete(car._id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Notifications Tab ── */}
          {activeTab === "notifications" && (
            <div className="profile-section">
              {notifications.unreadCount > 0 ? (
                <p className="notif-summary">
                  You have <strong>{notifications.unreadCount}</strong> unread message{notifications.unreadCount !== 1 ? "s" : ""}
                </p>
              ) : null}

              {notifications.items?.length === 0 ? (
                <div className="profile-empty-state">
                  <div className="empty-icon">💬</div>
                  <h3>All caught up!</h3>
                  <p>No new message notifications</p>
                </div>
              ) : (
                <div className="notif-list">
                  {notifications.items?.map((item) => (
                    <div key={item._id} className="notif-card">
                      <div className="notif-card-inner">
                        <div className="notif-avatar">
                          {getInitials(item.senderName || "U")}
                        </div>
                        <div className="notif-body">
                          <div className="notif-title">{item.carTitle}</div>
                          <div className="notif-sender">From {item.senderName}</div>
                          <div className="notif-text">"{item.text}"</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-primary btn--sm notif-cta"
                        onClick={() => navigate(`/messages?thread=${item.threadId}`)}
                      >
                        Open Chat →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProfilePage;
