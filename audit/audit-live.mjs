// Playwright audit of thecleanfeed.app — article buckets, duplicates, coverage gaps
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";

async function fetchJSON(page, url) {
  const res = await page.request.get(url);
  return res.json();
}

function normalize(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

// Keywords that strongly signal a category — used to check misclassification
const CATEGORY_SIGNALS = {
  sports: ["nba", "nfl", "nhl", "mlb", "premier league", "champions league", "touchdown", "goalkeeper", "quarterback", "playoff", "tournament", "championship", "soccer", "football", "basketball", "baseball", "hockey", "tennis", "golf", "f1", "formula 1", "grand prix", "pga", "ncaa", "march madness", "celtics", "lakers", "yankees", "dodgers", "cowboys", "steelers", "arsenal", "liverpool", "manchester", "chelsea", "tottenham"],
  financial: ["stock market", "wall street", "nasdaq", "s&p 500", "dow jones", "fed rate", "interest rate", "inflation", "gdp", "recession", "ipo", "earnings", "quarterly results", "bond yield", "cryptocurrency", "bitcoin", "tariff", "trade deficit", "unemployment rate", "jobs report", "oil price", "opec", "central bank", "rate hike", "rate cut", "investor", "hedge fund"],
  tech: ["artificial intelligence", " ai ", "openai", "chatgpt", "microsoft", "apple", "google", "nvidia", "semiconductor", "startup", "cybersecurity", "data breach", "blockchain", "machine learning", "self-driving", "robot", "5g", "quantum computing", "chip maker", "gpu"],
  science: ["nasa", "climate change", "fossil", "species", "evolution", "genome", "dna", "physics", "earthquake", "volcano", "telescope", "mars", "satellite", "galaxy", "black hole", "renewable energy", "biodiversity", "extinction", "neuroscience"],
  health: ["cancer", "disease", "hospital", "vaccine", "virus", "pandemic", "drug trial", "clinical trial", "mental health", "obesity", "diabetes", "fda", "cdc", "pharmaceutical", "therapy", "outbreak", "public health", "dementia", "alzheimer"],
  entertainment: ["movie", "film", "box office", "oscar", "emmy", "grammy", "netflix", "disney", "hbo", "concert", "album", "broadway", "celebrity", "video game", "playstation", "xbox", "nintendo"],
};

function detectCategory(title, description) {
  const text = `${title} ${description || ""}`.toLowerCase();
  const scores = {};
  for (const [cat, keywords] of Object.entries(CATEGORY_SIGNALS)) {
    scores[cat] = keywords.filter(kw => text.includes(kw)).length;
  }
  let best = null, bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return bestScore >= 2 ? best : null; // Only flag if 2+ strong signals
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  console.log("=== CLEANFEED LIVE AUDIT ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // 1. Fetch feed API
  console.log("--- FETCHING /api/feed?limit=1000 ---");
  let feedData;
  try {
    feedData = await fetchJSON(page, `${BASE}/api/feed?limit=1000`);
    console.log(`Total articles: ${feedData.count}`);
  } catch (e) {
    console.error("FEED FETCH FAILED:", e.message);
    await browser.close();
    process.exit(1);
  }

  const articles = feedData.articles || [];

  // 2. Category distribution
  console.log("\n--- CATEGORY DISTRIBUTION ---");
  const catCounts = {};
  for (const a of articles) {
    catCounts[a.category] = (catCounts[a.category] || 0) + 1;
  }
  const catOrder = ["world", "sports", "entertainment", "financial", "tech", "science", "health"];
  for (const cat of catOrder) {
    const count = catCounts[cat] || 0;
    const pct = ((count / articles.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.round(count / 5));
    console.log(`  ${cat.padEnd(15)} ${String(count).padStart(4)}  (${pct}%)  ${bar}`);
  }
  // Check for unknown categories
  for (const cat of Object.keys(catCounts)) {
    if (!catOrder.includes(cat)) {
      console.log(`  ⚠ UNKNOWN CATEGORY: "${cat}" — ${catCounts[cat]} articles`);
    }
  }

  // 3. Source distribution
  console.log("\n--- SOURCE DISTRIBUTION ---");
  const srcCounts = {};
  for (const a of articles) {
    srcCounts[a.source] = (srcCounts[a.source] || 0) + 1;
  }
  const sortedSources = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sortedSources) {
    console.log(`  ${src.padEnd(20)} ${String(count).padStart(4)}`);
  }

  // 4. Misclassified articles — strong signal in wrong bucket
  console.log("\n--- POTENTIAL MISCLASSIFICATIONS ---");
  let misclassCount = 0;
  for (const a of articles) {
    const detected = detectCategory(a.title, a.description);
    if (detected && detected !== a.category && a.category !== "world") {
      // world is catch-all, don't flag world->specific
      misclassCount++;
      if (misclassCount <= 50) {
        console.log(`  [${a.category} → should be ${detected}] "${a.title.slice(0, 80)}..." (${a.source})`);
      }
    }
  }
  // Also check world articles that should be specific
  let worldMisclass = 0;
  for (const a of articles) {
    if (a.category !== "world") continue;
    const detected = detectCategory(a.title, a.description);
    if (detected) {
      worldMisclass++;
      if (worldMisclass <= 30) {
        console.log(`  [world → should be ${detected}] "${a.title.slice(0, 80)}..." (${a.source})`);
      }
    }
  }
  console.log(`\n  Total non-world misclassified: ${misclassCount}`);
  console.log(`  Total world articles that belong in specific bucket: ${worldMisclass}`);

  // 5. Duplicate detection — same source, similar title
  console.log("\n--- DUPLICATE ARTICLES (same source) ---");
  const bySource = {};
  for (const a of articles) {
    if (!bySource[a.source]) bySource[a.source] = [];
    bySource[a.source].push(a);
  }

  let dupeCount = 0;
  const dupeDetails = [];
  for (const [source, items] of Object.entries(bySource)) {
    const normalized = items.map(a => ({ norm: normalize(a.title), title: a.title, category: a.category, pubDate: a.pubDate }));
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const aWords = new Set(normalized[i].norm.split(" ").filter(w => w.length > 3));
        const bWords = normalized[j].norm.split(" ").filter(w => w.length > 3);
        if (aWords.size < 3) continue;
        const overlap = bWords.filter(w => aWords.has(w)).length;
        const ratio = overlap / Math.min(aWords.size, bWords.length);
        if (ratio >= 0.6 && overlap >= 3) {
          dupeCount++;
          if (dupeDetails.length < 40) {
            dupeDetails.push({ source, a: normalized[i].title.slice(0, 70), b: normalized[j].title.slice(0, 70), catA: normalized[i].category, catB: normalized[j].category });
          }
        }
      }
    }
  }
  for (const d of dupeDetails) {
    console.log(`  [${d.source}] ${d.catA}/${d.catB}`);
    console.log(`    A: "${d.a}..."`);
    console.log(`    B: "${d.b}..."`);
  }
  console.log(`\n  Total same-source duplicates: ${dupeCount}`);

  // 6. Cross-source duplicates that weren't caught by dedup
  console.log("\n--- CROSS-SOURCE NEAR-DUPLICATES (missed by dedup) ---");
  let crossDupeCount = 0;
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < Math.min(i + 50, articles.length); j++) {
      if (articles[i].source === articles[j].source) continue;
      if (articles[i].multiSource || articles[j].multiSource) continue;
      const aWords = new Set(normalize(articles[i].title).split(" ").filter(w => w.length > 3));
      const bWords = normalize(articles[j].title).split(" ").filter(w => w.length > 3);
      if (aWords.size < 3) continue;
      const overlap = bWords.filter(w => aWords.has(w)).length;
      const ratio = overlap / Math.min(aWords.size, bWords.length);
      if (ratio >= 0.5 && overlap >= 4) {
        crossDupeCount++;
        if (crossDupeCount <= 20) {
          console.log(`  [${articles[i].source} + ${articles[j].source}]`);
          console.log(`    A: "${articles[i].title.slice(0, 80)}..."`);
          console.log(`    B: "${articles[j].title.slice(0, 80)}..."`);
        }
      }
    }
  }
  console.log(`\n  Total cross-source near-dupes missed: ${crossDupeCount}`);

  // 7. Coverage gaps — articles per category per source
  console.log("\n--- COVERAGE MATRIX (source x category) ---");
  const matrix = {};
  for (const a of articles) {
    const key = `${a.source}|${a.category}`;
    matrix[key] = (matrix[key] || 0) + 1;
  }
  const allSources = [...new Set(articles.map(a => a.source))].sort();
  const header = "Source".padEnd(20) + catOrder.map(c => c.slice(0, 6).padStart(7)).join("");
  console.log(`  ${header}`);
  console.log(`  ${"─".repeat(header.length)}`);
  for (const src of allSources) {
    const row = src.padEnd(20) + catOrder.map(cat => {
      const count = matrix[`${src}|${cat}`] || 0;
      return String(count || "·").padStart(7);
    }).join("");
    console.log(`  ${row}`);
  }

  // 8. Age distribution — are we getting fresh content?
  console.log("\n--- ARTICLE AGE DISTRIBUTION ---");
  const now = Date.now();
  const ageBuckets = { "< 1h": 0, "1-3h": 0, "3-6h": 0, "6-12h": 0, "12-24h": 0, "24-48h": 0, "48h+": 0 };
  for (const a of articles) {
    const age = (now - new Date(a.pubDate).getTime()) / (60 * 60 * 1000);
    if (age < 1) ageBuckets["< 1h"]++;
    else if (age < 3) ageBuckets["1-3h"]++;
    else if (age < 6) ageBuckets["3-6h"]++;
    else if (age < 12) ageBuckets["6-12h"]++;
    else if (age < 24) ageBuckets["12-24h"]++;
    else if (age < 48) ageBuckets["24-48h"]++;
    else ageBuckets["48h+"]++;
  }
  for (const [bucket, count] of Object.entries(ageBuckets)) {
    console.log(`  ${bucket.padEnd(10)} ${String(count).padStart(4)}  ${"█".repeat(Math.round(count / 3))}`);
  }

  // 9. Fetch other endpoints for health check
  console.log("\n--- API ENDPOINT HEALTH ---");
  const endpoints = [
    { url: `${BASE}/api/feed?limit=10`, name: "feed" },
    { url: `${BASE}/api/markets`, name: "markets" },
    { url: `${BASE}/api/scores`, name: "scores" },
    { url: `${BASE}/api/today?lat=36.16&lon=-86.78`, name: "today" },
    { url: `${BASE}/api/weather?lat=36.16&lon=-86.78`, name: "weather" },
    { url: `${BASE}/api/financial-feed?limit=10`, name: "financial-feed" },
    { url: `${BASE}/api/financial-indicators`, name: "financial-indicators" },
    { url: `${BASE}/api/local-feed?state=TN`, name: "local-feed (TN)" },
    { url: `${BASE}/api/reader`, name: "reader" },
  ];
  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const res = await page.request.get(ep.url);
      const ms = Date.now() - start;
      const status = res.status();
      const ct = res.headers()["content-type"] || "";
      let detail = "";
      if (ct.includes("json")) {
        const json = await res.json();
        detail = json.ok ? `ok=true` : `ok=false, error=${json.error}`;
        if (json.count != null) detail += `, count=${json.count}`;
        if (json.indicators) detail += `, indicators=${json.indicators.length}`;
        if (json.games) detail += `, games=${json.games.length}`;
      } else {
        const text = await res.text();
        detail = `html ${text.length} bytes`;
      }
      const icon = status === 200 ? "✓" : "✗";
      console.log(`  ${icon} ${ep.name.padEnd(22)} ${status}  ${ms}ms  ${detail}`);
    } catch (e) {
      console.log(`  ✗ ${ep.name.padEnd(22)} FAILED: ${e.message}`);
    }
  }

  // 10. Visual audit — load the page, check for render errors
  console.log("\n--- VISUAL AUDIT ---");
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000); // Let feed load

  // Check key elements exist
  const checks = [
    { sel: "h1", desc: "CLEAN FEED header" },
    { sel: "input[placeholder='Search...']", desc: "Search box" },
    { sel: "button:has-text('SOURCES')", desc: "Sources ribbon" },
    { sel: "button:has-text('TOPICS')", desc: "Topics ribbon" },
    { sel: "button:has-text('MARKETS')", desc: "Markets ribbon" },
    { sel: "button:has-text('TODAY')", desc: "Today ribbon" },
    { sel: "button:has-text('FILTERS')", desc: "Filters ribbon" },
  ];
  for (const check of checks) {
    const el = await page.$(check.sel);
    console.log(`  ${el ? "✓" : "✗"} ${check.desc}`);
  }

  // Count visible articles
  const articleCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  console.log(`  Visible articles rendered: ${articleCount}`);

  if (errors.length > 0) {
    console.log(`\n  Console errors (${errors.length}):`);
    for (const e of errors.slice(0, 10)) {
      console.log(`    ${e.slice(0, 120)}`);
    }
  } else {
    console.log("  No JS errors detected");
  }

  // 11. Multi-source stories
  console.log("\n--- MULTI-SOURCE STORIES ---");
  const multiSource = articles.filter(a => a.multiSource);
  console.log(`  Total multi-source stories: ${multiSource.length}`);
  for (const a of multiSource.slice(0, 10)) {
    console.log(`  [${a.sourceCount}+ sources] "${a.title.slice(0, 70)}..." (${a.coveredBy?.join(", ")})`);
  }

  // 12. Serendipity articles
  console.log("\n--- SERENDIPITY (DISCOVER) ARTICLES ---");
  const serendipity = articles.filter(a => a.serendipity);
  console.log(`  Total: ${serendipity.length}`);
  for (const a of serendipity.slice(0, 5)) {
    console.log(`  [${a.source}] "${a.title.slice(0, 80)}..."`);
  }

  // 13. Story arcs
  console.log("\n--- RUNNING STORY ARCS ---");
  const withArcs = articles.filter(a => a.storyArc);
  const arcKeywords = [...new Set(withArcs.map(a => a.storyArc.keyword))];
  console.log(`  Total articles with arcs: ${withArcs.length}`);
  console.log(`  Unique story arcs: ${arcKeywords.length}`);
  for (const kw of arcKeywords.slice(0, 5)) {
    const first = withArcs.find(a => a.storyArc.keyword === kw);
    console.log(`  "${kw}" — ${first.storyArc.articleCount} articles over ${first.storyArc.dayCount} days`);
  }

  await browser.close();
  console.log("\n=== AUDIT COMPLETE ===");
})();
