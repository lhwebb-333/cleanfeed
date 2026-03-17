import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const REFRESH_INTERVAL = 15 * 60 * 1000;
const LOC_STORAGE_KEY = "cleanfeed-weather-loc";
const UNIT_STORAGE_KEY = "cleanfeed-weather-unit";

function loadSavedLocation() {
  try { return JSON.parse(localStorage.getItem(LOC_STORAGE_KEY)); } catch { return null; }
}

function saveLocation(coords) {
  try { localStorage.setItem(LOC_STORAGE_KEY, JSON.stringify(coords)); } catch {}
}

function getSavedUnit() {
  try { return localStorage.getItem(UNIT_STORAGE_KEY) || "F"; } catch { return "F"; }
}

function toC(f) {
  return Math.round((f - 32) * 5 / 9);
}

// Simple text-based weather icon from NWS shortForecast
function weatherIcon(short) {
  if (!short) return "";
  const s = short.toLowerCase();
  if (s.includes("snow") || s.includes("blizzard")) return "\u2744"; // snowflake
  if (s.includes("thunder") || s.includes("storm")) return "\u26A1"; // lightning
  if (s.includes("rain") || s.includes("shower") || s.includes("drizzle")) return "\u2602"; // umbrella
  if (s.includes("fog") || s.includes("haze") || s.includes("mist")) return "\u2601"; // cloud
  if (s.includes("cloud") || s.includes("overcast")) return "\u2601"; // cloud
  if (s.includes("partly")) return "\u26C5"; // sun behind cloud
  if (s.includes("wind")) return "\u2B06"; // wind arrow
  if (s.includes("sunny") || s.includes("clear")) return "\u2600"; // sun
  return "\u2600";
}

const SEVERITY_COLORS = {
  Extreme: "#D32F2F",
  Severe: "#EF5350",
  Moderate: "#FF8C00",
};

export function WeatherBar() {
  const { theme } = useTheme();
  const [weather, setWeather] = useState(null);
  const [denied, setDenied] = useState(false);
  const [unit, setUnit] = useState(getSavedUnit);
  const [expanded, setExpanded] = useState(false);

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) setWeather(data);
    } catch {}
  }, []);

  const requestLocation = useCallback(() => {
    const saved = loadSavedLocation();
    if (saved) { fetchWeather(saved.lat, saved.lon); return; }
    if (!navigator.geolocation) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLocation(coords);
        fetchWeather(coords.lat, coords.lon);
      },
      () => setDenied(true),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchWeather]);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  useEffect(() => {
    const saved = loadSavedLocation();
    if (!saved) return;
    const interval = setInterval(() => fetchWeather(saved.lat, saved.lon), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchWeather]);

  function toggleUnit() {
    const next = unit === "F" ? "C" : "F";
    setUnit(next);
    try { localStorage.setItem(UNIT_STORAGE_KEY, next); } catch {}
  }

  function displayTemp(f) {
    if (f == null) return "\u2014";
    return unit === "C" ? `${toC(f)}°C` : `${f}°F`;
  }

  if (denied || !weather) return null;

  const { location, current, today, upcoming, alerts } = weather;
  const locationStr = [location.city, location.state].filter(Boolean).join(", ");
  const hasAlerts = alerts && alerts.length > 0;
  const icon = weatherIcon(current.short);

  return (
    <div style={{
      maxWidth: 960,
      margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {/* Alert banner */}
      {hasAlerts && alerts.map((alert, i) => (
        <div key={i} style={{
          padding: "5px 24px",
          background: (SEVERITY_COLORS[alert.severity] || "#FF8C00") + "15",
          borderBottom: `1px solid ${theme.colors.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            fontWeight: 700,
            color: SEVERITY_COLORS[alert.severity] || "#FF8C00",
            letterSpacing: "0.04em",
          }}>
            {alert.event}
          </span>
          {alert.headline && (
            <span style={{
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              color: theme.colors.textMuted,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {alert.headline}
            </span>
          )}
        </div>
      ))}

      {/* Compact weather line */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          padding: `6px ${theme.spacing.lg}px`,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {/* Icon */}
        <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{icon}</span>

        {/* Temp — clickable to toggle F/C */}
        <span
          onClick={(e) => { e.stopPropagation(); toggleUnit(); }}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 12,
            fontWeight: 700,
            color: theme.colors.textStrong,
            letterSpacing: "-0.02em",
            flexShrink: 0,
            cursor: "pointer",
          }}
          title="Click to toggle F/C"
        >
          {displayTemp(current.temp)}
        </span>

        {/* Short forecast */}
        <span style={{
          fontFamily: theme.fonts.mono,
          fontSize: 10,
          color: theme.colors.textMuted,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          flex: 1,
          minWidth: 0,
        }}>
          {current.short}
        </span>

        {/* Location */}
        <span style={{
          fontFamily: theme.fonts.mono,
          fontSize: 9,
          color: theme.colors.textGhost,
          flexShrink: 0,
        }}>
          {locationStr}
        </span>

        {/* Expand arrow */}
        <span style={{
          fontSize: 9,
          color: theme.colors.textGhost,
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          transition: theme.transitions.fast,
          flexShrink: 0,
        }}>
          ▸
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: `0 ${theme.spacing.lg}px 10px`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}>
          {/* Today detail */}
          {today.detail && (
            <p style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.5,
              color: theme.colors.textMuted,
              margin: 0,
            }}>
              {today.detail}
            </p>
          )}

          {/* Upcoming days — horizontal scroll */}
          {upcoming.length > 0 && (
            <div style={{
              display: "flex",
              gap: 16,
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
              paddingTop: 2,
            }}>
              {upcoming.filter((p) => p.isDaytime).map((p, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                  flexShrink: 0,
                  minWidth: 56,
                }}>
                  <span style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 9,
                    color: theme.colors.textFaint,
                  }}>
                    {p.name}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1 }}>
                    {weatherIcon(p.short)}
                  </span>
                  <span style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 11,
                    fontWeight: 700,
                    color: theme.colors.textStrong,
                  }}>
                    {displayTemp(p.temp)}
                  </span>
                  <span style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 9,
                    color: theme.colors.textMuted,
                    textAlign: "center",
                    maxWidth: 70,
                  }}>
                    {p.short}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
