// "Today" endpoint — daily utility data
// Sunrise/sunset, history, calendar, moon phase
// No API keys needed

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const cache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// Sunrise/sunset from sunrise-sunset.org (free, no key)
async function fetchSunTimes(lat, lon) {
  try {
    const res = await fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lon}&formatted=0`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "OK") return null;
    const r = data.results;
    return {
      sunrise: new Date(r.sunrise).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      sunset: new Date(r.sunset).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
      dayLength: r.day_length,
    };
  } catch { return null; }
}

// Moon phase calculation (no API needed — math)
function getMoonPhase(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c = 0, e = 0, jd = 0, b = 0;
  if (month < 3) {
    c = 365.25 * (year - 1);
    e = 30.6001 * (month + 13);
  } else {
    c = 365.25 * year;
    e = 30.6001 * (month + 1);
  }
  jd = c + e + day - 694039.09;
  jd /= 29.5305882;
  b = Math.floor(jd);
  jd -= b;
  const age = Math.round(jd * 29.5305882);

  if (age < 2) return "New Moon";
  if (age < 7) return "Waxing Crescent";
  if (age < 9) return "First Quarter";
  if (age < 14) return "Waxing Gibbous";
  if (age < 16) return "Full Moon";
  if (age < 21) return "Waning Gibbous";
  if (age < 23) return "Last Quarter";
  if (age < 28) return "Waning Crescent";
  return "New Moon";
}

// This Day in History — Wikipedia API (free)
async function fetchHistory(month, day) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "CleanFeed/1.0 (contact@thecleanfeed.app)" },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const events = (data.selected || [])
      .filter((e) => e.text && e.year)
      .sort((a, b) => b.year - a.year)
      .slice(0, 5)
      .map((e) => ({
        year: e.year,
        text: e.text,
      }));
    return events;
  } catch { return []; }
}

// Notable holidays/observances (basic US + major international)
const HOLIDAYS = {
  "01-01": "New Year's Day",
  "01-15": "Martin Luther King Jr. Day (observed)",
  "02-14": "Valentine's Day",
  "03-17": "St. Patrick's Day",
  "05-05": "Cinco de Mayo",
  "06-19": "Juneteenth",
  "07-04": "Independence Day",
  "09-11": "Patriot Day",
  "10-31": "Halloween",
  "11-11": "Veterans Day",
  "12-25": "Christmas Day",
  "12-31": "New Year's Eve",
};

// FOMC meeting dates 2026
const FOMC_2026 = [
  "2026-01-27", "2026-01-28", "2026-03-17", "2026-03-18",
  "2026-05-05", "2026-05-06", "2026-06-16", "2026-06-17",
  "2026-07-28", "2026-07-29", "2026-09-15", "2026-09-16",
  "2026-10-27", "2026-10-28", "2026-12-08", "2026-12-09",
];

function getCalendarEvents(dateStr) {
  const events = [];
  const mmdd = dateStr.slice(5); // "03-17"

  // Holiday
  if (HOLIDAYS[mmdd]) events.push({ type: "holiday", text: HOLIDAYS[mmdd] });

  // FOMC
  if (FOMC_2026.includes(dateStr)) {
    events.push({ type: "fomc", text: "FOMC meeting today" });
  } else {
    // Check if FOMC is tomorrow or within 2 days
    const today = new Date(dateStr);
    for (const fomcDate of FOMC_2026) {
      const diff = Math.floor((new Date(fomcDate) - today) / (1000 * 60 * 60 * 24));
      if (diff === 1) {
        events.push({ type: "fomc", text: "FOMC meets tomorrow" });
        break;
      }
    }
  }

  return events;
}

export default async function handler(req, res) {
  try {
    const { lat, lon } = req.query;
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0]; // "2026-03-17"
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const cacheKey = `today-${dateStr}-${lat || "none"}-${lon || "none"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.json(cached);
    }

    // Fetch in parallel
    const [sunTimes, history] = await Promise.all([
      lat && lon ? fetchSunTimes(lat, lon) : Promise.resolve(null),
      fetchHistory(String(month).padStart(2, "0"), String(day).padStart(2, "0")),
    ]);

    const moonPhase = getMoonPhase(now);
    const calendar = getCalendarEvents(dateStr);

    const result = {
      ok: true,
      date: {
        full: `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${day}, ${now.getFullYear()}`,
        short: `${MONTHS[now.getMonth()].slice(0, 3)} ${day}`,
        dayOfWeek: DAYS[now.getDay()],
      },
      sun: sunTimes,
      moon: moonPhase,
      calendar,
      history,
    };

    setCache(cacheKey, result);
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.json(result);
  } catch (err) {
    console.error("[Today] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch today data" });
  }
}
