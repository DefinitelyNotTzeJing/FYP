import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import EditProfileTab from "../components/profile/EditProfileTab";
import ReviewsTab from "../components/tabs/ReviewsTab";
import ChangePasswordTab from "../components/profile/ChangePasswordTab";
import FaceRegisterTab from "../components/profile/FaceRegisterTab";
import { useProfile, useMyReviews } from "../hooks/useProfile";
import "../styles/profile/ProfilePage.css";

const TABS = [
  { key: "profile",  label: "Profile" },
  { key: "reviews",  label: "My Reviews" },
  { key: "password", label: "Change Password" },
  { key: "face",     label: "Face Login" },
];

export default function ProfilePage({ onNavigateHome, onNavigateToAuth, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews, initialTab = "profile" }) {
  const { user, token } = useAuth();
  const [tab, setTab]                   = useState(initialTab);
  const [pendingImage, setPendingImage] = useState(null);
  const fileRef = useRef();

  const { profile, loading: profileLoading, updateProfile } = useProfile(token);
  const { reviews, loading: reviewsLoading, refresh: refreshReviews } = useMyReviews(token);

  const savedAvatarUrl = profile?.profile?.profile_image_base64 || null;
  const avatarSrc      = pendingImage || savedAvatarUrl;
  const initials       = user?.username ? user.username.slice(0, 2).toUpperCase() : "?";

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
    const payload = { ...formData };
    if (pendingImage) payload.profile_image_base64 = pendingImage;
    await updateProfile(payload);
    setPendingImage(null);
  }

  return (
    <>
      <Navbar
        onLogoClick={onNavigateHome}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={() => {}}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
      />

      <div className="profile-page">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

        {/* Header */}
        <div className="profile-header">
          <div
            className="profile-avatar profile-avatar--clickable"
            onClick={handleAvatarClick}
            title="Click to change photo"
          >
            {avatarSrc
              ? <img src={avatarSrc} alt={user?.username} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              : initials
            }
            <div className="profile-avatar__overlay">📷</div>
          </div>
          <div className="profile-header__info">
            <div className="profile-header__name">{user?.username}</div>
            <div className="profile-header__email">{user?.email}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "0.25rem" }}>
              {pendingImage ? "New photo selected — save to apply" : "Click the photo to change it"}
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
        {tab === "profile"  && (profileLoading ? <div className="profile-loading">Loading profile…</div> : <EditProfileTab profile={profile} onSave={handleSave} pendingImage={pendingImage} />)}
        {tab === "reviews"  && <ReviewsTab reviews={reviews} loading={reviewsLoading} onRefresh={refreshReviews} />}
        {tab === "password" && <ChangePasswordTab />}
        {tab === "face"     && <FaceRegisterTab />}
      </div>
    </>
  );
}