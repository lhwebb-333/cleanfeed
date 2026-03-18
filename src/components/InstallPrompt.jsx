import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const DISMISSED_KEY = "cleanfeed-install-dismissed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function InstallPrompt() {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [nativePrompt, setNativePrompt] = useState(null);

  useEffect(() => {
    // Already installed — never show
    if (isStandalone()) return;
    // Already dismissed
    try { if (localStorage.getItem(DISMISSED_KEY) === "1") return; } catch {}
    setVisible(true);

    const handler = (e) => { e.preventDefault(); setNativePrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  function handleDismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISSED_KEY, "1"); } catch {}
  }

  async function handleNativeInstall() {
    if (!nativePrompt) return;
    nativePrompt.prompt();
    const result = await nativePrompt.userChoice;
    if (result.outcome === "accepted") handleDismiss();
  }

  return (
    <div style={{
      position: "fixed", bottom: 12, left: 12, right: 12,
      maxWidth: 380, margin: "0 auto", zIndex: 100,
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.md,
      padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{
          fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: 700,
          color: theme.colors.textStrong, marginBottom: 3,
        }}>
          Install Clean Feed
        </p>
        {nativePrompt ? (
          <button onClick={handleNativeInstall} style={{
            fontFamily: theme.fonts.mono, fontSize: 9, fontWeight: 700,
            padding: "4px 12px", background: theme.colors.textStrong,
            color: theme.colors.bg, border: "none", borderRadius: theme.radii.sm,
            cursor: "pointer", letterSpacing: "0.04em",
          }}>
            INSTALL
          </button>
        ) : (
          <p style={{
            fontFamily: theme.fonts.mono, fontSize: 9,
            color: theme.colors.textMuted, lineHeight: 1.4,
          }}>
            {isIOS()
              ? "Tap the share button \u23CE then \"Add to Home Screen\""
              : "Tap \u22EE menu \u2192 \"Install app\" or \"Add to Home Screen\""
            }
          </p>
        )}
      </div>
      <button onClick={handleDismiss} style={{
        background: "none", border: "none", color: theme.colors.textGhost,
        cursor: "pointer", fontSize: 16, padding: "4px", lineHeight: 1,
        flexShrink: 0,
      }}>
        \u00D7
      </button>
    </div>
  );
}
