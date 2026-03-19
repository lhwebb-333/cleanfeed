import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const S = 6; // uniform font size for everything

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

  const row = (label, value) => `
    <div style="display:flex;justify-content:space-between;gap:8px;">
      <span style="color:${theme.colors.textFaint}">${label}</span>
      <span style="color:${theme.colors.textStrong};font-weight:700">${(value || 0).toLocaleString()}</span>
    </div>`;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        title="Live stats"
        style={{
          background: theme.colors.bg,
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.textMuted,
          cursor: "pointer",
          height: 14,
          padding: "0 3px",
          borderRadius: theme.radii.sm,
          fontFamily: theme.fonts.mono,
          fontSize: S,
          display: "flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span style={{
          width: 3, height: 3, borderRadius: "50%",
          background: "#4CAF50",
          animation: "pulse 2s ease infinite",
        }} />
        {(stats.views.today || 0).toLocaleString()}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 3px)", left: 0,
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.sm,
          padding: "3px 5px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          zIndex: 60,
          fontFamily: theme.fonts.mono,
          fontSize: S,
          lineHeight: 1.6,
          whiteSpace: "nowrap",
        }}
          dangerouslySetInnerHTML={{ __html:
            row("Today", stats.views.today) +
            row("Yesterday", stats.views.yesterday) +
            `<div style="border-top:1px solid ${theme.colors.border};margin:2px 0"></div>` +
            row("Week", stats.views.week) +
            (stats.subscribers > 0 ? row("Subs", stats.subscribers) : "")
          }}
        />
      )}
    </div>
  );
}
