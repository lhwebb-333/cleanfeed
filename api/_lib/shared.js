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
      { url: "https://news.google.com/rss/search?q=when:2d+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com/sports&ceid=US:en&hl=en-US&gl=US", category: "sports" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com/business+OR+site:reuters.com/markets&ceid=US:en&hl=en-US&gl=US", category: "financial" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com/technology&ceid=US:en&hl=en-US&gl=US", category: "tech" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com+science+OR+climate+OR+space&ceid=US:en&hl=en-US&gl=US", category: "science" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com+health+OR+vaccine+OR+disease+OR+FDA&ceid=US:en&hl=en-US&gl=US", category: "health" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:reuters.com/lifestyle&ceid=US:en&hl=en-US&gl=US", category: "entertainment" },
    ],
    color: "#FF8C00",
  },
  ap: {
    name: "AP News",
    feeds: [
      { url: "https://news.google.com/rss/search?q=when:2d+allinurl:apnews.com&ceid=US:en&hl=en-US&gl=US", category: "world" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com/sports&ceid=US:en&hl=en-US&gl=US", category: "sports" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com/business&ceid=US:en&hl=en-US&gl=US", category: "financial" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com/technology&ceid=US:en&hl=en-US&gl=US", category: "tech" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com/science&ceid=US:en&hl=en-US&gl=US", category: "science" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com+health+OR+medical+OR+CDC+OR+FDA&ceid=US:en&hl=en-US&gl=US", category: "health" },
      { url: "https://news.google.com/rss/search?q=when:2d+site:apnews.com/entertainment&ceid=US:en&hl=en-US&gl=US", category: "entertainment" },
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
      { url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", category: "entertainment" },
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
      { url: "https://feeds.npr.org/1048/rss.xml", category: "entertainment" },
      { url: "https://feeds.npr.org/1032/rss.xml", category: "entertainment" },
    ],
    color: "#5BBD72",
  },
};

export const CATEGORIES = [
  { key: "world", label: "World" },
  { key: "financial", label: "Financial" },
  { key: "tech", label: "Tech" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
];

const CATEGORY_KEYWORDS = {
  sports: [
    // Sports & leagues
    "football", "soccer", "rugby", "cricket", "tennis", "golf", "f1",
    "formula 1", "nba", " nfl ", " nfl,", "nhl", "mlb", "mls", "premier league",
    "champions league", "world cup", "olympics", "major league",
    // Roles
    "athlete", "coach", "referee", "quarterback", "pitcher", "rookie",
    // Structure & events
    "tournament", "fixture", "playoff", "championship", "postseason",
    "preseason", "regular season", "trade deadline", "free agency",
    "draft pick", "roster", "transfer window",
    "blockbuster trade", "traded to", "traded for",
    "contract extension", "contract worth", "year contract", "year deal",
    "free agent", "signs with", "signed with", "signing",
    "wide receiver", "quarterback", "running back", "tight end",
    "point guard", "center fielder", "shortstop", "goaltender",
    "paralympic", "paralympics",
    "pga tour", "lpga", "golf tour",
    "scorer", "rebound", " draft ", "draft pick", "draft class",
    "edge rusher", "defensive end", "linebacker", "cornerback",
    "safety ", "offensive line", "punter", "kicker",
    "cycling", "cyclist", "tour de france", "giro",
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
    // Other sports
    "horse racing", "racing", "jockey", "derby", "grand national",
    "cheltenham", "kentucky derby", "preakness", "belmont",
    // Meta
    "espn", "sports", "series win", "series loss",
    // NOTE: "former NFL reporter" / "former NBA player" in article descriptions
    // should NOT classify the article as sports. These are biographical mentions.
    // The classifier already handles this because the competing category
    // (financial/world) will have more keyword hits. But avoid adding
    // loose person-title patterns like "nfl reporter" to this list.
    // NBA teams (removed common English words: heat, magic, thunder, jazz, nets, kings, suns)
    "celtics", "knicks", "76ers", "sixers", "raptors",
    "bulls", "cavaliers", "cavs", "pistons", "pacers", "bucks",
    "hawks", "hornets", "wizards",
    "nuggets", "timberwolves", "trail blazers", "blazers",
    "warriors", "clippers", "lakers",
    "mavericks", "mavs", "rockets", "grizzlies", "pelicans", "spurs",
    // NFL teams (removed common words: bears, lions, giants, eagles, chiefs, rams, colts, titans, panthers, cardinals, saints)
    "patriots", "cowboys", "steelers", "packers",
    "49ers", "seahawks", "ravens", "broncos", "dolphins", "chargers",
    "bengals", "vikings", "buccaneers", "bucs", "falcons",
    "raiders", "texans", "jaguars",
    "commanders",
    // MLB teams (removed common words: reds, rays, twins, royals, pirates, athletics, rangers, guardians, rockies)
    "yankees", "red sox", "dodgers", "cubs", "astros", "braves",
    "phillies", "padres", "mets", "orioles", "mariners",
    "blue jays", "brewers", "diamondbacks",
    "white sox", "marlins",
    // NHL teams (removed common words: flames, lightning, hurricanes, wild, predators, avalanche)
    "bruins", "maple leafs", "canadiens", "penguins", "blackhawks",
    "red wings", "flyers", "oilers", "canucks",
    "blue jackets", "sabres",
    "islanders", "kraken",
    // Premier League teams
    "tottenham", "arsenal", "chelsea", "liverpool", "manchester united",
    "man city", "manchester city", "aston villa", "newcastle united",
    "west ham", "everton", "wolves", "wolverhampton", "crystal palace",
    "nottingham forest", "bournemouth", "fulham", "leicester",
    // Cricket
    "cricket", "wicket", "bowler", "batsman", "t20", "test match",
    "odi ", "ipl ", "ashes ", "captain steps down", "training camp",
    // Rugby
    "rugby", "scrum", "try scorer", "lineout", "six nations",
    // Women's sports — same sport, needs same classification
    "wsl ", "women's super league", "women's world cup",
    "lionesses", "matildas", "uswnt", "nwsl",
    // Athlete-specific phrases
    "steps down as captain", "retires from", "returns from injury",
    "called up to squad", "training camp",
    // Leagues & federations
    "la liga", " serie a", "bundesliga", "ligue 1",
    "eredivisie", "fifa ", "uefa ", "icc ",
    // Common sports headline phrases
    "straight game", "straight games", "relegation",
    "clean sheet", "hat-trick", "hat trick", "penalty shootout",
    "shootout", "overtime win", "power play",
  ],
  financial: [
    "stock", "share price", "shares fell", "shares rose", "shares drop",
    "shares jump", "shares surge", "shares tumble", "shares plunge", "shares climb",
    "shares slump", "shares sink", "shares slip", "shares gain", "shares rally",
    "market rally", "market drop", "wall street", "ftse",
    // REMOVED: standalone "shares" (false positive — "Prince William shares a post" classified as financial)
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
    "crypto", "crypto exchange",
    // Major companies in financial context
    "exxon", "chevron", "bp ", "shell ", "vitol", "glencore",
    "supply chain", "cpi ", "ppi ", "economic growth",
    "bull market", "bear market", "selloff", "sell-off",
    "dow ", "index fund", "etf ", "mutual fund",
    "stock market", "stock price",
    "price target", "analyst", "downgrade", "upgrade",
    "tax ", "taxes", "tax advice", "tax return", "irs ", "income tax",
    "capital gains", "deduction", "write off", "write-off",
    "nifty", "sensex", "hang seng", "nikkei", "dax ", "cac ",
    "market volatility", "volatility", "equity", "equities",
    // REMOVED: standalone "rally" (matches "political rally")
  ],
  tech: [
    " ai ", " ai,", " ai.", "artificial intelligence", "openai", "google", "apple",
    "microsoft", "amazon prime", "amazon web", "amazon.com", "aws ", "meta", "nvidia", "semiconductor",
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
  entertainment: [
    // Movies & TV
    "movie", "movies", "film ", "films ", "box office", "blockbuster",
    "sequel", "prequel", "remake", "reboot", "franchise",
    "oscar", "oscars", "academy award", "golden globe", "emmy", "emmys",
    "grammy", "grammys", "bafta", "cannes", "sundance", "venice film",
    "netflix", "disney+", "hbo", "hulu", "amazon prime video",
    "streaming", "premiere", "trailer", "season finale", "series finale",
    "showrunner", "screenwriter", "director", "actress", "actor",
    "box office", "opening weekend", "studio", "warner bros", "universal",
    "paramount", "sony pictures", "lionsgate", "a24",
    "tv show", "tv series", "television",
    // Music
    "album", "single", "concert", "tour ", "festival",
    "billboard", "charts", "platinum", "grammy",
    "songwriter", "rapper", "singer", "band ",
    "coachella", "glastonbury", "lollapalooza",
    "record label", "music video", "ep ",
    // Culture & Arts
    "broadway", "theater", "theatre", "musical",
    "exhibition", "museum", "gallery", "art exhibit",
    "best-seller", "bestseller", "book review", "author",
    "novel", "memoir", "pulitzer",
    "fashion week", "met gala", "red carpet",
    "comedian", "stand-up", "comedy special",
    // Celebrity news (factual only — the classifier + opinion filter handle gossip)
    "celebrity", "star ", "stars ",
    // Gaming (news, not reviews)
    "video game", "playstation", "xbox", "nintendo",
    "esports", "e-sports",
  ],
  science: [
    "nasa", "outer space", "planet", "asteroid", "climate change", "fossil",
    "species", "evolution", "genome", "dna", "physics", "ocean",
    "earthquake", "volcano", "research finds", "study finds",
    "scientists", "researchers", "experiment", "telescope", "mars",
    "satellite launch", "rover", "comet", "solar system", "galaxy",
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
    "satellite images", "satellite imagery", "air strike", "airspace",
    "oil port", "strikes", "struck", "iran ", "iraq ", "ukraine ", "gaza",
    "ceasefire", "bombing", "shelling", "retaliation",
    "influencer", "celebrity", "dinner", "lgbtq", "muslim",
    // REMOVED: "tariff" and "trade war" (kept in financial only — they're economic concepts;
    // world articles about tariffs still match via "president", "government", etc.)
  ],
};

const OPINION_FILTERS = [
  "opinion", "editorial", "commentary", "column", "op-ed", "oped",
  "analysis:", "perspective", "letters to", "review:", "podcast",
  "newsletter", "quiz", "crossword", "horoscope", "cartoon", "satire",
  // Journal/academic content (Nature, etc.) — not news articles
  "author correction:", "publisher correction:", "correction:",
  "erratum:", "corrigendum:", "retraction:",
  "supplementary information", "supplementary data",
  // Paywall indicators
  "stat+:", "subscriber only", "members only", "premium:",
];

// Filter Nature journal papers — keep news (d41586-*), skip research papers (s41586-*)
function isJournalPaper(title = "", description = "", source = "", link = "") {
  if (source !== "Nature") return false;
  // Nature URLs: d41586 = news/editorial, s41586 = research papers
  if (link && link.includes("/articles/s41586")) return true;
  if (link && link.includes("/articles/s4158")) return true;
  const t = title.toLowerCase();
  if (t.startsWith("author correction") || t.startsWith("publisher correction") ||
      t.startsWith("correction:") || t.startsWith("erratum") ||
      t.startsWith("corrigendum") || t.startsWith("retraction")) return true;
  if (title.includes("<sub>") || title.includes("<sup>")) return true;
  return false;
}

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

  // No keywords matched at all — default to "world".
  // If it were truly sports/tech/etc, at least one keyword would match.
  if (bestScore === 0) return "world";

  // If caller says don't trust the feed tag (e.g. supplemental sources with fixed categories),
  // let keyword scoring decide with a lower bar
  if (!trustFeed) {
    return bestCat;
  }

  // Specialized feed category must score at least 1 on its own keywords
  // to keep its feed tag — otherwise the best keyword match wins.
  // This prevents "plane crash in Iraq" from staying as "sports"
  // just because it came from a sports RSS feed.
  if (feedCategory !== "world" && (scores[feedCategory] || 0) === 0) {
    return bestCat;
  }

  // Feed category wins if it ties or beats the best keyword score
  if ((scores[feedCategory] || 0) >= bestScore) return feedCategory;

  // If another category beats the feed category by 2+, reclassify.
  // This catches e.g. an FDA health article on a tech source.
  if (bestScore - (scores[feedCategory] || 0) >= 2) {
    return bestCat;
  }

  // For "world" feed articles, require a clear margin (2+) to reclassify.
  // A single keyword match is too weak — "space" alone shouldn't pull
  // a peace talks article into science.
  if (feedCategory === "world" && bestScore - (scores.world || 0) < 2) {
    return "world";
  }

  return bestCat;
}

// Common Spanish words that don't appear in English news headlines
const SPANISH_INDICATORS = ["recortes", "clínicas", "impuesto", "alertan", "sobre una", "asociada", "mortal", "según", "también", "después", "complicación", "gobierno", "salud", "médicos", "hospitales"];

// Google News landing pages / index pages that aren't actual articles
const LANDING_PAGE_PATTERNS = [
  /\| today's latest stories$/i,
  /\| latest news & updates$/i,
  /\| top stories$/i,
  /^latest .+ news$/i,
];

function isOpinion(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  if (OPINION_FILTERS.some((f) => text.includes(f))) return true;
  // Filter Google News landing/index pages
  if (LANDING_PAGE_PATTERNS.some((p) => p.test(title.trim()))) return true;
  // Filter non-English articles (Spanish from KFF, etc.)
  const spanishHits = SPANISH_INDICATORS.filter((w) => text.includes(w)).length;
  if (spanishHits >= 2) return true;
  return false;
}

// Aggressive title normalization for dedup — handles invisible char differences,
// source suffix variations (hyphen vs en-dash vs em-dash), and Google News quirks
export function normalizeForDedup(title = "") {
  return title
    .replace(/\s*[-\u2010-\u2015\u2212|]\s*(Reuters|AP News|Associated Press|BBC|BBC News|NPR)\s*$/i, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 50);
}

// Strip description if it just repeats the title (Google News RSS artifact)
// Only blanks when desc is JUST the title (possibly with source name appended),
// not when it starts with the title then adds new context.
function cleanDescription(title = "", desc = "") {
  if (!desc) return "";
  const normT = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normD = desc.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Description is essentially just the title (within 30 chars of extra like " AP News")
  if (normT.length > 15 && normD.startsWith(normT) && normD.length < normT.length + 30) return "";
  return desc;
}

// Strip source attribution suffix from display title
function stripSourceSuffix(title = "") {
  return title.replace(/\s*[-\u2010-\u2015\u2212|]\s*(Reuters|AP News|Associated Press|BBC|BBC News|NPR)\s*$/, "").trim();
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
  const apUrl = `https://news.google.com/rss/search?q=when:2d+"${encodeURIComponent(stateName)}"+site:apnews.com&ceid=US:en&hl=en-US&gl=US`;
  try {
    const feed = await parser.parseURL(apUrl);
    for (const item of (feed.items || []).slice(0, 20)) {
      if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
      if (isTooOld(item.isoDate || item.pubDate)) continue;
      const rawDesc = (item.contentSnippet || item.content || "").slice(0, 250);
      const desc = cleanDescription(item.title, rawDesc);
      articles.push({
        id: item.guid || item.link,
        title: item.title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: `Local ${stateCode}`,
        color: LOCAL_COLOR,
        category: classifyArticle(item.title, rawDesc, "world"),
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
        if (isTooOld(item.isoDate || item.pubDate)) continue;
        const rawDesc = (item.contentSnippet || item.content || "").slice(0, 250);
        const desc = cleanDescription(item.title, rawDesc);
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
  const seenLinks = new Set();
  const seenTitles = new Set();
  const deduped = articles.filter((a) => {
    if (seenLinks.has(a.link)) return false;
    const titleKey = normalizeForDedup(a.title);
    if (seenTitles.has(titleKey)) return false;
    seenLinks.add(a.link);
    seenTitles.add(titleKey);
    return true;
  });

  const sorted = deduped.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)).slice(0, 50);
  setCache(cacheKey, sorted);
  return sorted;
}

// Max article age — anything older than this is stale and excluded
const MAX_ARTICLE_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours

function isTooOld(pubDate) {
  if (!pubDate) return false;
  return Date.now() - new Date(pubDate).getTime() > MAX_ARTICLE_AGE_MS;
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
      if (isTooOld(item.isoDate || item.pubDate)) continue;
      const title = stripSourceSuffix(item.title);
      const rawDesc = (item.contentSnippet || item.content || "").slice(0, 250);
      const desc = cleanDescription(title, rawDesc);
      articles.push({
        id: item.guid || item.link,
        title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: source.name,
        color: source.color,
        category: classifyArticle(title, rawDesc, category),
      });
    }
  }

  // Dedupe by link AND normalized title (same article from multiple Google News searches)
  const seenLinks = new Set();
  const seenTitles = new Set();
  const deduped = articles.filter((a) => {
    if (seenLinks.has(a.link)) return false;
    const titleKey = normalizeForDedup(a.title);
    if (seenTitles.has(titleKey)) return false;
    seenLinks.add(a.link);
    seenTitles.add(titleKey);
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
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx6TVdZU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "financial" },
  { url: "https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1ZEdvU0FtVnVHZ0pWVXlnQVAB?ceid=US:en&hl=en-US&gl=US", category: "entertainment" },
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
  { url: "https://www.smithsonianmag.com/rss/latest_articles/", name: "Smithsonian", color: "#B8860B", category: "science", serendipity: true },
  { url: "https://www.atlasobscura.com/feeds/latest", name: "Atlas Obscura", color: "#C97E4A", category: "science", serendipity: true },
  // CSM — nonprofit, center of every bias chart, dry context-heavy reporting
  { url: "https://rss.csmonitor.com/feeds/world", name: "CSM", color: "#1565C0", category: "world" },
  { url: "https://rss.csmonitor.com/feeds/usa", name: "CSM", color: "#1565C0", category: "world" },
  { url: "https://rss.csmonitor.com/feeds/wam", name: "CSM", color: "#1565C0", category: "financial" },
  { url: "https://rss.csmonitor.com/feeds/science", name: "CSM", color: "#1565C0", category: "science" },
  { url: "https://rss.csmonitor.com/feeds/scitech", name: "CSM", color: "#1565C0", category: "tech" },
  // Bloomberg — data-driven financial/political wire. Free tier: headlines + summaries
  { url: "https://feeds.bloomberg.com/markets/news.rss", name: "Bloomberg", color: "#7B1FA2", category: "financial" },
  { url: "https://feeds.bloomberg.com/technology/news.rss", name: "Bloomberg", color: "#7B1FA2", category: "tech" },
  { url: "https://feeds.bloomberg.com/economics/news.rss", name: "Bloomberg", color: "#7B1FA2", category: "financial" },
  // The Hill — premier US politics/policy. Center across all 3 bias raters. Fills biggest gap.
  { url: "https://thehill.com/homenews/feed/", name: "The Hill", color: "#1E88E5", category: "world" },
  { url: "https://thehill.com/policy/feed/", name: "The Hill", color: "#1E88E5", category: "world" },
  { url: "https://thehill.com/policy/healthcare/feed/", name: "The Hill", color: "#1E88E5", category: "health" },
  { url: "https://thehill.com/policy/technology/feed/", name: "The Hill", color: "#1E88E5", category: "tech" },
  { url: "https://thehill.com/policy/energy-environment/feed/", name: "The Hill", color: "#1E88E5", category: "science" },
  { url: "https://thehill.com/business/feed/", name: "The Hill", color: "#1E88E5", category: "financial" },
  // PBS NewsHour — highest-reliability US public broadcaster. Free, no paywall.
  { url: "https://www.pbs.org/newshour/feeds/rss/headlines", name: "PBS", color: "#1976D2", category: "world" },
  { url: "https://www.pbs.org/newshour/feeds/rss/politics", name: "PBS", color: "#1976D2", category: "world" },
  { url: "https://www.pbs.org/newshour/feeds/rss/economy", name: "PBS", color: "#1976D2", category: "financial" },
  { url: "https://www.pbs.org/newshour/feeds/rss/health", name: "PBS", color: "#1976D2", category: "health" },
  { url: "https://www.pbs.org/newshour/feeds/rss/science", name: "PBS", color: "#1976D2", category: "science" },
  // Deutsche Welle — German public broadcaster, editorially independent by law. Non-Anglosphere lens.
  { url: "https://rss.dw.com/xml/rss-en-world", name: "DW", color: "#0097A7", category: "world" },
  { url: "https://rss.dw.com/xml/rss-en-bus", name: "DW", color: "#0097A7", category: "financial" },
  { url: "https://rss.dw.com/xml/rss-en-science", name: "DW", color: "#0097A7", category: "science" },
  // France 24 — French public broadcaster. Strongest on Middle East, Africa, Americas.
  { url: "https://www.france24.com/en/rss", name: "France 24", color: "#2E7D32", category: "world" },
  { url: "https://www.france24.com/en/americas/rss", name: "France 24", color: "#2E7D32", category: "world" },
  { url: "https://www.france24.com/en/middle-east/rss", name: "France 24", color: "#2E7D32", category: "world" },
  { url: "https://www.france24.com/en/health/rss", name: "France 24", color: "#2E7D32", category: "health" },
];

export async function fetchSupplementalFeeds() {
  const cached = getCached("supplemental-feeds");
  if (cached) return cached;

  const results = await Promise.allSettled(
    SUPPLEMENTAL_FEEDS.map(async ({ url, name, color, category, serendipity }) => {
      const feed = await parser.parseURL(url);
      return (feed.items || []).slice(0, 30).map((item) => ({
        item, name, color, category, serendipity: !!serendipity,
      }));
    })
  );

  const articles = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const { item, name, color, category, serendipity } of result.value) {
      if (isOpinion(item.title, item.contentSnippet || item.content)) continue;
      if (isTooOld(item.isoDate || item.pubDate)) continue;
      const rawDesc = (item.contentSnippet || item.content || "").slice(0, 250);
      if (isJournalPaper(item.title, rawDesc, name, item.link || item.guid)) continue;
      const desc = cleanDescription(item.title, rawDesc);
      articles.push({
        id: item.guid || item.link,
        title: item.title,
        description: desc,
        link: item.link,
        pubDate: item.isoDate || item.pubDate,
        source: name,
        color,
        category: classifyArticle(item.title, rawDesc, category, false),
        ...(serendipity ? { serendipity: true } : {}),
      });
    }
  }

  // Fetch meta descriptions for articles missing them (Nature)
  const needDesc = articles.filter((a) => !a.description && a.link);
  if (needDesc.length > 0) {
    await Promise.allSettled(
      needDesc.map(async (a) => {
        try {
          const res = await fetch(a.link, {
            headers: { "User-Agent": "CleanFeed/1.0 (RSS Reader)" },
            redirect: "follow",
          });
          if (!res.ok) return;
          const html = await res.text();
          const match = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
            || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
          if (match?.[1]) {
            a.description = match[1].slice(0, 250);
          }
        } catch {}
      })
    );
  }

  const seenLinks = new Set();
  const seenTitles = new Set();
  const deduped = articles.filter((a) => {
    if (seenLinks.has(a.link)) return false;
    const titleKey = normalizeForDedup(a.title);
    if (seenTitles.has(titleKey)) return false;
    seenLinks.add(a.link);
    seenTitles.add(titleKey);
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
        if (isTooOld(item.isoDate || item.pubDate)) continue;
        const title = stripSourceSuffix(item.title);
        const rawDesc = (item.contentSnippet || item.content || "").slice(0, 250);
        const desc = cleanDescription(title, rawDesc);
        articles.push({
          id: item.guid || item.link,
          title,
          description: desc,
          link: item.link,
          pubDate: item.isoDate || item.pubDate,
          source: sourceInfo.name,
          color: sourceInfo.color,
          category: classifyArticle(title, rawDesc, category, false),
        });
      }
    } catch (err) {
      console.warn(`[CleanFeed] Topic feed failed:`, err.message);
    }
  }

  const seenLinks = new Set();
  const seenTitles = new Set();
  const deduped = articles.filter((a) => {
    if (seenLinks.has(a.link)) return false;
    const titleKey = normalizeForDedup(a.title);
    if (seenTitles.has(titleKey)) return false;
    seenLinks.add(a.link);
    seenTitles.add(titleKey);
    return true;
  });

  setCache("topic-feeds", deduped);
  return deduped;
}
