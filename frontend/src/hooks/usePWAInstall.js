import { useState, useEffect } from "react";

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isInstalled, setIsInstalled]       = useState(false);

  // Detect mobile/tablet
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
    .test(navigator.userAgent);

  // Detect if already installed (running as standalone PWA)
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

  useEffect(() => {
    if (isStandalone) { setIsInstalled(true); return; }

    // Android/Chrome: capture the install prompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Detect successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [isStandalone]);

  async function promptInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
    setIsInstallable(false);
  }

  // iOS doesn't support beforeinstallprompt — show manual instructions instead
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return { isMobile, isInstallable, isInstalled, isStandalone, isIOS, promptInstall };
}