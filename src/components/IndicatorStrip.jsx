import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

function formatValue(value, unit) {
  if (value == null) return "—";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return "—";
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "K") return `${num.toFixed(0)}K`;
  return num.toFixed(2);
}

function directionArrow(direction) {
  if (direction === "up") return "\u25B2";
  if (direction === "down") return "\u25BC";
  return "";
}

function directionColor(direction) {
  if (direction === "up") return "#4CAF50";
  if (direction === "down") return "#EF5350";
  return "#888";
}

export function IndicatorStrip() {
  const { theme } = useTheme();
  const [indicators, setIndicators] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchIndicators() {
      try {
        const res = await fetch(`${API_BASE}/api/financial-indicators`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !cancelled) {
          setIndicators(data.indicators || []);
          setLoaded(true);
        }
      } catch {
        // Silent fail — strip just doesn't show
      }
    }

    fetchIndicators();
    const interval = setInterval(fetchIndicators, REFRESH_INTERVAL);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (!loaded || indicators.length === 0) return null;

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "0 auto",
        padding: `6px ${theme.spacing.lg}px`,
        borderBottom: `1px solid ${theme.colors.border}`,
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 20,
          alignItems: "center",
          minWidth: "max-content",
        }}
      >
        <span
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            color: theme.colors.textGhost,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          INDICATORS
        </span>
        {indicators.map((ind) => (
          <div
            key={ind.key}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                color: theme.colors.textFaint,
                letterSpacing: "0.03em",
              }}
            >
              {ind.label}
            </span>
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 12,
                fontWeight: 700,
                color: theme.colors.textStrong,
                letterSpacing: "-0.02em",
              }}
            >
              {formatValue(ind.value, ind.unit)}
            </span>
            {ind.direction !== "flat" && (
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 8,
                  color: directionColor(ind.direction),
                }}
              >
                {directionArrow(ind.direction)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
