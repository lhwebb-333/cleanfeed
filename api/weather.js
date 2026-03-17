// Weather endpoint — NWS API (free, no key needed)
// Flow: lat,lon → /points → forecast + alerts
// User-Agent required by NWS

const NWS_BASE = "https://api.weather.gov";
const USER_AGENT = "CleanFeed/1.0 (contact@thecleanfeed.app)";

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 min

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

async function nwsFetch(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}: ${url}`);
  return res.json();
}

export default async function handler(req, res) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ ok: false, error: "lat and lon required" });
    }

    // Round to 4 decimals for cache key (NWS precision)
    const rlat = parseFloat(lat).toFixed(4);
    const rlon = parseFloat(lon).toFixed(4);
    const cacheKey = `${rlat},${rlon}`;

    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.json(cached);
    }

    // Step 1: Get grid point metadata (forecast URLs + location name)
    const points = await nwsFetch(`${NWS_BASE}/points/${rlat},${rlon}`);
    const props = points.properties;
    const forecastUrl = props.forecast;
    const forecastHourlyUrl = props.forecastHourly;
    const location = {
      city: props.relativeLocation?.properties?.city || "",
      state: props.relativeLocation?.properties?.state || "",
    };

    // Step 2: Fetch forecast + hourly + alerts in parallel
    const [forecast, hourly, alerts] = await Promise.all([
      nwsFetch(forecastUrl),
      nwsFetch(forecastHourlyUrl).catch(() => null),
      nwsFetch(`${NWS_BASE}/alerts/active?point=${rlat},${rlon}`).catch(() => null),
    ]);

    const periods = forecast.properties?.periods || [];
    const hourlyPeriods = hourly?.properties?.periods || [];

    // Current conditions from first hourly period
    const now = hourlyPeriods[0] || periods[0] || {};

    // Today + tonight from daily forecast
    const today = periods[0] || {};
    const tonight = periods.length > 1 ? periods[1] : null;

    // Next few days
    const upcoming = periods.slice(2, 8).map((p) => ({
      name: p.name,
      temp: p.temperature,
      unit: p.temperatureUnit,
      short: p.shortForecast,
      isDaytime: p.isDaytime,
    }));

    // Active alerts
    const activeAlerts = (alerts?.features || [])
      .filter((a) => a.properties?.severity !== "Minor")
      .slice(0, 3)
      .map((a) => ({
        event: a.properties.event,
        severity: a.properties.severity,
        headline: a.properties.headline,
        expires: a.properties.expires,
      }));

    const result = {
      ok: true,
      location,
      current: {
        temp: now.temperature,
        unit: now.temperatureUnit || "F",
        short: now.shortForecast,
        wind: now.windSpeed,
        windDir: now.windDirection,
        isDaytime: now.isDaytime,
      },
      today: {
        name: today.name,
        high: today.isDaytime ? today.temperature : null,
        low: tonight && !tonight.isDaytime ? tonight.temperature : null,
        short: today.shortForecast,
        detail: today.detailedForecast,
        unit: today.temperatureUnit || "F",
      },
      upcoming,
      alerts: activeAlerts,
    };

    setCache(cacheKey, result);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.json(result);
  } catch (err) {
    console.error("[Weather] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch weather" });
  }
}
