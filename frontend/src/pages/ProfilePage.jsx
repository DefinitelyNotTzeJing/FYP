import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import EditProfileTab from "../components/profile/EditProfileTab";
import ReviewsTab from "../components/tabs/ReviewsTab";
import ChangePasswordTab from "../components/profile/ChangePasswordTab";
import { useProfile, useMyReviews } from "../hooks/useProfile";
import "../styles/profile/ProfilePage.css";

const TABS = [
  { key: "profile",  label: "Profile" },
  { key: "reviews",  label: "My Reviews" },
  { key: "password", label: "Change Password" },
];

export default function ProfilePage({ onNavigateHome, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews, initialTab = "profile" }) {
  const { user, token } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [pendingImage, setPendingImage] = useState(null);
  const fileRef = useRef();

  const { profile, loading: profileLoading, updateProfile } = useProfile(token);
  const { reviews, loading: reviewsLoading } = useMyReviews(token);

  const initials  = user?.username ? user.username.slice(0, 2).toUpperCase() : "?";
  const avatarUrl = pendingImage || profile?.profile?.profile_image_url || null;

  function handleAvatarClick() { fileRef.current.click(); }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPendingImage(ev.target.result);
    reader.readAsDataURL(file);
    setTab("profile");
  }

  async function handleSave(formData) {
    const payload = pendingImage
      ? { ...formData, profile_image_url: pendingImage }
      : formData;
    await updateProfile(payload);
    setPendingImage(null);
  }

  return (
    <>
      <Navbar
        onLogoClick={onNavigateHome}
        onNavigateToProfile={() => {}}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
      />

      <div className="profile-page">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

        {/* Clickable header avatar */}
        <div className="profile-header">
          <div
            className="profile-avatar profile-avatar--clickable"
            onClick={handleAvatarClick}
            title="Click to change photo"
          >
            {avatarUrl ? <img src={avatarUrl} alt={user?.username} /> : initials}
            <div className="profile-avatar__overlay">📷</div>
          </div>
          <div className="profile-header__info">
            <div className="profile-header__name">{user?.username}</div>
            <div className="profile-header__email">{user?.email}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              Click the photo to change it
            </div>
            {user?.is_admin && <div className="profile-header__badge">Admin</div>}
          </div>
        </div>

        {/* Tabs */}
        <div className="profile-tabs">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`profile-tab${tab === t.key ? " profile-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === "reviews" && reviews.length > 0 && (
                <span style={{ marginLeft: "0.4rem", background: "var(--accent)", color: "white", fontSize: "0.65rem", padding: "1px 6px", borderRadius: "10px" }}>
                  {reviews.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "profile" && (
          profileLoading
            ? <div className="profile-loading">Loading profile…</div>
            : <EditProfileTab profile={profile} onSave={handleSave} pendingImage={pendingImage} />
        )}
        {tab === "reviews"  && <ReviewsTab reviews={reviews} loading={reviewsLoading} />}
        {tab === "password" && <ChangePasswordTab />}
      </div>
    </>
  );
}