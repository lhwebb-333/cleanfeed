import Parser from "rss-parser";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "CleanFeed/1.0 (RSS Reader)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
});

// In-memory cache (persists across warm invocations on Vercel)
const cache = new Map();
const CACHE_TTL = 300 * 1000; // 5 min

export const SOURCES = {
  reuters: {
    name: "Reuters",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com/business&ceid=US:en&hl=en-US&gl=US", category: "financial" },
      { url: "https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com/technology&ceid=US:en&hl=en-US&gl=US", category: "tech" },
    ],
    color: "#FF8C00",
  },
  ap: {
    name: "AP News",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:24h+allinurl:apnews.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
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
    "football", "soccer", "rugby", "cricket", "tennis", "golf", "f1",
    "formula 1", "nba", "nfl", "nhl", "mlb", "premier league", "champions league",
    "world cup", "olympics", "athlete", "coach", "referee", "tournament",
    "match", "fixture", "playoff", "championship", "league", "transfer",
    "goal scored", "batting", "pitch", "stadium", "medal",
    "manager sacked", "grand prix", "boxing", "ufc", "mma",
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
  ],
  health: [
    "cancer", "disease", "hospital", "vaccine", "virus", "pandemic",
    "nhs", "drug trial", "clinical trial", "mental health", "obesity",
    "diabetes", "surgery", "doctor", "patient", "diagnosis", "treatment",
    "outbreak", "public health", "life expectancy", "dementia", "alzheimer",
  ],
  science: [
    "nasa", "space", "planet", "asteroid", "climate", "fossil",
    "species", "evolution", "genome", "dna", "physics", "ocean",
    "earthquake", "volcano", "research finds", "study finds",
    "scientists", "researchers", "experiment", "telescope", "mars",
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

const OPINION_FILTERS = [
  "opinion", "editorial", "commentary", "column", "op-ed", "oped",
  "analysis:", "perspective", "letters to", "review:", "podcast",
  "newsletter", "quiz", "crossword", "horoscope", "cartoon", "satire",
];

function classifyArticle(title = "", description = "", feedCategory = "world") {
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
  if (bestScore === 0) return feedCategory;
  if (scores[feedCategory] > 0 && bestScore - scores[feedCategory] < 2) return feedCategory;
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

export async function fetchSource(sourceKey) {
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

  const seen = new Set();
  const deduped = articles.filter((a) => {
    if (seen.has(a.link)) return false;
    seen.add(a.link); return true;
  });

  setCache(sourceKey, deduped);
  return deduped;
}
