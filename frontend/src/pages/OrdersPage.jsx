import { useAuth } from "../context/AuthContext";
import Navbar from "../components/nav/Navbar";
import OrdersTab from "../components/tabs/OrdersTab";
import { useOrders } from "../hooks/useProfile";

export default function OrdersPage({ onNavigateHome, onNavigateToAuth, onNavigateToProfile, onNavigateToWishlist, onNavigateToOrders, onNavigateToCart, onNavigateToReviews }) {
  const { token } = useAuth();
  const { orders, loading } = useOrders(token);

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
      />
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "2.5rem 2rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", fontWeight: 600, marginBottom: "1.5rem" }}>
          My Orders
        </h1>
        <OrdersTab orders={orders} loading={loading} />
      </div>
    </>
  );
}