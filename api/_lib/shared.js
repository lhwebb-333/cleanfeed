import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "CleanFeed/1.0 (RSS Reader)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: { item: ["source"] },
});

// In-memory cache (persists across warm invocations on Vercel)
const cache = new Map();
const CACHE_TTL = 300 * 1000; // 5 min

export const SOURCES = {
  reuters: {
    name: "Reuters",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:5d+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:reuters.com/sports&ceid=US:en&hl=en-US&gl=US", category: "sports" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:reuters.com+NBA+OR+NFL+OR+MLB+OR+NHL+OR+soccer+OR+F1&ceid=US:en&hl=en-US&gl=US", category: "sports" },
    ],
    color: "#FF8C00",
  },
  ap: {
    name: "AP News",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:5d+allinurl:apnews.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:apnews.com/sports&ceid=US:en&hl=en-US&gl=US", category: "sports" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:apnews.com+NBA+OR+NFL+OR+MLB+OR+NHL+OR+NASCAR+OR+NCAA+OR+soccer&ceid=US:en&hl=en-US&gl=US", category: "sports" },
    ],
    color: "#4A90D9",
  },
  bbc: {
    name: "BBC",
    feeds: [
      { url: "https://feeds.bbci.co.uk/news/rss.xml", category: "world" },
      { url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "world" },
      { url: "https://feeds.bbci.co.uk/news/business/rss.xml", category: "financial" },
      { url: "https://feeds.bbci.co.uk/news/technology/rss.xml", category: "tech" },
      { url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", category: "science" },
      { url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "sports" },
      { url: "https://feeds.bbci.co.uk/news/health/rss.xml", category: "health" },
    ],
    color: "#C1272D",
  },
  npr: {
    name: "NPR",
    feeds: [
      { url: "https://feeds.npr.org/1001/rss.xml", category: "world" },
      { url: "https://feeds.npr.org/1004/rss.xml", category: "world" },
      { url: "https://feeds.npr.org/1006/rss.xml", category: "financial" },
      { url: "https://feeds.npr.org/1019/rss.xml", category: "tech" },
      { url: "https://feeds.npr.org/1007/rss.xml", category: "science" },
      { url: "https://feeds.npr.org/1128/rss.xml", category: "health" },
    ],
    color: "#5BBD72",
  },
};

export const CATEGORIES = [
  { key: "world", label: "World" },
  { key: "financial", label: "Financial" },
  { key: "tech", label: "Tech" },
  { key: "sports", label: "Sports" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
];

const CATEGORY_KEYWORDS = {
  sports: [
    // Sports & leagues
    "football", "soccer", "rugby", "cricket", "tennis", "golf", "f1",
    "formula 1", "nba", "nfl", "nhl", "mlb", "mls", "premier league",
    "champions league", "world cup", "olympics", "major league",
    // Roles
    "athlete", "coach", "referee", "quarterback", "pitcher", "rookie",
    // Structure & events
    "tournament", "fixture", "playoff", "championship", "postseason",
    "preseason", "regular season", "trade deadline", "free agency",
    "draft pick", "roster", "transfer window",
    // Results & action (specific enough to avoid false positives)
    "goal scored", "batting", "stadium", "medal", "manager sacked",
    "grand prix", "game recap", "final score", "defeats ", "routs ",
    "win over", "victory over", "loss to ", "assists",
    "touchdown", "home run", "three-pointer", "shutout",
    "halftime", "innings", "rebounds",
    // Streaks
    "win streak", "losing streak", "straight win", "straight loss",
    // Named events
    "ncaa", "march madness", "super bowl", "world series",
    "stanley cup", "all-star", "mvp", "varsity",
    // Combat sports
    "boxing", "ufc", "mma",
    // Meta
    "espn", "sports", "series win", "series loss",
    // NBA teams
    "celtics", "nets", "knicks", "76ers", "sixers", "raptors",
    "bulls", "cavaliers", "cavs", "pistons", "pacers", "bucks",
    "hawks", "hornets", "heat", "magic", "wizards",
    "nuggets", "timberwolves", "thunder", "trail blazers", "blazers", "jazz",
    "warriors", "clippers", "lakers", "suns", "kings",
    "mavericks", "mavs", "rockets", "grizzlies", "pelicans", "spurs",
    // NFL teams (distinctive names only)
    "patriots", "chiefs", "eagles", "cowboys", "steelers", "packers",
    "49ers", "seahawks", "ravens", "broncos", "dolphins", "chargers",
    "bengals", "vikings", "saints", "buccaneers", "bucs", "falcons",
    "raiders", "colts", "texans", "titans", "jaguars", "panthers",
    "commanders", "cardinals", "rams", "bears", "lions", "giants",
    // MLB teams (distinctive only)
    "yankees", "red sox", "dodgers", "cubs", "astros", "braves",
    "phillies", "padres", "mets", "orioles", "guardians", "mariners",
    "blue jays", "twins", "brewers", "diamondbacks", "rockies", "royals",
    "white sox", "reds", "pirates", "athletics", "rangers", "marlins", "rays",
    // NHL teams (distinctive only)
    "bruins", "maple leafs", "canadiens", "penguins", "blackhawks",
    "red wings", "flyers", "oilers", "flames", "canucks", "avalanche",
    "hurricanes", "lightning", "predators", "blue jackets", "sabres",
    "islanders", "kraken", "wild",
    // Common sports headline phrases
    "straight game", "straight games",
    // REMOVED: "match" (ambiguous — "match expectations"), "points" (financial/political),
    // "game " ("game-changing"), "beats "/"beat the " ("beats estimates"),
    // "scored "/"scores " ("scores of people"), "league" standalone ("league of nations"),
    // "transfer" standalone ("money transfer"), "pitch" ("pitch deck"),
    // "overtime" ("working overtime")
  ],
  financial: [
    "stock", "shares", "market rally", "market drop", "wall street", "ftse",
    "nasdaq", "s&p 500", "dow jones", "fed rate", "interest rate", "inflation",
    "gdp", "recession", "ipo", "earnings", "revenue", "profit", "dividend",
    "bond", "yield", "forex", "cryptocurrency", "bitcoin", "bank of england",
    "federal reserve", "ecb", "imf", "world bank", "trade deficit",
    "quarterly results", "fiscal", "monetary policy", "hedge fund",
    "private equity", "venture capital", "fintech", "mortgage rate",
    "oil price", "crude oil", "gas price", "barrel", "opec",
    "tariff", "trade war", "economy", "economic", "unemployment",
    "jobs report", "payroll", "consumer spending", "retail sales",
    "housing market", "real estate", "bankruptcy", "debt ceiling",
    "treasury", "central bank", "rate hike", "rate cut",
    "market cap", "investor", "investment", "portfolio",
    "commodity", "gold price", "silver price", "copper",
    "supply chain", "cpi ", "ppi ", "economic growth",
    "bull market", "bear market", "selloff", "sell-off",
    "dow ", "index fund", "etf ", "mutual fund",
    "stock market", "stock price",
    // REMOVED: standalone "rally" (matches "political rally")
  ],
  tech: [
    "ai ", " ai,", "artificial intelligence", "openai", "google", "apple",
    "microsoft", "amazon", "meta", "nvidia", "semiconductor",
    "software", "startup", "cyber", "hack", "data breach", "app ",
    "smartphone", "robot", "autonomous", "blockchain",
    "cloud computing", "cloud service", "machine learning", "silicon valley",
    "spacex", "tesla",
    "chatbot", "deepfake", "algorithm", "encryption", "5g ", "6g ",
    "self-driving", "chatgpt", "gemini", "copilot", "anthropic",
    "open source", "saas", "streaming", "tiktok",
    "instagram", "social media", "tech giant", "silicon ",
    "microchip", "processor", "gpu ", "data center",
    "quantum computing", "quantum computer",
    "chip maker", "chip shortage", "chipmaker",
    // REMOVED: "chip" standalone (golf "chip shot"), "cloud " standalone (weather),
    // "quantum" standalone (physics — stays in science)
  ],
  health: [
    "cancer", "disease", "hospital", "vaccine", "virus", "pandemic",
    "nhs", "drug trial", "clinical trial", "mental health", "obesity",
    "diabetes", "surgery", "doctor", "patient", "diagnosis", "treatment",
    "outbreak", "public health", "life expectancy", "dementia", "alzheimer",
    "fda ", "cdc ", "drug approval", "pharmaceutical",
    "therapy", "prescription", "opioid", "fentanyl", "overdose",
    "medicare", "medicaid", "health care", "healthcare", "insurer",
    "biotech", "gene therapy", "stem cell", "organ transplant",
    "flu ", "infection", "antibiotic", "fertility", "maternal",
    "nutrition", "sleep ", "wellness", "epidemic", "mortality",
    "world health organization",
    // REMOVED: "who " (the pronoun "who" matches in virtually every article,
    // inflating health score across all categories)
  ],
  science: [
    "nasa", "space", "planet", "asteroid", "climate", "fossil",
    "species", "evolution", "genome", "dna", "physics", "ocean",
    "earthquake", "volcano", "research finds", "study finds",
    "scientists", "researchers", "experiment", "telescope", "mars",
    "satellite", "rover", "comet", "solar system", "galaxy",
    "black hole", "supernova", "exoplanet", "habitat", "coral reef",
    "glacier", "carbon", "emissions", "renewable", "biodiversity",
    "extinction", "paleontology", "archaeology", "neuroscience",
    "particle", "fusion", "quantum ", "laboratory", "peer-reviewed",
    "geologic", "seismic", "atmospheric", "ecosystem", "wildlife",
  ],
  world: [
    "war ", "military", "troops", "missile", "bomb", "airstrike",
    "invasion", "sanctions", "nato", "united nations", "diplomat",
    "embassy", "refugee", "cease-fire", "ceasefire", "conflict",
    "president", "prime minister", "election", "parliament", "protest",
    "coup", "regime", "navy", "army",
    "pentagon", "minister", "government",
    // Catch general hard-news events that aren't sports/tech/etc
    "crash", "fire ", "fires ", "shooting", "attack", "killed",
    "dead ", "death ", "deaths", "arrest", "police", "court",
    "judge", "trial", "prison", "sentence", "murder", "victim",
    "synagogue", "mosque", "church", "temple",
    "evacuate", "explosion", "hostage", "kidnap", "terror",
    "suspect", "investigation", "lawsuit", "indict",
    "influencer", "celebrity", "dinner", "lgbtq", "muslim",
    // REMOVED: "tariff" and "trade war" (kept in financial only — they're economic concepts;
    // world articles about tariffs still match via "president", "government", etc.)
  ],
};

const OPINION_FILTERS = [
  "opinion", "editorial", "commentary", "column", "op-ed", "oped",
  "analysis:", "perspective", "letters to", "review:", "podcast",
  "newsletter", "quiz", "crossword", "horoscope", "cartoon", "satire",
];

function classifyArticle(title = "", description = "", feedCategory = "world", trustFeed = true) {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) scores[cat]++;
    }
  }
  let bestCat = feedCategory;
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }

  // No keywords matched at all:
  // - Source feeds (trustFeed=true): trust the feed tag — we curated these feeds
  // - Topic feeds (trustFeed=false): default to "world" — Google News is unreliable
  if (bestScore === 0) return trustFeed ? feedCategory : "world";

  // Specialized feed category must score at least 1 on its own keywords
  // to keep its feed tag — otherwise the best keyword match wins.
  // This prevents "plane crash in Iraq" from staying as "sports"
  // just because it came from a sports RSS feed.
  if (feedCategory !== "world" && (scores[feedCategory] || 0) === 0) {
    return bestCat;
  }

  // Feed category wins if it ties or beats the best keyword score
  if ((scores[feedCategory] || 0) >= bestScore) return feedCategory;
  return bestCat;
}

function isOpinion(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return OPINION_FILTERS.some((f) => text.includes(f));
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// State-level local news config (mirrored from src/utils/stateSources.js for backend)
const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const LOCAL_COLOR = "#9b59b6";

const CURATED_LOCAL = {
  CA: [{ name: "CalMatters", rss: "https://calmatters.org/feed/" }],
  TX: [{ name: "Texas Tribune", rss: "https://www.texastribune.org/feeds/articles.rss" }, { name: "Houston Public Media", rss: "https://www.houstonpublicmedia.org/feed/" }],
  FL: [{ name: "WUSF", rss: "https://www.wusf.usf.edu/rss.xml" }],
  NY: [{ name: "City & State NY", rss: "https://www.cityandstateny.com/rss.xml" }],
  PA: [{ name: "WHYY", rss: "https://whyy.org/feed/" }, { name: "Spotlight PA", rss: "https://www.spotlightpa.org/feeds/full.xml" }],
  IL: [{ name: "Capitol News Illinois", rss: "https://capitolnewsillinois.com/feed" }],
  OH: [{ name: "WOSU", rss: "https://news.wosu.org/rss.xml" }],
  GA: [{ name: "GPB News", rss: "https://www.gpb.org/news/feed" }],
  NC: [{ name: "WUNC", rss: "https://www.wunc.org/rss.xml" }, { name: "Carolina Public Press", rss: "https://carolinapublicpress.org/feed/" }],
  MI: [{ name: "Bridge Michigan", rss: "https://bridgemi.com/feed/rss/" }],
  VA: [{ name: "WVTF", rss: "https://www.wvtf.org/rss.xml" }],
  WA: [{ name: "KUOW", rss: "https://www.kuow.org/rss.xml" }],
  CO: [{ name: "Colorado Sun", rss: "https://coloradosun.com/feed/" }, { name: "CPR News", rss: "https://www.cpr.org/feed/" }],
  MN: [{ name: "MPR News", rss: "https://www.mprnews.org/rss/index" }],
  MA: [{ name: "GBH News", rss: "https://www.wgbh.org/news/feed" }],
  OR: [{ name: "OPB", rss: "https://www.opb.org/rss/" }],
  NJ: [{ name: "NJ Spotlight News", rss: "https://www.njspotlightnews.org/feed/" }],
  AZ: [{ name: "KJZZ", rss: "https://kjzz.org/rss.xml" }],
  WI: [{ name: "Wisconsin Watch", rss: "https://wisconsinwatch.org/feed/" }, { name: "WPR", rss: "https://www.wpr.org/rss.xml" }],
  TN: [{ name: "WPLN Nashville", rss: "https://wpln.org/feed/" }],
};

export async function fetchLocalFeed(stateCode) {
  const stateName = US_STATES[stateCode];
  if (!stateName) return [];

  const cacheKey = `local-${stateCode}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const articles = [];

  // AP state proxy
  const apUrl = `https://news.google.com/rss/search?q=when:5d+"${encodeURIComponent(stateName)}"+site:apnews.com&ceid=US:en&hl=en-US&gl=US`;
  try {
    const feed = await parser.parseURL(apUrl);
    for (const item of (feed.items || []).slice(0, 20)) {
      if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
      const desc = (item.contentSnippet || item.content || "").slice(0, 250);
      articles.push({
        id: item.guid || item.link,
        title: item.title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: `Local ${stateCode}`,
        color: LOCAL_COLOR,
        category: classifyArticle(item.title, desc, "world"),
        scope: "local",
      });
    }
  } catch (err) {
    console.warn(`[CleanFeed] AP state proxy failed for ${stateCode}:`, err.message);
  }

  // Curated local sources
  const curated = CURATED_LOCAL[stateCode] || [];
  for (const src of curated) {
    try {
      const feed = await parser.parseURL(src.rss);
      for (const item of (feed.items || []).slice(0, 15)) {
        if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
        const desc = (item.contentSnippet || item.content || "").slice(0, 250);
        articles.push({
          id: item.guid || item.link,
          title: item.title,
          description: desc,
          link: item.link,
          pubDate: item.isoDate || item.pubDate,
          source: `Local ${stateCode}`,
          color: LOCAL_COLOR,
          category: classifyArticle(item.title, desc, "world"),
          scope: "local",
        });
      }
    } catch (err) {
      console.warn(`[CleanFeed] Local source ${src.name} failed:`, err.message);
    }
  }

  // Dedupe
  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link); return true;
  });

  const sorted = deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
  setCache(cacheKey, sorted);
  return sorted;
}

export async function fetchSource(sourceKey) {
  const cached = getCached(sourceKey);
  if (cached) return cached;

  const source = SOURCES[sourceKey];
  if (!source) return [];

  // Fetch all feeds in parallel for speed
  const feedResults = await Promise.allSettled(
    source.feeds.map(({ url, category }) =>
      parser.parseURL(url).then((feed) => ({ feed, category, url }))
    )
  );

  const articles = [];
  for (const result of feedResults) {
    if (result.status !== "fulfilled") {
      console.warn(`[CleanFeed] Failed to fetch feed:`, result.reason?.message);
      continue;
    }
    const { feed, category } = result.value;
    for (const item of feed.items || []) {
      if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
      const desc = (item.contentSnippet || item.content || "").slice(0, 250);
      articles.push({
        id: item.guid || item.link,
        title: item.title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: source.name,
        color: source.color,
        category: classifyArticle(item.title, desc, category),
      });
    }
  }

  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link); return true;
  });

  setCache(sourceKey, deduped);
  return deduped;
}

// Google News topic feeds — curated by Google, filtered to our approved sources
const TOPIC_FEEDS = [
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "tech" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "science" },
  { url: "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?ceid=US:en&hl=en-US&gl=US", category: "health" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "financial" },
];

const APPROVED_SOURCES = {
  "apnews.com": { name: "AP News", color: "#4A90D9" },
  "reuters.com": { name: "Reuters", color: "#FF8C00" },
  "bbc.com": { name: "BBC", color: "#C1272D" },
  "bbc.co.uk": { name: "BBC", color: "#C1272D" },
  "npr.org": { name: "NPR", color: "#5BBD72" },
};

function matchApprovedSource(item) {
  // Check <source url="..."> tag first
  if (item.source && typeof item.source === "object" && item.source.url) {
    for (const [domain, info] of Object.entries(APPROVED_SOURCES)) {
      if (item.source.url.includes(domain)) return info;
    }
  }
  if (item.source && typeof item.source === "string") {
    const lower = item.source.toLowerCase();
    if (lower.includes("ap news") || lower.includes("associated press")) return APPROVED_SOURCES["apnews.com"];
    if (lower.includes("reuters")) return APPROVED_SOURCES["reuters.com"];
    if (lower.includes("bbc")) return APPROVED_SOURCES["bbc.com"];
    if (lower.includes("npr")) return APPROVED_SOURCES["npr.org"];
  }
  // Fallback: check title suffix (Google News format: "Title - Source Name")
  const title = item.title || "";
  if (title.endsWith("- AP News")) return APPROVED_SOURCES["apnews.com"];
  if (title.endsWith("- Reuters")) return APPROVED_SOURCES["reuters.com"];
  if (title.endsWith("- BBC")) return APPROVED_SOURCES["bbc.com"];
  if (title.endsWith("- BBC News")) return APPROVED_SOURCES["bbc.com"];
  if (title.endsWith("- NPR")) return APPROVED_SOURCES["npr.org"];
  return null;
}

// Direct RSS from curated specialist outlets (supplemental to main sources)
const SUPPLEMENTAL_FEEDS = [
  { url: "https://phys.org/rss-feed/", name: "Phys.org", color: "#4FC3F7", category: "science" },
  { url: "https://www.nature.com/nature.rss", name: "Nature", color: "#E53935", category: "science" },
  { url: "https://kffhealthnews.org/feed/", name: "KFF Health", color: "#AB47BC", category: "health" },
  { url: "https://www.statnews.com/feed/", name: "STAT News", color: "#00ACC1", category: "health" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", name: "Ars Technica", color: "#FF7043", category: "tech" },
  { url: "https://www.technologyreview.com/feed/", name: "MIT Tech Review", color: "#EC407A", category: "tech" },
];

export async function fetchSupplementalFeeds() {
  const cached = getCached("supplemental-feeds");
  if (cached) return cached;

  const results = await Promise.allSettled(
    SUPPLEMENTAL_FEEDS.map(async ({ url, name, color, category }) => {
      const feed = await parser.parseURL(url);
      return (feed.items || []).slice(0, 15).map((item) => ({
        item, name, color, category,
      }));
    })
  );

  const articles = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const { item, name, color, category } of result.value) {
      if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
      const desc = (item.contentSnippet || item.content || "").slice(0, 250);
      articles.push({
        id: item.guid || item.link,
        title: item.title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: name,
        color,
        category: classifyArticle(item.title, desc, category),
      });
    }
  }

  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  setCache("supplemental-feeds", deduped);
  return deduped;
}

export async function fetchTopicFeeds() {
  const cached = getCached("topic-feeds");
  if (cached) return cached;

  const articles = [];
  for (const { url, category } of TOPIC_FEEDS) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items || []) {
        const sourceInfo = matchApprovedSource(item);
        if (!sourceInfo) continue;
        if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
        // Strip " - Source Name" suffix from title
        let title = item.title || "";
        title = title.replace(/ - (AP News|Reuters|BBC|BBC News|NPR)$/, "");
        const desc = (item.contentSnippet || item.content || "").slice(0, 250);
        articles.push({
          id: item.guid || item.link,
          title,
          description: desc,
          link: item.link,
          pubDate: item.isoDate || item.pubDate,
          source: sourceInfo.name,
          color: sourceInfo.color,
          category: classifyArticle(title, desc, category, false),
        });
      }
    } catch (err) {
      console.warn(`[CleanFeed] Topic feed failed:`, err.message);
    }
  }

  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link); return true;
  });

  setCache("topic-feeds", deduped);
  return deduped;
}
