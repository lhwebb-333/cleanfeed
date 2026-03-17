import { useState, useEffect } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const SCORES_REFRESH = 2 * 60 * 1000;
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
  const [scores, setScores] = useState(null);
  const [markets, setMarkets] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [marketsOpen, setMarketsOpen] = useState(false);

  // Fetch scores
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/scores`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !cancelled) setScores(data);
      } catch {}
    }
    load();
    const i = setInterval(load, SCORES_REFRESH);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // Fetch markets
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/markets`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !cancelled) setMarkets(data);
      } catch {}
    }
    load();
    const i = setInterval(load, MARKETS_REFRESH);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  // Fetch indicators
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/financial-indicators`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !cancelled) setIndicators(data.indicators || []);
      } catch {}
    }
    load();
    const i = setInterval(load, INDICATORS_REFRESH);
    return () => { cancelled = true; clearInterval(i); };
  }, []);

  const hasScores = scores?.games?.length > 0;
  const hasMarkets = markets?.indices?.length > 0;
  const hasIndicators = indicators.length > 0;

  if (!hasScores && !hasMarkets && !hasIndicators) return null;

  const labelStyle = {
    fontFamily: theme.fonts.mono,
    fontSize: 8,
    fontWeight: 700,
    color: theme.colors.textGhost,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    flexShrink: 0,
  };

  // Build scores preview (first 3 completed/live games)
  const previewGames = (scores?.games || []).slice(0, 3);
  const scorePreview = previewGames.map((g) => {
    if (g.isComplete || g.isLive) {
      return `${g.away.abbrev} ${g.away.score}-${g.home.score} ${g.home.abbrev}`;
    }
    return `${g.away.abbrev} vs ${g.home.abbrev}`;
  }).join(" \u00B7 ");

  // Build markets preview (first 3 indices)
  const previewIndices = (markets?.indices || []).slice(0, 3);
  const mktPreview = previewIndices.map((idx) =>
    `${idx.short} ${formatPrice(idx.price)}`
  ).join(" \u00B7 ");

  return (
    <div style={{
      maxWidth: 960,
      margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* Two bars side by side */}
      <div style={{
        display: "flex",
        minHeight: 28,
      }}>
        {/* SCORES bar */}
        {hasScores && (
          <button
            onClick={() => setScoresOpen(!scoresOpen)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: `4px ${theme.spacing.lg}px`,
              background: "transparent",
              border: "none",
              borderRight: (hasMarkets || hasIndicators) ? `1px solid ${theme.colors.border}` : "none",
              cursor: "pointer",
              textAlign: "left",
              overflow: "hidden",
            }}
          >
            <span style={{
              ...labelStyle,
              transform: scoresOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: theme.transitions.fast,
              fontSize: 7,
            }}>
              ▸
            </span>
            <span style={labelStyle}>SCORES</span>
            <span style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              color: theme.colors.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
              minWidth: 0,
            }}>
              {scorePreview}
            </span>
            <span style={{
              fontFamily: theme.fonts.mono,
              fontSize: 8,
              color: theme.colors.textGhost,
              flexShrink: 0,
            }}>
              {scores.count}
            </span>
          </button>
        )}

        {/* MARKETS bar */}
        {(hasMarkets || hasIndicators) && (
          <button
            onClick={() => setMarketsOpen(!marketsOpen)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: `4px ${theme.spacing.lg}px`,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              overflow: "hidden",
            }}
          >
            <span style={{
              ...labelStyle,
              transform: marketsOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: theme.transitions.fast,
              fontSize: 7,
            }}>
              ▸
            </span>
            <span style={labelStyle}>MARKETS</span>
            {previewIndices.map((idx) => (
              <span key={idx.symbol} style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                color: theme.colors.textMuted,
                flexShrink: 0,
                display: "flex",
                alignItems: "baseline",
                gap: 3,
              }}>
                <span style={{ color: theme.colors.textGhost, fontSize: 8 }}>{idx.short}</span>
                <span style={{ fontWeight: 700, color: theme.colors.textStrong, fontSize: 10 }}>
                  {formatPrice(idx.price)}
                </span>
                <span style={{ fontSize: 7, color: dirColor(idx.direction) }}>
                  {dirArrow(idx.direction)} {idx.changePct != null ? `${Math.abs(idx.changePct).toFixed(1)}%` : ""}
                </span>
              </span>
            ))}
          </button>
        )}
      </div>

      {/* SCORES expanded */}
      {scoresOpen && hasScores && (
        <div style={{
          padding: `6px ${theme.spacing.lg}px 10px`,
          borderTop: `1px solid ${theme.colors.border}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
        }}>
          {scores.games.map((g) => (
            <div key={g.id} style={{
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              padding: "4px 10px",
              background: g.isLive ? "#4CAF50" + "10" : "transparent",
              border: `1px solid ${g.isLive ? "#4CAF50" + "30" : theme.colors.border}`,
              borderRadius: theme.radii.sm,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}>
              <span style={{ color: theme.colors.textGhost, fontSize: 8 }}>{g.league}</span>
              <span style={{
                color: g.away.winner ? theme.colors.textStrong : theme.colors.textMuted,
                fontWeight: g.away.winner ? 700 : 400,
              }}>
                {g.away.abbrev} {g.away.score != null ? g.away.score : ""}
              </span>
              <span style={{ color: theme.colors.textGhost, fontSize: 8 }}>-</span>
              <span style={{
                color: g.home.winner ? theme.colors.textStrong : theme.colors.textMuted,
                fontWeight: g.home.winner ? 700 : 400,
              }}>
                {g.home.score != null ? g.home.score : ""} {g.home.abbrev}
              </span>
              <span style={{ color: g.isLive ? "#4CAF50" : theme.colors.textGhost, fontSize: 8 }}>
                {g.isLive ? "LIVE" : g.isComplete ? "F" : g.statusDetail}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* MARKETS expanded */}
      {marketsOpen && (
        <div style={{
          padding: `6px ${theme.spacing.lg}px 10px`,
          borderTop: `1px solid ${theme.colors.border}`,
        }}>
          {/* Index quotes */}
          {hasMarkets && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: hasIndicators ? 8 : 0 }}>
              {markets.indices.map((idx) => (
                <div key={idx.symbol} style={{
                  fontFamily: theme.fonts.mono,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 5,
                }}>
                  <span style={{ fontSize: 9, color: theme.colors.textFaint }}>{idx.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: theme.colors.textStrong }}>
                    {formatPrice(idx.price)}
                  </span>
                  <span style={{ fontSize: 9, color: dirColor(idx.direction) }}>
                    {idx.change > 0 ? "+" : ""}{idx.change != null ? idx.change.toFixed(2) : ""} ({Math.abs(idx.changePct || 0).toFixed(1)}%)
                  </span>
                </div>
              ))}
              {markets.marketState && (
                <span style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 8,
                  color: theme.colors.textGhost,
                  alignSelf: "center",
                }}>
                  {markets.marketState === "REGULAR" ? "OPEN" : markets.marketState}
                </span>
              )}
            </div>
          )}

          {/* Macro indicators */}
          {hasIndicators && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {indicators.map((ind) => (
                <div key={ind.key} style={{
                  fontFamily: theme.fonts.mono,
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                }}>
                  <span style={{ fontSize: 8, color: theme.colors.textGhost }}>{ind.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: theme.colors.textStrong }}>
                    {formatIndicator(ind.value, ind.unit)}
                  </span>
                  {ind.direction !== "flat" && (
                    <span style={{ fontSize: 7, color: dirColor(ind.direction) }}>
                      {dirArrow(ind.direction)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
