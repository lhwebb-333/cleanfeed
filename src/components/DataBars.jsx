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

// League colors
const LEAGUE_COLORS = {
  NFL: "#013369",
  NBA: "#C9082A",
  MLB: "#002D72",
  NHL: "#000000",
  MLS: "#5F259F",
  EPL: "#3D195B",
  "La Liga": "#EE8707",
  "Serie A": "#024494",
  UCL: "#00194B",
  F1: "#E10600",
};

function leagueColor(league, fallback) {
  return LEAGUE_COLORS[league] || fallback;
}

export function DataBars() {
  const { theme } = useTheme();
  const [scores, setScores] = useState(null);
  const [markets, setMarkets] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [expandedLeague, setExpandedLeague] = useState(null); // which league is expanded
  const [marketsOpen, setMarketsOpen] = useState(false);

  useEffect(() => {
    let c = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/scores`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.ok && !c) setScores(data);
      } catch {}
    }
    load();
    const i = setInterval(load, SCORES_REFRESH);
    return () => { c = true; clearInterval(i); };
  }, []);

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

  // Preview: first 3 completed/live
  const previewGames = (scores?.games || []).slice(0, 3);
  const scorePreview = previewGames.map((g) => {
    if (g.isComplete || g.isLive) {
      return `${g.away.abbrev} ${g.away.score}-${g.home.score} ${g.home.abbrev}`;
    }
    return `${g.away.abbrev} vs ${g.home.abbrev}`;
  }).join(" \u00B7 ");

  // Group games by league for expanded view
  const gamesByLeague = {};
  for (const g of (scores?.games || [])) {
    if (!gamesByLeague[g.league]) gamesByLeague[g.league] = [];
    gamesByLeague[g.league].push(g);
  }

  return (
    <div style={{
      maxWidth: 960,
      margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* Two bars side by side */}
      <div style={{ display: "flex", minHeight: 26 }}>
        {/* SCORES bar */}
        {hasScores && (
          <button
            onClick={() => setScoresOpen(!scoresOpen)}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: `3px ${theme.spacing.lg}px`,
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
            }}>▸</span>
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
              padding: `3px ${theme.spacing.lg}px`,
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
            }}>▸</span>
            <span style={labelStyle}>MARKETS</span>
            {/* Preview: show indicators if no market data, otherwise show indices */}
            {hasMarkets ? (markets.indices.slice(0, 3).map((idx) => (
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
                  {dirArrow(idx.direction)}{idx.changePct != null ? ` ${Math.abs(idx.changePct).toFixed(1)}%` : ""}
                </span>
              </span>
            ))) : (indicators.slice(0, 3).map((ind) => (
              <span key={ind.key} style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                flexShrink: 0,
                display: "flex",
                alignItems: "baseline",
                gap: 3,
              }}>
                <span style={{ color: theme.colors.textGhost, fontSize: 8 }}>{ind.label}</span>
                <span style={{ fontWeight: 700, color: theme.colors.textStrong, fontSize: 10 }}>
                  {formatIndicator(ind.value, ind.unit)}
                </span>
              </span>
            )))}
          </button>
        )}
      </div>

      {/* SCORES expanded — league pills, click one to expand its games */}
      {scoresOpen && hasScores && (
        <div style={{
          padding: `4px ${theme.spacing.lg}px 6px`,
          borderTop: `1px solid ${theme.colors.border}`,
        }}>
          {/* League pills row */}
          <div style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            marginBottom: expandedLeague ? 4 : 0,
          }}>
            {Object.entries(gamesByLeague).map(([league, games]) => {
              const liveCount = games.filter((g) => g.isLive).length;
              const isExpanded = expandedLeague === league;
              const lc = leagueColor(league, theme.colors.textFaint);
              return (
                <button
                  key={league}
                  onClick={() => setExpandedLeague(isExpanded ? null : league)}
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 8,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    letterSpacing: "0.04em",
                    border: `1px solid ${isExpanded ? lc + "60" : theme.colors.border}`,
                    background: isExpanded ? lc + "15" : "transparent",
                    color: isExpanded ? lc : theme.colors.textFaint,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    transition: theme.transitions.fast,
                  }}
                >
                  {league}
                  <span style={{ fontSize: 7, opacity: 0.6 }}>{games.length}</span>
                  {liveCount > 0 && (
                    <span style={{ fontSize: 6, color: "#4CAF50", fontWeight: 700 }}>LIVE</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Expanded league games */}
          {expandedLeague && gamesByLeague[expandedLeague] && (
            <div style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              alignItems: "center",
            }}>
              {gamesByLeague[expandedLeague].map((g) => (
                <span key={g.id} style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 9,
                  color: theme.colors.textMuted,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  padding: "1px 6px",
                  background: g.isLive ? "#4CAF50" + "0C" : "transparent",
                  borderRadius: 2,
                }}>
                  <span style={{
                    fontWeight: g.away.winner ? 700 : 400,
                    color: g.away.winner ? theme.colors.textStrong : undefined,
                  }}>
                    {g.away.abbrev}
                  </span>
                  <span style={{ color: theme.colors.textGhost }}>
                    {g.away.score != null ? g.away.score : ""}-{g.home.score != null ? g.home.score : ""}
                  </span>
                  <span style={{
                    fontWeight: g.home.winner ? 700 : 400,
                    color: g.home.winner ? theme.colors.textStrong : undefined,
                  }}>
                    {g.home.abbrev}
                  </span>
                  <span style={{
                    fontSize: 7,
                    color: g.isLive ? "#4CAF50" : theme.colors.textGhost,
                    fontWeight: g.isLive ? 700 : 400,
                  }}>
                    {g.isLive ? "LIVE" : g.isComplete ? "F" : g.statusDetail}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MARKETS expanded */}
      {marketsOpen && (
        <div style={{
          padding: `4px ${theme.spacing.lg}px 6px`,
          borderTop: `1px solid ${theme.colors.border}`,
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "baseline",
        }}>
          {hasMarkets && markets.indices.map((idx) => (
            <span key={idx.symbol} style={{
              fontFamily: theme.fonts.mono,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 4,
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
              fontFamily: theme.fonts.mono,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 3,
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
            </span>
          ))}
          {hasMarkets && markets.marketState && (
            <span style={{
              fontFamily: theme.fonts.mono,
              fontSize: 7,
              color: markets.marketState === "REGULAR" ? "#4CAF50" : theme.colors.textGhost,
              fontWeight: 700,
            }}>
              {markets.marketState === "REGULAR" ? "OPEN" : markets.marketState === "PRE" ? "PRE-MKT" : markets.marketState === "POST" ? "AFTER-HRS" : "CLOSED"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
