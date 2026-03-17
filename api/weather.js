// Weather endpoint — NWS for US, Open-Meteo for international
// Both free, no API keys needed

const NWS_BASE = "https://api.weather.gov";
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1";
const USER_AGENT = "CleanFeed/1.0 (contact@thecleanfeed.app)";

const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Rough US bounding box (includes Alaska, Hawaii, territories)
function isLikelyUS(lat, lon) {
  const la = parseFloat(lat);
  const lo = parseFloat(lon);
  // Continental US
  if (la >= 24 && la <= 50 && lo >= -125 && lo <= -66) return true;
  // Alaska
  if (la >= 51 && la <= 72 && lo >= -180 && lo <= -130) return true;
  // Hawaii
  if (la >= 18 && la <= 23 && lo >= -161 && lo <= -154) return true;
  // Puerto Rico / USVI
  if (la >= 17 && la <= 19 && lo >= -68 && lo <= -64) return true;
  // Guam
  if (la >= 13 && la <= 14 && lo >= 144 && lo <= 145) return true;
  return false;
}

async function nwsFetch(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/geo+json" },
  });
  if (!res.ok) throw new Error(`NWS ${res.status}`);
  return res.json();
}

// WMO weather codes → short description
const WMO_CODES = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Depositing rime fog",
  51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
  56: "Freezing drizzle", 57: "Dense freezing drizzle",
  61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
  77: "Snow grains",
  80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
  85: "Slight snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
};

function wmoToShort(code) {
  return WMO_CODES[code] || "Unknown";
}

// Convert Celsius to Fahrenheit
function cToF(c) {
  return Math.round(c * 9 / 5 + 32);
}

// ------- NWS path (US) -------
async function fetchNWS(rlat, rlon) {
  const points = await nwsFetch(`${NWS_BASE}/points/${rlat},${rlon}`);
  const props = points.properties;
  const location = {
    city: props.relativeLocation?.properties?.city || "",
    state: props.relativeLocation?.properties?.state || "",
  };

  const [forecast, hourly, alerts] = await Promise.all([
    nwsFetch(props.forecast),
    nwsFetch(props.forecastHourly).catch(() => null),
    nwsFetch(`${NWS_BASE}/alerts/active?point=${rlat},${rlon}`).catch(() => null),
  ]);

  const periods = forecast.properties?.periods || [];
  const hourlyPeriods = hourly?.properties?.periods || [];
  const now = hourlyPeriods[0] || periods[0] || {};
  const today = periods[0] || {};
  const tonight = periods.length > 1 ? periods[1] : null;

  const upcoming = periods.slice(2, 8).map((p) => ({
    name: p.name,
    temp: p.temperature,
    unit: p.temperatureUnit,
    short: p.shortForecast,
    isDaytime: p.isDaytime,
  }));

  const activeAlerts = (alerts?.features || [])
    .filter((a) => a.properties?.severity !== "Minor")
    .slice(0, 3)
    .map((a) => ({
      event: a.properties.event,
      severity: a.properties.severity,
      headline: a.properties.headline,
      expires: a.properties.expires,
    }));

  return {
    ok: true,
    source: "nws",
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
}

// ------- Open-Meteo path (international) -------
async function fetchOpenMeteo(rlat, rlon) {
  // Get current weather + daily forecast + location name
  const weatherUrl = `${OPEN_METEO_BASE}/forecast?latitude=${rlat}&longitude=${rlon}&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=7`;
  const res = await fetch(weatherUrl);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const data = await res.json();

  // Reverse geocode for location name
  let city = "";
  let country = "";
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${rlat}&longitude=${rlon}&count=1`;
    const geoRes = await fetch(geoUrl);
    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const place = geoData.results?.[0];
      if (place) {
        city = place.name || "";
        country = place.country || "";
      }
    }
  } catch {}

  const current = data.current || {};
  const daily = data.daily || {};
  const tempC = current.temperature_2m;
  const tempF = tempC != null ? cToF(tempC) : null;
  const weatherCode = current.weather_code;
  const shortForecast = wmoToShort(weatherCode);
  const windKmh = current.wind_speed_10m;
  const windMph = windKmh != null ? Math.round(windKmh * 0.621) : null;
  const windDir = current.wind_direction_10m;
  const isDay = current.is_day === 1;

  // Today high/low
  const todayMaxC = daily.temperature_2m_max?.[0];
  const todayMinC = daily.temperature_2m_min?.[0];
  const todayCode = daily.weather_code?.[0];

  // Upcoming days
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const upcoming = [];
  for (let i = 1; i < Math.min((daily.time || []).length, 7); i++) {
    const date = new Date(daily.time[i]);
    upcoming.push({
      name: dayNames[date.getDay()],
      temp: daily.temperature_2m_max?.[i] != null ? cToF(daily.temperature_2m_max[i]) : null,
      unit: "F",
      short: wmoToShort(daily.weather_code?.[i]),
      isDaytime: true,
    });
  }

  // Wind direction degrees → cardinal
  const cardinals = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const windCardinal = windDir != null ? cardinals[Math.round(windDir / 22.5) % 16] : "";

  return {
    ok: true,
    source: "open-meteo",
    location: { city, state: country },
    current: {
      temp: tempF,
      unit: "F",
      short: shortForecast,
      wind: windMph != null ? `${windMph} mph` : null,
      windDir: windCardinal,
      isDaytime: isDay,
    },
    today: {
      name: "Today",
      high: todayMaxC != null ? cToF(todayMaxC) : null,
      low: todayMinC != null ? cToF(todayMinC) : null,
      short: wmoToShort(todayCode),
      detail: null,
      unit: "F",
    },
    upcoming,
    alerts: [], // Open-Meteo free tier doesn't include alerts
  };
}

export default async function handler(req, res) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ ok: false, error: "lat and lon required" });
    }

    const rlat = parseFloat(lat).toFixed(4);
    const rlon = parseFloat(lon).toFixed(4);
    const cacheKey = `${rlat},${rlon}`;

    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.json(cached);
    }

    let result;
    if (isLikelyUS(rlat, rlon)) {
      try {
        result = await fetchNWS(rlat, rlon);
      } catch (err) {
        // NWS failed (e.g. edge of bounding box not actually US) — fall back
        console.warn("[Weather] NWS failed, falling back to Open-Meteo:", err.message);
        result = await fetchOpenMeteo(rlat, rlon);
      }
    } else {
      result = await fetchOpenMeteo(rlat, rlon);
    }

    setCache(cacheKey, result);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.json(result);
  } catch (err) {
    console.error("[Weather] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch weather" });
  }
}
