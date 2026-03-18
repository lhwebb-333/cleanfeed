import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";

const API_BASE = import.meta.env.VITE_API_URL || "";
const LOC_KEY = "cleanfeed-weather-loc";
const UNIT_KEY = "cleanfeed-weather-unit";

function loadLoc() { try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch { return null; } }
function saveLoc(c) { try { localStorage.setItem(LOC_KEY, JSON.stringify(c)); } catch {} }
function getUnit() { try { return localStorage.getItem(UNIT_KEY) || "F"; } catch { return "F"; } }
function toC(f) { return Math.round((f - 32) * 5 / 9); }
function wxIcon(short) {
  if (!short) return "";
  const s = short.toLowerCase();
  if (s.includes("snow") || s.includes("blizzard")) return "\u2744";
  if (s.includes("thunder") || s.includes("storm")) return "\u26A1";
  if (s.includes("rain") || s.includes("shower") || s.includes("drizzle")) return "\u2602";
  if (s.includes("fog") || s.includes("haze") || s.includes("mist")) return "\u2601";
  if (s.includes("cloud") || s.includes("overcast")) return "\u2601";
  if (s.includes("partly")) return "\u26C5";
  if (s.includes("sunny") || s.includes("clear")) return "\u2600";
  return "\u2600";
}

export function Header({ lastUpdated, refreshing, onRefresh, mode, onToggleTheme, onAbout, searchQuery, onSearchChange, onDetectState }) {
  const { theme } = useTheme();
  const [weather, setWeather] = useState(null);
  const [unit, setUnit] = useState(getUnit);
  const [forecastOpen, setForecastOpen] = useState(false);

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) {
        setWeather(data);
        // Auto-detect state from weather location
        if (data.location?.state && data.source === "nws" && onDetectState) {
          onDetectState(data.location.state);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    const saved = loadLoc();
    if (saved) { fetchWeather(saved.lat, saved.lon); return; }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c = { lat: pos.coords.latitude, lon: pos.coords.longitude }; saveLoc(c); fetchWeather(c.lat, c.lon); },
      () => {},
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchWeather]);

  useEffect(() => {
    const saved = loadLoc();
    if (!saved) return;
    const i = setInterval(() => fetchWeather(saved.lat, saved.lon), 15 * 60 * 1000);
    return () => clearInterval(i);
  }, [fetchWeather]);

  function toggleUnit() {
    const next = unit === "F" ? "C" : "F";
    setUnit(next);
    try { localStorage.setItem(UNIT_KEY, next); } catch {}
  }

  function displayTemp(f) {
    if (f == null) return "";
    return unit === "C" ? `${toC(f)}\u00B0C` : `${f}\u00B0F`;
  }

  return (
    <header
      style={{
        padding: `${theme.spacing.xl}px ${theme.spacing.lg}px ${theme.spacing.md}px`,
        maxWidth: 960,
        margin: "0 auto",
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      {/* Utility buttons — fixed top-right corner */}
      <div style={{
        position: "fixed", top: 8, right: 12, zIndex: 50,
        display: "flex", gap: 3, alignItems: "center",
      }}>
        {[
          { label: "?", onClick: onAbout },
          { label: mode === "light" ? "\u2600" : "\u263E", onClick: onToggleTheme, color: mode === "light" ? "#FF8C00" : "#888" },
          { label: "\u21BB", onClick: onRefresh, disabled: refreshing, spin: refreshing },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            disabled={btn.disabled}
            style={{
              background: theme.colors.bg,
              border: `1px solid ${theme.colors.border}`,
              color: btn.color || theme.colors.textMuted,
              fontSize: 10,
              cursor: btn.disabled ? "default" : "pointer",
              width: 22,
              height: 22,
              borderRadius: theme.radii.sm,
              fontFamily: theme.fonts.mono,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: btn.disabled ? 0.5 : 1,
              transition: theme.transitions.fast,
            }}
          >
            <span style={{
              display: "inline-block",
              animation: btn.spin ? "spin 1s linear infinite" : "none",
            }}>{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Centered header */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: theme.colors.textStrong,
          }}
        >
          CLEAN FEED
        </h1>
        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 13,
            color: theme.colors.textFaint,
            fontStyle: "italic",
            marginTop: 3,
          }}
        >
          News with nothing else.
        </p>
      </div>

      {/* Search + timestamp row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
        }}
      >
        <div style={{ position: "relative", flex: 1, maxWidth: 180 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            style={{
              width: "100%",
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              padding: searchQuery ? "2px 20px 2px 6px" : "2px 6px",
              background: theme.colors.surface,
              border: `1px solid ${searchQuery ? theme.colors.textMuted : theme.colors.border}`,
              borderRadius: theme.radii.sm,
              color: theme.colors.text,
              outline: "none",
              transition: theme.transitions.fast,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: theme.colors.textMuted,
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
                padding: "2px 4px",
              }}
            >
              x
            </button>
          )}
        </div>

        {lastUpdated && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            style={{
              background: "none",
              border: "none",
              cursor: refreshing ? "default" : "pointer",
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              color: theme.colors.textFaint,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              opacity: refreshing ? 0.5 : 1,
              transition: theme.transitions.fast,
              whiteSpace: "nowrap",
            }}
            title="Click to refresh"
          >
            Updated {timeAgo(lastUpdated.toISOString())} ↻
          </button>
        )}

        {/* Weather inline — click to toggle 3-day forecast */}
        {weather && (
          <button
            onClick={() => setForecastOpen(!forecastOpen)}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              marginLeft: "auto", flexShrink: 0,
              background: "none", border: "none", cursor: "pointer", padding: 0,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1 }}>{wxIcon(weather.current.short)}</span>
            <span
              onClick={(e) => { e.stopPropagation(); toggleUnit(); }}
              style={{
                fontFamily: theme.fonts.mono, fontSize: 12, fontWeight: 700,
                color: theme.colors.textStrong, cursor: "pointer",
                letterSpacing: "-0.02em",
              }}
              title="Toggle F/C"
            >
              {displayTemp(weather.current.temp)}
            </span>
            <span style={{
              fontFamily: theme.fonts.mono, fontSize: 9,
              color: theme.colors.textMuted,
            }}>
              {weather.location.city}
            </span>
            <span style={{
              fontSize: 7, color: theme.colors.textGhost,
              transform: forecastOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}>▸</span>
          </button>
        )}
      </div>

      {/* 3-day forecast dropdown */}
      {forecastOpen && weather?.upcoming?.length > 0 && (
        <div style={{
          display: "flex", gap: 10, marginTop: 8,
          overflowX: "auto", scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}>
          {weather.upcoming.filter((p) => p.isDaytime).slice(0, 3).map((p, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: theme.fonts.mono, flexShrink: 0,
            }}>
              <span style={{ fontSize: 8, color: theme.colors.textFaint }}>{p.name?.slice(0, 3)}</span>
              <span style={{ fontSize: 9, lineHeight: 1 }}>{wxIcon(p.short)}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: theme.colors.textStrong }}>
                {displayTemp(p.temp)}
              </span>
              <span style={{ fontSize: 7, color: theme.colors.textGhost }}>{p.short}</span>
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
