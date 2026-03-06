import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import WishlistTab from "../components/tabs/WishlistTab";
import { useWishlist } from "../hooks/useProfile";

export default function WishlistPage({ onNavigateHome, onNavigateToAuth, onNavigateToProfile, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews }) {
  const { token } = useAuth();
  const { items, loading, remove, clear } = useWishlist(token);

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
        wishlistCount={items.length}
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