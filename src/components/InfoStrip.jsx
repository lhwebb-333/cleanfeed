import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../hooks/useTheme";

const API_BASE = import.meta.env.VITE_API_URL || "";
const WEATHER_REFRESH = 15 * 60 * 1000;
const LOC_KEY = "cleanfeed-weather-loc";
const UNIT_KEY = "cleanfeed-weather-unit";

function loadLoc() {
  try { return JSON.parse(localStorage.getItem(LOC_KEY)); } catch { return null; }
}
function saveLoc(c) {
  try { localStorage.setItem(LOC_KEY, JSON.stringify(c)); } catch {}
}
function getUnit() {
  try { return localStorage.getItem(UNIT_KEY) || "F"; } catch { return "F"; }
}
function toC(f) { return Math.round((f - 32) * 5 / 9); }

function weatherIcon(short) {
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

const ALERT_COLORS = { Extreme: "#D32F2F", Severe: "#EF5350", Moderate: "#FF8C00" };

export function InfoStrip() {
  const { theme } = useTheme();
  const [weather, setWeather] = useState(null);
  const [denied, setDenied] = useState(false);
  const [unit, setUnit] = useState(getUnit);

  const fetchWeather = useCallback(async (lat, lon) => {
    try {
      const res = await fetch(`${API_BASE}/api/weather?lat=${lat}&lon=${lon}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok) setWeather(data);
    } catch {}
  }, []);

  useEffect(() => {
    const saved = loadLoc();
    if (saved) { fetchWeather(saved.lat, saved.lon); return; }
    if (!navigator.geolocation) { setDenied(true); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        saveLoc(c);
        fetchWeather(c.lat, c.lon);
      },
      () => setDenied(true),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, [fetchWeather]);

  useEffect(() => {
    const saved = loadLoc();
    if (!saved) return;
    const i = setInterval(() => fetchWeather(saved.lat, saved.lon), WEATHER_REFRESH);
    return () => clearInterval(i);
  }, [fetchWeather]);

  function toggleUnit(e) {
    e.stopPropagation();
    const next = unit === "F" ? "C" : "F";
    setUnit(next);
    try { localStorage.setItem(UNIT_KEY, next); } catch {}
  }

  function displayTemp(f) {
    if (f == null) return "\u2014";
    return unit === "C" ? `${toC(f)}\u00B0C` : `${f}\u00B0F`;
  }

  if (denied || !weather) return null;

  const { location, current, alerts } = weather;
  const locationStr = [location.city, location.state].filter(Boolean).join(", ");
  const hasAlerts = alerts?.length > 0;

  return (
    <div style={{
      maxWidth: 960,
      margin: "0 auto",
      borderBottom: `1px solid ${theme.colors.border}`,
    }}>
      {hasAlerts && alerts.map((alert, i) => (
        <div key={i} style={{
          padding: "4px 24px",
          background: (ALERT_COLORS[alert.severity] || "#FF8C00") + "15",
          borderBottom: `1px solid ${theme.colors.border}`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          <span style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            fontWeight: 700,
            color: ALERT_COLORS[alert.severity] || "#FF8C00",
            letterSpacing: "0.04em",
          }}>
            {alert.event}
          </span>
          {alert.headline && (
            <span style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
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

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: `5px ${theme.spacing.lg}px`,
      }}>
        <span style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }}>
          {weatherIcon(current.short)}
        </span>
        <span
          onClick={toggleUnit}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 11,
            fontWeight: 700,
            color: theme.colors.textStrong,
            letterSpacing: "-0.02em",
            flexShrink: 0,
            cursor: "pointer",
          }}
          title="Toggle F/C"
        >
          {displayTemp(current.temp)}
        </span>
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
          {current.short}
        </span>
        <span style={{
          fontFamily: theme.fonts.mono,
          fontSize: 9,
          color: theme.colors.textFaint,
          flexShrink: 0,
        }}>
          {locationStr}
        </span>
      </div>
    </div>
  );
}
