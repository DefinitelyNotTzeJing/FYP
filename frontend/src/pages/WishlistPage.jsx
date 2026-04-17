import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import WishlistTab from "../components/tabs/WishlistTab";
import { useWishlist, useProfile } from "../hooks/useProfile";

export default function WishlistPage({ onNavigateHome, onNavigateToAuth, onNavigateToProfile, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews, onNavigateToPreorders, onNavigateToAdmin }) {
  const { token } = useAuth();
  const { items, loading, remove, clear } = useWishlist(token);
  const { profile } = useProfile(token);
  const profileImage = profile?.profile?.profile_image_base64 || null;

  return (
    <>
      <Navbar
        onLogoClick={onNavigateHome}
        onNavigateToAuth={onNavigateToAuth}
        onNavigateToProfile={onNavigateToProfile}
        onNavigateToWishlist={onNavigateToWishlist}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToCart={onNavigateToCart}
        onNavigateToReviews={onNavigateToReviews}
        onNavigateToPreorders={onNavigateToPreorders}
        onNavigateToAdmin={onNavigateToAdmin}
        wishlistCount={items.length}
        profileImage={profileImage}
        onNavigateHome={onNavigateHome}
      />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2.5rem 2rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          My Wishlist
        </h1>
        <WishlistTab items={items} loading={loading} onRemove={remove} onClear={clear} />
      </div>
    </>
  );
}