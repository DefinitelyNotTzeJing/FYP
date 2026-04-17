import { useState, useEffect, useRef } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import ProfilePage from "./pages/ProfilePage";
import WishlistPage from "./pages/WishlistPage";
import OrdersPage from "./pages/OrdersPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminPage from "./pages/admin/AdminPage";
import "./styles/global.css";
import PWAInstallBanner from "./components/common/PWAInstallBanner";

function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState("home");
  const [profileTab, setProfileTab] = useState("profile");
  const pageRef = useRef("home");
  const profileTabRef = useRef("profile");

  const navigateTo = (newPage, tab = null) => {
    // Use refs for current values instead of stale closure values
    if (newPage === pageRef.current && (tab === null || tab === profileTabRef.current)) return;

    window.history.pushState({ page: newPage, tab }, "", `#${newPage}`);
    if (tab) {
      setProfileTab(tab);
      profileTabRef.current = tab;
    }
    setPage(newPage);
    pageRef.current = newPage;
  };

  useEffect(() => {
    const handlePopState = (e) => {
      // If modal is open, let BookModal handle it
      if (e.state?.modal) return;

      const state = e.state;
      if (state?.page) {
        if (state.tab) setProfileTab(state.tab);
        setPage(state.page);
      } else {
        window.history.pushState({ page: "home" }, "", "#home");
        setPage("home");
      }
    };

    window.history.replaceState({ page: "home" }, "", "#home");

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (loading) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"var(--muted)", fontFamily:"var(--font-body)" }}>
        Loading…
      </div>
    );
  }

  if (user  && page === "auth") navigateTo("home");
  if (!user && ["profile","wishlist","orders","cart","reviews","admin"].includes(page)) navigateTo("home");

  const nav = {
    onNavigateHome:       () => navigateTo("home"),
    onNavigateToAuth:     () => navigateTo("auth"),
    onNavigateToProfile:  () => navigateTo("profile", "profile"),
    onNavigateToWishlist: () => navigateTo("wishlist"),
    onNavigateToOrders:   () => navigateTo("orders"),
    onNavigateToCart:     () => navigateTo("cart"),
    onNavigateToCheckout: () => navigateTo("checkout"),
    onNavigateToReviews:   () => navigateTo("profile", "reviews"),
    onNavigateToFaceLogin: () => navigateTo("profile", "face"),
    onNavigateToPreorders: () => navigateTo("profile", "preorders"),
    onNavigateToAdmin:    () => navigateTo("admin"),
  };

  if (page === "auth")     return <AuthPage     onNavigateHome={nav.onNavigateHome} />;
  if (page === "profile")  return <ProfilePage  {...nav} initialTab={profileTab} />;
  if (page === "wishlist") return <WishlistPage {...nav} />;
  if (page === "orders")   return <OrdersPage   {...nav} />;
  if (page === "cart")     return <CartPage     {...nav} />;
  if (page === "checkout") return <CheckoutPage {...nav} />;
  if (page === "admin")    return <AdminPage    {...nav} />;

  return <HomePage {...nav} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
      <PWAInstallBanner />
    </AuthProvider>
  );
}