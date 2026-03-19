import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";

export function LiveCounter() {
  const { theme } = useTheme();
  const [stats, setStats] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/subscribe`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok) setStats(data);
      } catch {}
    }
    load();
    const i = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(i);
  }, []);

  if (!stats?.views) return null;

  const total = stats.views.today || 0;

  return (
    <div style={{ position: "relative", display: "inline-block", marginBottom: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          fontFamily: theme.fonts.mono, fontSize: 9,
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 8px",
          background: "transparent",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.sm,
          color: theme.colors.textFaint,
          cursor: "pointer",
          transition: theme.transitions.fast,
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#4CAF50",
          animation: "pulse 2s ease infinite",
          flexShrink: 0,
        }} />
        {total > 0 ? total.toLocaleString() : "0"} today
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
          padding: "10px 14px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          minWidth: 160,
          zIndex: 50,
        }}>
          <p style={{
            fontFamily: theme.fonts.mono, fontSize: 8, fontWeight: 700,
            color: theme.colors.textMuted, letterSpacing: "0.06em",
            marginBottom: 8, textTransform: "uppercase",
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#4CAF50", display: "inline-block",
              marginRight: 5, verticalAlign: "middle",
            }} />
            Live
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint }}>Today</span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, fontWeight: 700, color: theme.colors.textStrong }}>
                {(stats.views.today || 0).toLocaleString()}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint }}>Yesterday</span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, fontWeight: 700, color: theme.colors.textStrong }}>
                {(stats.views.yesterday || 0).toLocaleString()}
              </span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              borderTop: `1px solid ${theme.colors.border}`, paddingTop: 6,
            }}>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint }}>This week</span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, fontWeight: 700, color: theme.colors.textStrong }}>
                {(stats.views.week || 0).toLocaleString()}
              </span>
            </div>
            {stats.subscribers > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint }}>Subscribers</span>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 12, fontWeight: 700, color: theme.colors.textStrong }}>
                  {stats.subscribers.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <p style={{
            fontFamily: theme.fonts.mono, fontSize: 7, color: theme.colors.textGhost,
            marginTop: 8, lineHeight: 1.4,
          }}>
            No cookies. No tracking. Just a server-side counter.
          </p>
        </div>
      )}
    </div>
  );
}
