// Sports scores — ESPN unofficial API (free, no key)
// Fetches today's scoreboard for active major leagues

const LEAGUES = [
  // US major
  { key: "nfl", sport: "football", league: "nfl", label: "NFL", season: [9, 10, 11, 12, 1, 2] },
  { key: "nba", sport: "basketball", league: "nba", label: "NBA", season: [10, 11, 12, 1, 2, 3, 4, 5, 6] },
  { key: "mlb", sport: "baseball", league: "mlb", label: "MLB", season: [3, 4, 5, 6, 7, 8, 9, 10] },
  { key: "nhl", sport: "hockey", league: "nhl", label: "NHL", season: [10, 11, 12, 1, 2, 3, 4, 5, 6] },
  { key: "mls", sport: "soccer", league: "usa.1", label: "MLS", season: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  // International football
  { key: "epl", sport: "soccer", league: "eng.1", label: "EPL", season: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5] },
  { key: "laliga", sport: "soccer", league: "esp.1", label: "La Liga", season: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5] },
  { key: "seriea", sport: "soccer", league: "ita.1", label: "Serie A", season: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5] },
  { key: "ucl", sport: "soccer", league: "uefa.champions", label: "UCL", season: [9, 10, 11, 12, 2, 3, 4, 5] },
  // Motorsport
  { key: "f1", sport: "racing", league: "f1", label: "F1", season: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
];

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 min — scores change fast

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

function isInSeason(league) {
  const month = new Date().getMonth() + 1;
  return league.season.includes(month);
}

async function fetchScoreboard(sport, league) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;
  const res = await fetch(url, {
    headers: { "User-Agent": "CleanFeed/1.0" },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status}`);
  return res.json();
}

function parseGame(event, leagueLabel) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const teams = comp.competitors || [];
  if (teams.length < 2) return null;

  const home = teams.find((t) => t.homeAway === "home") || teams[0];
  const away = teams.find((t) => t.homeAway === "away") || teams[1];

  const status = event.status?.type?.name || "STATUS_SCHEDULED";
  const statusDetail = event.status?.type?.shortDetail || event.status?.type?.detail || "";
  const isComplete = status === "STATUS_FINAL";
  const isLive = status === "STATUS_IN_PROGRESS" || status === "STATUS_HALFTIME" || status === "STATUS_END_PERIOD";

  return {
    id: event.id,
    league: leagueLabel,
    home: {
      name: home.team?.shortDisplayName || home.team?.displayName || "Home",
      abbrev: home.team?.abbreviation || "",
      score: home.score ? parseInt(home.score) : null,
      winner: home.winner || false,
    },
    away: {
      name: away.team?.shortDisplayName || away.team?.displayName || "Away",
      abbrev: away.team?.abbreviation || "",
      score: away.score ? parseInt(away.score) : null,
      winner: away.winner || false,
    },
    status,
    statusDetail,
    isComplete,
    isLive,
    startTime: event.date,
    headline: event.name || `${away.team?.shortDisplayName} at ${home.team?.shortDisplayName}`,
  };
}

export default async function handler(req, res) {
  try {
    const cached = getCached("scores");
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.json(cached);
    }

    // Only fetch leagues currently in season
    const activeLeagues = LEAGUES.filter(isInSeason);

    const results = await Promise.allSettled(
      activeLeagues.map(async (lg) => {
        const data = await fetchScoreboard(lg.sport, lg.league);
        const events = data.events || [];
        return events.map((e) => parseGame(e, lg.label)).filter(Boolean);
      })
    );

    const games = [];
    for (const r of results) {
      if (r.status === "fulfilled") games.push(...r.value);
    }

    // Sort: live first, then complete (most recent), then scheduled
    games.sort((a, b) => {
      if (a.isLive && !b.isLive) return -1;
      if (!a.isLive && b.isLive) return 1;
      if (a.isComplete && !b.isComplete) return -1;
      if (!a.isComplete && b.isComplete) return 1;
      return new Date(a.startTime) - new Date(b.startTime);
    });

    const result = {
      ok: true,
      count: games.length,
      games: games.slice(0, 30),
      leagues: activeLeagues.map((l) => l.label),
    };

    setCache("scores", result);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.json(result);
  } catch (err) {
    console.error("[Scores] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch scores" });
  }
}
