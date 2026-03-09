import express from "express";
import cors from "cors";
import Parser from "rss-parser";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "CleanFeed/1.0 (RSS Reader)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: { item: ["source"] },
});

// In-memory cache
const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || "300") * 1000;

// RSS Sources — each feed URL is tagged with a category
const SOURCES = {
  reuters: {
    name: "Reuters",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:5d+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:reuters.com+intitle:NFL+OR+intitle:NBA+OR+intitle:MLB+OR+intitle:NHL+OR+intitle:soccer+OR+intitle:tennis+OR+intitle:golf+OR+intitle:F1&ceid=US:en&hl=en-US&gl=US", category: "sports" },
    ],
    color: "#FF8C00",
  },
  ap: {
    name: "AP News",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:5d+allinurl:apnews.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:apnews.com+intitle:NFL+OR+intitle:NBA+OR+intitle:MLB+OR+intitle:NHL+OR+intitle:NASCAR+OR+intitle:NCAA&ceid=US:en&hl=en-US&gl=US", category: "sports" },
      { url: "https://news.google.com/rss/search?q=when:5d+site:apnews.com+intitle:soccer+OR+intitle:tennis+OR+intitle:golf+OR+intitle:boxing+OR+intitle:F1+OR+intitle:PGA+OR+intitle:WNBA+OR+intitle:MLS+OR+intitle:UFC&ceid=US:en&hl=en-US&gl=US", category: "sports" },
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

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "world", label: "World" },
  { key: "financial", label: "Financial" },
  { key: "tech", label: "Tech" },
  { key: "sports", label: "Sports" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
];

// Keyword-based category classification
// Feed URL gives a hint, but we override based on actual content
const CATEGORY_KEYWORDS = {
  sports: [
    "football", "soccer", "rugby", "cricket", "tennis", "golf", "f1",
    "formula 1", "nba", "nfl", "nhl", "mlb", "premier league", "champions league",
    "world cup", "olympics", "athlete", "coach", "referee", "tournament",
    "match", "fixture", "playoff", "championship", "league", "transfer",
    "goal scored", "batting", "pitch", "stadium", "medal",
    "manager sacked", "grand prix", "boxing", "ufc", "mma",
    "game recap", "final score", "beats ", "defeats ", "routs ",
    "scored ", "touchdown", "home run", "three-pointer", "shutout",
    "overtime", "halftime", "innings", "quarterback", "pitcher",
    "free agency", "draft pick", "trade deadline", "roster",
    "ncaa", "march madness", "super bowl", "world series",
    "stanley cup", "all-star", "mvp", "rookie", "varsity",
    "espn", "sports", "game ", "series win", "series loss",
    "postseason", "preseason", "regular season",
  ],
  financial: [
    "stock", "shares", "market rally", "market drop", "wall street", "ftse",
    "nasdaq", "s&p 500", "dow jones", "fed rate", "interest rate", "inflation",
    "gdp", "recession", "ipo", "earnings", "revenue", "profit", "dividend",
    "bond", "yield", "forex", "cryptocurrency", "bitcoin", "bank of england",
    "federal reserve", "ecb", "imf", "world bank", "trade deficit",
    "quarterly results", "fiscal", "monetary policy", "hedge fund",
    "private equity", "venture capital", "fintech", "mortgage rate",
  ],
  tech: [
    "ai ", " ai,", "artificial intelligence", "openai", "google", "apple",
    "microsoft", "amazon", "meta", "nvidia", "semiconductor", "chip",
    "software", "startup", "cyber", "hack", "data breach", "app ",
    "smartphone", "robot", "autonomous", "quantum", "blockchain",
    "cloud computing", "machine learning", "silicon valley",
    "spacex", "tesla",
    "chatbot", "deepfake", "algorithm", "encryption", "5g ", "6g ",
    "self-driving", "chatgpt", "gemini", "copilot", "anthropic",
    "open source", "saas", "cloud ", "streaming", "tiktok",
    "instagram", "social media", "tech giant", "silicon ",
    "microchip", "processor", "gpu ", "data center",
  ],
  health: [
    "cancer", "disease", "hospital", "vaccine", "virus", "pandemic",
    "nhs", "drug trial", "clinical trial", "mental health", "obesity",
    "diabetes", "surgery", "doctor", "patient", "diagnosis", "treatment",
    "outbreak", "public health", "life expectancy", "dementia", "alzheimer",
    "fda ", "cdc ", "who ", "drug approval", "pharmaceutical",
    "therapy", "prescription", "opioid", "fentanyl", "overdose",
    "medicare", "medicaid", "health care", "healthcare", "insurer",
    "biotech", "gene therapy", "stem cell", "organ transplant",
    "flu ", "infection", "antibiotic", "fertility", "maternal",
    "nutrition", "sleep ", "wellness", "epidemic", "mortality",
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
    "coup", "regime", "tariff", "trade war", "navy", "army",
    "pentagon", "minister", "government",
  ],
};

// Score an article against each category — highest score wins
function classifyArticle(title = "", description = "", feedCategory = "world") {
  const text = `${title} ${description}`.toLowerCase();
  const scores = {};

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[cat] = 0;
    for (const kw of keywords) {
      if (text.includes(kw)) scores[cat]++;
    }
  }

  // Find the best match
  let bestCat = feedCategory;
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCat = cat;
    }
  }

  // No keywords matched — default to "world" not feedCategory
  // (prevents Google proxy noise from inheriting wrong category)
  if (bestScore === 0) return "world";

  // If the feed category also has matches, require the override to win by 2+
  // to avoid borderline re-classifications
  if (scores[feedCategory] > 0 && bestScore - scores[feedCategory] < 2) {
    return feedCategory;
  }

  return bestCat;
}

// Opinion filter keywords
const OPINION_FILTERS = [
  "opinion",
  "editorial",
  "commentary",
  "column",
  "op-ed",
  "oped",
  "analysis:",
  "perspective",
  "letters to",
  "review:",
  "podcast",
  "newsletter",
  "quiz",
  "crossword",
  "horoscope",
  "cartoon",
  "satire",
];

function isOpinion(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return OPINION_FILTERS.some((f) => text.includes(f));
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

async function fetchSource(sourceKey) {
  const cached = getCached(sourceKey);
  if (cached) return cached;

  const source = SOURCES[sourceKey];
  if (!source) return [];

  const articles = [];

  for (const { url, category } of source.feeds) {
    try {
      const feed = await parser.parseURL(url);
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
    } catch (err) {
      console.warn(`[CleanFeed] Failed to fetch ${url}:`, err.message);
    }
  }

  // Dedupe by link
  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  setCache(sourceKey, deduped);
  return deduped;
}

// Google News topic feeds — curated by Google, filtered to our approved sources
const TOPIC_FEEDS = [
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGRqTVhZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "tech" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRFp0Y1RjU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "science" },
  { url: "https://news.google.com/rss/topics/CAAqIQgKIhtDQkFTRGdvSUwyMHZNR3QwTlRFU0FtVnVLQUFQAQ?ceid=US:en&hl=en-US&gl=US", category: "health" },
];

const APPROVED_SOURCES = {
  "apnews.com": { name: "AP News", color: "#4A90D9" },
  "reuters.com": { name: "Reuters", color: "#FF8C00" },
  "bbc.com": { name: "BBC", color: "#C1272D" },
  "bbc.co.uk": { name: "BBC", color: "#C1272D" },
  "npr.org": { name: "NPR", color: "#5BBD72" },
};

function matchApprovedSource(item) {
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
  const title = item.title || "";
  if (title.endsWith("- AP News")) return APPROVED_SOURCES["apnews.com"];
  if (title.endsWith("- Reuters")) return APPROVED_SOURCES["reuters.com"];
  if (title.endsWith("- BBC")) return APPROVED_SOURCES["bbc.com"];
  if (title.endsWith("- BBC News")) return APPROVED_SOURCES["bbc.com"];
  if (title.endsWith("- NPR")) return APPROVED_SOURCES["npr.org"];
  return null;
}

async function fetchTopicFeeds() {
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
          category,
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

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(join(__dirname, "..", "dist")));
}

// API Routes
app.get("/api/feed", async (req, res) => {
  try {
    const sourceFilter = req.query.source; // optional: "reuters", "ap", "bbc"
    const categoryFilter = req.query.category; // optional: "world", "financial", etc.
    const limit = Math.min(parseInt(req.query.limit) || 200, 500);

    const sourceKeys = sourceFilter
      ? [sourceFilter]
      : Object.keys(SOURCES);

    const [results, topicArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map((key) => fetchSource(key))),
      sourceFilter ? Promise.resolve([]) : fetchTopicFeeds(),
    ]);

    let articles = [
      ...results.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ...topicArticles,
    ];

    if (categoryFilter && categoryFilter !== "all") {
      articles = articles.filter((a) => a.category === categoryFilter);
    }

    articles = articles
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, limit);

    res.json({
      ok: true,
      count: articles.length,
      articles,
      cached: sourceKeys.every((k) => getCached(k) !== null),
    });
  } catch (err) {
    console.error("[CleanFeed] Feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch feeds" });
  }
});

app.get("/api/sources", (req, res) => {
  const sources = Object.entries(SOURCES).map(([key, s]) => ({
    key,
    name: s.name,
    color: s.color,
  }));
  res.json({ ok: true, sources });
});

app.get("/api/categories", (req, res) => {
  res.json({ ok: true, categories: CATEGORIES });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// SPA fallback for production
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(join(__dirname, "..", "dist", "index.html"));
  });
}

// === Local feed support ===

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

const US_STATES_MAP = {
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

async function fetchLocalFeed(stateCode) {
  const stateName = US_STATES_MAP[stateCode];
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
        title: item.title, description: desc, link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: `Local ${stateCode}`, color: LOCAL_COLOR,
        category: classifyArticle(item.title, desc, "world"),
        scope: "local",
      });
    }
  } catch (err) {
    console.warn(`[CleanFeed] AP state proxy failed for ${stateCode}:`, err.message);
  }

  // Curated sources
  for (const src of (CURATED_LOCAL[stateCode] || [])) {
    try {
      const feed = await parser.parseURL(src.rss);
      for (const item of (feed.items || []).slice(0, 15)) {
        if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
        const desc = (item.contentSnippet || item.content || "").slice(0, 250);
        articles.push({
          id: item.guid || item.link,
          title: item.title, description: desc, link: item.link,
          pubDate: item.isoDate || item.pubDate,
          source: `Local ${stateCode}`, color: LOCAL_COLOR,
          category: classifyArticle(item.title, desc, "world"),
          scope: "local",
        });
      }
    } catch (err) {
      console.warn(`[CleanFeed] Local source ${src.name} failed:`, err.message);
    }
  }

  const seen = new Set();
  const deduped = articles.filter((a) => { if (seen.has(a.link)) return false; seen.add(a.link); return true; });
  const sorted = deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
  setCache(cacheKey, sorted);
  return sorted;
}

app.get("/api/local-feed", async (req, res) => {
  try {
    const { state } = req.query;
    if (!state) return res.status(400).json({ ok: false, error: "Missing state" });
    const articles = await fetchLocalFeed(state.toUpperCase().slice(0, 2));
    res.json({ ok: true, count: articles.length, state: state.toUpperCase(), articles });
  } catch (err) {
    console.error("[CleanFeed] Local feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch local feeds" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[CleanFeed] Server running on port ${PORT}`);
  console.log(`[CleanFeed] Sources: ${Object.keys(SOURCES).join(", ")}`);
  console.log(`[CleanFeed] Cache TTL: ${CACHE_TTL / 1000}s`);
});
