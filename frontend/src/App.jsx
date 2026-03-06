import { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import "./styles/global.css";

function AppRoutes() {
  const { user, loading } = useAuth();
  const [page, setPage]   = useState("home"); // "home" | "auth"

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--muted)", fontFamily: "var(--font-body)" }}>
        Loading…
      </div>
    );
  }

  // If user just logged in via AuthPage, go home
  if (user && page === "auth") setPage("home");

  if (page === "auth") {
    return <AuthPage onNavigateHome={() => setPage("home")} />;
  }

  return <HomePage onNavigateToAuth={() => setPage("auth")} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}