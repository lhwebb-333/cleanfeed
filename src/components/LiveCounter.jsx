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

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Live stats"
        style={{
          background: theme.colors.bg,
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.textMuted,
          fontSize: 9,
          cursor: "pointer",
          height: 22,
          padding: "0 6px",
          borderRadius: theme.radii.sm,
          fontFamily: theme.fonts.mono,
          display: "flex",
          alignItems: "center",
          gap: 4,
          transition: theme.transitions.fast,
        }}
      >
        <span style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#4CAF50",
          animation: "pulse 2s ease infinite",
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 8, letterSpacing: "0.03em" }}>
          {(stats.views.today || 0).toLocaleString()}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
          padding: "8px 10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          minWidth: 120,
          zIndex: 60,
        }}>
          <p style={{
            fontFamily: theme.fonts.mono, fontSize: 7, fontWeight: 700,
            color: theme.colors.textMuted, letterSpacing: "0.06em",
            marginBottom: 6, textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 5,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: "50%",
              background: "#4CAF50", flexShrink: 0,
            }} />
            Live
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { label: "Today", value: stats.views.today },
              { label: "Yesterday", value: stats.views.yesterday },
            ].map((row) => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 8, color: theme.colors.textFaint }}>{row.label}</span>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: 700, color: theme.colors.textStrong }}>
                  {(row.value || 0).toLocaleString()}
                </span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              borderTop: `1px solid ${theme.colors.border}`, paddingTop: 4,
            }}>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 8, color: theme.colors.textFaint }}>This week</span>
              <span style={{ fontFamily: theme.fonts.mono, fontSize: 10, fontWeight: 700, color: theme.colors.textStrong }}>
                {(stats.views.week || 0).toLocaleString()}
              </span>
            </div>
            {stats.subscribers > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textFaint }}>Subscribers</span>
                <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, fontWeight: 700, color: theme.colors.textStrong }}>
                  {stats.subscribers.toLocaleString()}
                </span>
              </div>
            )}
          </div>
          <p style={{
            fontFamily: theme.fonts.mono, fontSize: 6, color: theme.colors.textGhost,
            marginTop: 6, lineHeight: 1.4,
          }}>
            No cookies. No tracking. Just a counter.
          </p>
        </div>
      )}
    </div>
  );
}
