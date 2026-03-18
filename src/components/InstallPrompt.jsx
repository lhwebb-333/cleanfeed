import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

export function InstallPrompt() {
  const { theme } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    try {
      if (sessionStorage.getItem("cleanfeed-install-dismissed")) {
        setDismissed(true);
        return;
      }
    } catch {}

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  async function handleInstall() {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try { sessionStorage.setItem("cleanfeed-install-dismissed", "1"); } catch {}
  }

  return (
    <div style={{
      position: "fixed", bottom: 12, left: 12, right: 12,
      maxWidth: 400, margin: "0 auto", zIndex: 100,
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.md,
      padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <p style={{
        fontFamily: theme.fonts.mono, fontSize: 10,
        color: theme.colors.textMuted, flex: 1,
        lineHeight: 1.4,
      }}>
        Add Clean Feed to your home screen for instant access
      </p>
      <button onClick={handleInstall} style={{
        fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: 700,
        padding: "5px 12px", background: theme.colors.textStrong,
        color: theme.colors.bg, border: "none", borderRadius: theme.radii.sm,
        cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.04em",
      }}>
        INSTALL
      </button>
      <button onClick={handleDismiss} style={{
        background: "none", border: "none", color: theme.colors.textGhost,
        cursor: "pointer", fontSize: 14, padding: "2px",
      }}>
        ×
      </button>
    </div>
  );
}
