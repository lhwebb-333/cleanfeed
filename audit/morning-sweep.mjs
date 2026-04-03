// Morning pre-launch sweep — articles, classification, descriptions, everything
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";
const issues = [];
function flag(msg) { issues.push(msg); console.log(`  *** ${msg}`); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  })).newPage();

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(3000);

  console.log("═══ MORNING SWEEP — MARCH 20, 2026 ═══\n");

  // Pull full feed
  const feed = await (await page.request.get(`${BASE}/api/feed?limit=1000`)).json();
  const articles = feed.articles;
  console.log(`Total articles: ${articles.length}`);
  if (feed.degraded?.length > 0) {
    flag(`DEGRADED SOURCES: ${feed.degraded.join(", ")}`);
  }

  // Source distribution
  console.log("\n--- SOURCE DISTRIBUTION ---");
  const srcDist = {};
  for (const a of articles) srcDist[a.source] = (srcDist[a.source] || 0) + 1;
  for (const [s, c] of Object.entries(srcDist).sort((a, b) => b[1] - a[1])) {
    const pct = ((c / articles.length) * 100).toFixed(1);
    console.log(`  ${s.padEnd(18)} ${String(c).padStart(4)}  (${pct}%)`);
  }

  // Category distribution
  console.log("\n--- CATEGORY DISTRIBUTION ---");
  const catDist = {};
  for (const a of articles) catDist[a.category] = (catDist[a.category] || 0) + 1;
  for (const c of ["world", "sports", "financial", "tech", "science", "health", "entertainment"]) {
    console.log(`  ${c.padEnd(15)} ${catDist[c] || 0}`);
  }

  // Description check
  console.log("\n--- DESCRIPTION CHECK ---");
  let noDesc = 0, hasDesc = 0, dupDesc = 0;
  const noDescArticles = [];
  for (const a of articles) {
    if (!a.description || a.description.length < 5) {
      noDesc++;
      noDescArticles.push(a);
    } else {
      hasDesc++;
      // Check if desc duplicates title
      const nt = a.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const nd = a.description.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nd.startsWith(nt) && nd.length < nt.length + 30) dupDesc++;
    }
  }
  console.log(`  With description: ${hasDesc}`);
  console.log(`  Without description: ${noDesc}`);
  console.log(`  Dup descriptions (client will hide): ${dupDesc}`);
  if (noDesc > 0) {
    console.log(`\n  Articles missing descriptions:`);
    for (const a of noDescArticles.slice(0, 15)) {
      console.log(`    [${a.source}] ${a.title.slice(0, 60)}`);
    }
  }

  // Misclassification check — full sweep
  console.log("\n--- MISCLASSIFICATION SWEEP ---");
  const sportSignals = /\bnba\b|\bnfl\b|\bnhl\b|\bmlb\b|premier league|cricket|rugby|goalkeeper|quarterback|touchdown|playoff|championship|tournament|soccer|relegat|striker|batting|innings/i;
  const finSignals = /stock market|wall street|interest rate|inflation|gdp|earnings|tariff|oil price|fed rate|central bank|mortgage|investor/i;
  const techSignals = /artificial intelligence|\bai\b|openai|chatgpt|cybersecurity|semiconductor|startup|robot|blockchain|software|nvidia/i;
  const healthSignals = /cancer|disease|hospital|vaccine|virus|pandemic|drug trial|mental health|diabetes|\bfda\b|\bcdc\b|pharmaceutical|outbreak/i;

  let misclassCount = 0;
  for (const a of articles) {
    const text = `${a.title} ${a.description || ""}`;
    // Sports content not in sports
    if (a.category !== "sports" && sportSignals.test(text) && !finSignals.test(text) && !techSignals.test(text)) {
      flag(`[${a.category}→sports?] "${a.title.slice(0, 55)}..." (${a.source})`);
      misclassCount++;
      if (misclassCount > 8) break;
    }
    // Non-sports in sports
    if (a.category === "sports" && !sportSignals.test(text)) {
      flag(`[sports→?] "${a.title.slice(0, 55)}..." (${a.source})`);
      misclassCount++;
      if (misclassCount > 8) break;
    }
  }
  if (misclassCount === 0) console.log("  No misclassifications found");

  // Opinion leak check
  console.log("\n--- OPINION CHECK ---");
  const opinionLeaks = articles.filter(a => {
    const t = `${a.title} ${a.description || ""}`.toLowerCase();
    return t.includes("opinion:") || t.includes("editorial:") || t.includes("op-ed:") || t.includes("commentary:");
  });
  console.log(`  Opinion leaks: ${opinionLeaks.length}`);
  for (const o of opinionLeaks.slice(0, 5)) {
    flag(`Opinion: "${o.title.slice(0, 55)}..." (${o.source})`);
  }

  // Stale check
  console.log("\n--- FRESHNESS ---");
  const now = Date.now();
  const buckets = { "< 1h": 0, "1-3h": 0, "3-6h": 0, "6-12h": 0, "12-24h": 0, "24-48h": 0, "48h+": 0 };
  for (const a of articles) {
    const age = (now - new Date(a.pubDate).getTime()) / 3600000;
    if (age < 1) buckets["< 1h"]++;
    else if (age < 3) buckets["1-3h"]++;
    else if (age < 6) buckets["3-6h"]++;
    else if (age < 12) buckets["6-12h"]++;
    else if (age < 24) buckets["12-24h"]++;
    else if (age < 48) buckets["24-48h"]++;
    else buckets["48h+"]++;
  }
  for (const [b, c] of Object.entries(buckets)) {
    console.log(`  ${b.padEnd(8)} ${c}`);
  }
  if (buckets["48h+"] > 0) flag(`${buckets["48h+"]} articles over 48h`);

  // Multi-source + dedup check
  console.log("\n--- MULTI-SOURCE & DEDUP ---");
  const multiSource = articles.filter(a => a.multiSource);
  console.log(`  Multi-source stories: ${multiSource.length}`);
  for (const m of multiSource.slice(0, 5)) {
    console.log(`    [${m.sourceCount}+ sources] "${m.title.slice(0, 55)}..."`);
  }

  // Same-source duplicates
  let dupeCount = 0;
  const bySource = {};
  for (const a of articles) {
    if (!bySource[a.source]) bySource[a.source] = [];
    bySource[a.source].push(a);
  }
  for (const [src, items] of Object.entries(bySource)) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const n1 = items[i].title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
        const n2 = items[j].title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
        const w1 = new Set(n1.split(" ").filter(w => w.length > 3));
        const w2 = n2.split(" ").filter(w => w.length > 3);
        if (w1.size >= 3) {
          const overlap = w2.filter(w => w1.has(w)).length;
          if (overlap / Math.min(w1.size, w2.length) >= 0.6) {
            dupeCount++;
            if (dupeCount <= 3) flag(`Same-source dupe [${src}]: "${items[i].title.slice(0, 40)}..." vs "${items[j].title.slice(0, 40)}..."`);
          }
        }
      }
    }
  }
  console.log(`  Same-source duplicates: ${dupeCount}`);

  // Visual check — screenshots
  console.log("\n--- VISUAL SCREENSHOTS ---");
  await page.screenshot({ path: "audit/morning-01-desktop.png", fullPage: false });

  // Scroll a bit to see article variety
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "audit/morning-02-scroll1.png", fullPage: false });

  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "audit/morning-03-scroll2.png", fullPage: false });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "audit/morning-04-mobile.png", fullPage: false });

  // First 20 article headlines for manual review
  console.log("\n--- FIRST 20 ARTICLES ---");
  for (const a of articles.slice(0, 20)) {
    const desc = a.description ? ` — ${a.description.slice(0, 50)}...` : " [no desc]";
    console.log(`  [${a.source}] ${a.category.toUpperCase()} | ${a.title.slice(0, 60)}${desc}`);
  }

  // SUMMARY
  console.log("\n\n╔═══════════════════════════════════╗");
  console.log("║   MORNING SWEEP SUMMARY            ║");
  console.log("╚═══════════════════════════════════╝\n");
  console.log(`  Articles: ${articles.length}`);
  console.log(`  Sources: ${Object.keys(srcDist).length}`);
  console.log(`  With descriptions: ${hasDesc}/${articles.length} (${((hasDesc/articles.length)*100).toFixed(0)}%)`);
  console.log(`  Stale (48h+): ${buckets["48h+"]}`);
  console.log(`  Opinion leaks: ${opinionLeaks.length}`);
  console.log(`  Multi-source: ${multiSource.length}`);
  console.log(`  Same-source dupes: ${dupeCount}`);
  console.log(`  Issues: ${issues.length}`);
  if (issues.length > 0) {
    for (const i of issues) console.log(`    ${i}`);
  } else {
    console.log("    CLEAN — ready to launch");
  }

  await browser.close();
  console.log("\n=== SWEEP COMPLETE ===");
})();
