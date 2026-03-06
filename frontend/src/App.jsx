import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import WishlistPage from "./pages/WishlistPage";
import OrdersPage from "./pages/OrdersPage";
import CartPage from "./pages/CartPage";
import "./styles/global.css";

function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage]       = useState("home");
  const [profileTab, setProfileTab] = useState("profile");

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"var(--muted)", fontFamily:"var(--font-body)" }}>
        Loading…
      </div>
    );
  }

  if (user  && page === "auth") setPage("home");
  if (!user && ["profile","wishlist","orders","cart","reviews"].includes(page)) setPage("home");

  const nav = {
    onNavigateHome:       () => setPage("home"),
    onNavigateToAuth:     () => setPage("auth"),
    onNavigateToProfile:  () => { setProfileTab("profile"); setPage("profile"); },
    onNavigateToWishlist: () => setPage("wishlist"),
    onNavigateToOrders:   () => setPage("orders"),
    onNavigateToCart:     () => setPage("cart"),
    onNavigateToReviews:  () => { setProfileTab("reviews"); setPage("profile"); },
  };

  if (page === "auth")     return <AuthPage     onNavigateHome={nav.onNavigateHome} />;
  if (page === "profile")  return <ProfilePage  {...nav} initialTab={profileTab} />;
  if (page === "wishlist") return <WishlistPage {...nav} />;
  if (page === "orders")   return <OrdersPage   {...nav} />;
  if (page === "cart")     return <CartPage     {...nav} />;

  return <HomePage {...nav} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}