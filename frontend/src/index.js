import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Optional: Import global styles
// import "./index.css";

// Get root element from index.html
const container = document.getElementById("root");

// Create React root
const root = createRoot(container);

// Render App component
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then(() => console.log("Service worker registered"))
      .catch((err) => console.log("Service worker failed:", err));
  });
}