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
  NHL: "#A2AAAD",
  NCAAM: "#FF6B00",
  NCAAF: "#FF6B00",
  EPL: "#3D195B",
  F1: "#E10600",
  PGA: "#00543E",
};

function leagueColor(league, fallback) {
  return LEAGUE_COLORS[league] || fallback;
}

export function DataBars() {
  const { theme } = useTheme();
  const [scores, setScores] = useState(null);
  const [markets, setMarkets] = useState(null);
  const [indicators, setIndicators] = useState([]);
  const [expandedLeague, setExpandedLeague] = useState(null); // click a league pill to expand
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
    color: theme.colors.textMuted,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    flexShrink: 0,
  };

  // Group games by league
  const gamesByLeague = {};
  for (const g of (scores?.games || [])) {
    if (!gamesByLeague[g.league]) gamesByLeague[g.league] = [];
    gamesByLeague[g.league].push(g);
  }

  // Preview: show league names with game counts
  const leaguePreview = Object.entries(gamesByLeague)
    .map(([league, games]) => {
      const live = games.filter((g) => g.isLive).length;
      return live > 0 ? `${league} (${live} live)` : league;
    })
    .join(" \u00B7 ");

  return (
    <div style={{
      maxWidth: 960,
      margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* SCORES bar */}
      {hasScores && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: `3px ${theme.spacing.lg}px`,
          borderBottom: `1px solid ${theme.colors.border}`,
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
          minHeight: 26,
        }}>
          <span style={labelStyle}>SCORES</span>
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
                  padding: "2px 6px",
                  borderRadius: theme.radii.sm,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  border: `1px solid ${isExpanded ? lc + "60" : theme.colors.border}`,
                  background: isExpanded ? lc + "15" : "transparent",
                  color: isExpanded ? lc : theme.colors.textMuted,
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  transition: theme.transitions.fast,
                }}
              >
                {league}
                {liveCount > 0 && (
                  <span style={{ fontSize: 6, color: "#4CAF50", fontWeight: 700 }}>LIVE</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* League games — expands RIGHT HERE between scores and markets */}
      {expandedLeague && gamesByLeague[expandedLeague] && (
        <div style={{
          padding: `3px ${theme.spacing.lg}px 5px`,
          borderBottom: `1px solid ${theme.colors.border}`,
          display: "flex",
          gap: 4,
          flexWrap: "wrap",
          alignItems: "center",
        }}>
          {gamesByLeague[expandedLeague].map((g) => (
            g.type === "golf" ? (
              <div key={g.id} style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                alignItems: "center",
                width: "100%",
              }}>
                <span style={{ color: theme.colors.textStrong, fontWeight: 700, fontSize: 10 }}>
                  {g.eventName}
                </span>
                <span style={{
                  fontSize: 7,
                  color: g.isLive ? "#4CAF50" : theme.colors.textGhost,
                  fontWeight: g.isLive ? 700 : 400,
                }}>
                  {g.isLive ? "LIVE" : g.isComplete ? "FINAL" : g.statusDetail}
                </span>
                {(g.leaderboard || []).map((p, i) => (
                  <span key={i} style={{
                    color: i < 3 ? theme.colors.textStrong : theme.colors.textMuted,
                    fontWeight: i < 3 ? 700 : 400,
                  }}>
                    {i + 1}. {p.name} ({p.score})
                  </span>
                ))}
              </div>
            ) : (
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
            )
          ))}
        </div>
      )}

      {/* MARKETS bar */}
      <div style={{ display: "flex", minHeight: 26 }} className="data-bars-row">
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
                color: theme.colors.textStrong,
                flexShrink: 0,
                display: "flex",
                alignItems: "baseline",
                gap: 3,
              }}>
                <span style={{ color: theme.colors.textMuted, fontSize: 8 }}>{idx.short}</span>
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
                <span style={{ color: theme.colors.textMuted, fontSize: 8 }}>{ind.label}</span>
                <span style={{ fontWeight: 700, color: theme.colors.textStrong, fontSize: 10 }}>
                  {formatIndicator(ind.value, ind.unit)}
                </span>
              </span>
            )))}
          </button>
        )}
      </div>

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
