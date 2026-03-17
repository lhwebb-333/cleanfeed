// Sports scores — ESPN unofficial API (free, no key)
// Fetches today's scoreboard for active major leagues
// v2: golf leaderboard + EPL score fix

const LEAGUES = [
  // US Big 4
  { key: "nfl", sport: "football", league: "nfl", label: "NFL", season: [9, 10, 11, 12, 1, 2] },
  { key: "nba", sport: "basketball", league: "nba", label: "NBA", season: [10, 11, 12, 1, 2, 3, 4, 5, 6] },
  { key: "mlb", sport: "baseball", league: "mlb", label: "MLB", season: [3, 4, 5, 6, 7, 8, 9, 10] },
  { key: "nhl", sport: "hockey", league: "nhl", label: "NHL", season: [10, 11, 12, 1, 2, 3, 4, 5, 6] },
  // College
  { key: "ncaam", sport: "basketball", league: "mens-college-basketball", label: "NCAAM", season: [11, 12, 1, 2, 3, 4] },
  { key: "ncaaf", sport: "football", league: "college-football", label: "NCAAF", season: [8, 9, 10, 11, 12, 1] },
  // International
  { key: "epl", sport: "soccer", league: "eng.1", label: "EPL", season: [8, 9, 10, 11, 12, 1, 2, 3, 4, 5] },
  // Motorsport
  { key: "f1", sport: "racing", league: "f1", label: "F1", season: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  // Golf
  { key: "golf", sport: "golf", league: "pga", label: "PGA", season: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

const cache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 min

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

// Parse golf tournaments — leaderboard top 10 instead of home/away
function parseGolfEvent(event, leagueLabel) {
  const comp = event.competitions?.[0];
  if (!comp) return null;

  const status = event.status?.type?.name || "STATUS_SCHEDULED";
  const statusDetail = event.status?.type?.shortDetail || event.status?.type?.detail || "";
  const isComplete = status === "STATUS_FINAL";
  const isLive = status === "STATUS_IN_PROGRESS";

  const competitors = comp.competitors || [];
  // Sort by position, take top 10
  const sorted = competitors
    .filter((c) => c.athlete || c.team)
    .sort((a, b) => {
      const posA = parseInt(a.order || a.sortOrder || 999);
      const posB = parseInt(b.order || b.sortOrder || 999);
      return posA - posB;
    })
    .slice(0, 10);

  const leaderboard = sorted.map((c) => {
    const name = c.athlete?.shortName || c.athlete?.displayName || c.team?.displayName || "?";
    const score = c.score || c.linescores?.map((l) => l.value).join("/") || "E";
    return { name, score, pos: c.order || c.sortOrder || "" };
  });

  return {
    id: event.id,
    league: leagueLabel,
    type: "golf",
    eventName: event.name || event.shortName || "Tournament",
    leaderboard,
    status,
    statusDetail,
    isComplete,
    isLive,
    startTime: event.date,
    headline: event.name || "PGA Tournament",
    // Dummy home/away so the UI doesn't break
    home: { name: "", abbrev: "", score: null, winner: false },
    away: { name: "", abbrev: "", score: null, winner: false },
  };
}

function parseGame(event, leagueLabel) {
  // Golf gets special handling
  if (leagueLabel === "PGA") return parseGolfEvent(event, leagueLabel);

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

  // Parse score — handle "0" as valid (not null)
  function parseScore(s) {
    if (s == null || s === "") return null;
    const n = parseInt(s);
    return isNaN(n) ? null : n;
  }

  return {
    id: event.id,
    league: leagueLabel,
    type: "game",
    home: {
      name: home.team?.shortDisplayName || home.team?.displayName || "Home",
      abbrev: home.team?.abbreviation || "",
      score: parseScore(home.score),
      winner: home.winner || false,
    },
    away: {
      name: away.team?.shortDisplayName || away.team?.displayName || "Away",
      abbrev: away.team?.abbreviation || "",
      score: parseScore(away.score),
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
    const cached = getCached("scores-v2");
    if (cached) {
      res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
      return res.json(cached);
    }

    // Only fetch leagues currently in season
    const activeLeagues = LEAGUES.filter(isInSeason);

    const results = await Promise.allSettled(
      activeLeagues.map(async (lg) => {
        try {
          const data = await fetchScoreboard(lg.sport, lg.league);
          const events = data.events || [];
          const parsed = events.map((e) => parseGame(e, lg.label)).filter(Boolean);
          console.log(`[Scores] ${lg.label}: ${events.length} events → ${parsed.length} parsed`);
          return parsed;
        } catch (err) {
          console.error(`[Scores] ${lg.label} FAILED:`, err.message);
          throw err;
        }
      })
    );

    const games = [];
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === "fulfilled") {
        games.push(...r.value);
      } else {
        console.error(`[Scores] ${activeLeagues[i].label} rejected:`, r.reason?.message);
      }
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

    setCache("scores-v2", result);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.json(result);
  } catch (err) {
    console.error("[Scores] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to fetch scores" });
  }
}
