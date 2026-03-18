import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const MARKETS_REFRESH = 2 * 60 * 1000;
const INDICATORS_REFRESH = 5 * 60 * 1000;

function dirColor(d) {
  if (d === "up") return "#4CAF50";
  if (d === "down") return "#EF5350";
  return "#888";
}
function dirArrow(d) {
  if (d === "up") return "\u25B2";
  if (d === "down") return "\u25BC";
  return "";
}

function formatPrice(n) {
  if (n == null) return "\u2014";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function formatIndicator(value, unit) {
  if (value == null) return "\u2014";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return "\u2014";
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "K") return `${num.toFixed(0)}K`;
  return num.toFixed(2);
}

export function DataBars() {
  const { theme } = useTheme();
  const [markets, setMarkets] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [marketsOpen, setMarketsOpen] = useState(false);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/markets`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !c) setMarkets(data);
      } catch {}
    }
    load();
    const i = setInterval(load, MARKETS_REFRESH);
    return () => { c = true; clearInterval(i); };
  }, []);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/financial-indicators`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !c) setIndicators(data.indicators || []);
      } catch {}
    }
    load();
    const i = setInterval(load, INDICATORS_REFRESH);
    return () => { c = true; clearInterval(i); };
  }, []);

  const hasMarkets = markets?.indices?.length > 0;
  const hasIndicators = indicators.length > 0;

  if (!hasMarkets && !hasIndicators) return null;

  const labelStyle = {
    fontFamily: theme.fonts.mono, fontSize: 8, fontWeight: 700,
    color: theme.colors.textMuted, letterSpacing: "0.06em",
    textTransform: "uppercase", flexShrink: 0,
  };

  return (
    <div style={{
      maxWidth: 960, margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* MARKETS bar */}
      <button
        onClick={() => setMarketsOpen(!marketsOpen)}
        style={{
          display: "flex", alignItems: "center", gap: 8, width: "100%",
          padding: `3px ${theme.spacing.lg}px`, background: "transparent",
          border: "none", cursor: "pointer", textAlign: "left",
          overflow: "hidden", minHeight: 26,
        }}
      >
        <span style={{
          ...labelStyle, fontSize: 7,
          transform: marketsOpen ? "rotate(90deg)" : "rotate(0deg)",
          transition: theme.transitions.fast,
        }}>▸</span>
        <span style={labelStyle}>MARKETS</span>
        {hasMarkets && markets.indices.slice(0, 3).map((idx) => (
          <span key={idx.symbol} style={{
            fontFamily: theme.fonts.mono, fontSize: 9, color: theme.colors.textStrong,
            flexShrink: 0, display: "flex", alignItems: "baseline", gap: 3,
          }}>
            <span style={{ color: theme.colors.textMuted, fontSize: 8 }}>{idx.short}</span>
            <span style={{ fontWeight: 700, color: theme.colors.textStrong, fontSize: 10 }}>
              {formatPrice(idx.price)}
            </span>
            <span style={{ fontSize: 7, color: dirColor(idx.direction) }}>
              {dirArrow(idx.direction)}{idx.changePct != null ? ` ${Math.abs(idx.changePct).toFixed(1)}%` : ""}
            </span>
          </span>
        ))}
      </button>

      {/* MARKETS expanded */}
      {marketsOpen && (
        <div style={{
          padding: `4px ${theme.spacing.lg}px 6px`,
          borderTop: `1px solid ${theme.colors.border}`,
          display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline",
        }}>
          {hasMarkets && markets.indices.map((idx) => (
            <span key={idx.symbol} style={{
              fontFamily: theme.fonts.mono, display: "inline-flex", alignItems: "baseline", gap: 4,
            }}>
              <span style={{ fontSize: 8, color: theme.colors.textGhost }}>{idx.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.textStrong }}>
                {formatPrice(idx.price)}
              </span>
              <span style={{ fontSize: 8, color: dirColor(idx.direction) }}>
                {idx.change > 0 ? "+" : ""}{idx.change != null ? idx.change.toFixed(2) : ""} ({Math.abs(idx.changePct || 0).toFixed(1)}%)
              </span>
            </span>
          ))}
          {hasMarkets && hasIndicators && (
            <span style={{ width: 1, height: 10, background: theme.colors.border }} />
          )}
          {indicators.map((ind) => (
            <span key={ind.key} style={{
              fontFamily: theme.fonts.mono, display: "inline-flex", alignItems: "baseline", gap: 3,
            }}>
              <span style={{ fontSize: 8, color: theme.colors.textGhost }}>{ind.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.textStrong }}>
                {formatIndicator(ind.value, ind.unit)}
              </span>
              {ind.direction !== "flat" && (
                <span style={{ fontSize: 7, color: dirColor(ind.direction) }}>{dirArrow(ind.direction)}</span>
              )}
            </span>
          ))}
          {hasMarkets && markets.marketState && (
            <span style={{
              fontFamily: theme.fonts.mono, fontSize: 7, fontWeight: 700,
              color: markets.marketState === "REGULAR" ? "#4CAF50" : theme.colors.textGhost,
            }}>
              {markets.marketState === "REGULAR" ? "OPEN" : markets.marketState === "PRE" ? "PRE-MKT" : markets.marketState === "POST" ? "AFTER-HRS" : "CLOSED"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
