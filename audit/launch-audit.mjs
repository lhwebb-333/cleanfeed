// Pre-launch final audit — everything, every feature, every pixel
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";
const issues = [];
function flag(msg) { issues.push(msg); console.log(`  *** ${msg}`); }

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ============ DESKTOP DARK ============
  console.log("═══ DESKTOP DARK (1280x900) ═══\n");
  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 },
    geolocation: { latitude: 36.16, longitude: -86.78 },
    permissions: ["geolocation"],
    colorScheme: "dark",
  })).newPage();

  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "audit/launch-01-desktop-dark.png", fullPage: false });

  // HEADER
  console.log("--- HEADER ---");
  const h1 = await page.$eval("h1", el => el.textContent);
  console.log(`  Title: "${h1}"`);
  const tagline = await page.evaluate(() => {
    const ps = document.querySelectorAll("p");
    for (const p of ps) { if (p.textContent.includes("nothing else")) return p.textContent; }
    return "not found";
  });
  console.log(`  Tagline: "${tagline}"`);

  // Live counter
  const counter = await page.$("div[style*='position: fixed'] button[title='Live stats']");
  console.log(`  Live counter: ${counter ? "YES" : "NO"}`);

  // Utility buttons
  const utilBtns = await page.$$eval("div[style*='position: fixed'][style*='right'] button", els => els.map(el => el.title || el.textContent.trim()));
  console.log(`  Utility buttons: ${utilBtns.join(", ")}`);

  // Weather
  await page.waitForTimeout(2000);
  const weather = await page.$("span[title='Toggle F/C']");
  console.log(`  Weather: ${weather ? await weather.innerText() : "not loaded"}`);

  // RIBBONS
  console.log("\n--- RIBBONS ---");

  // Sources
  const srcBtn = await page.$("button.ribbon-label:has-text('SOURCES')");
  const srcText = await srcBtn.innerText();
  console.log(`  ${srcText.trim()}`);
  await srcBtn.click(); await page.waitForTimeout(300);
  const srcPills = await page.$$eval(".ribbon-dropdown button", els => els.map(el => el.textContent.trim()));
  console.log(`  Dropdown: ${srcPills.join(", ")}`);
  if (srcPills.length < 10) flag(`Only ${srcPills.length} sources in dropdown`);
  await page.screenshot({ path: "audit/launch-02-sources.png", fullPage: false });
  await srcBtn.click(); await page.waitForTimeout(200);

  // Topics + sub-sources
  const topBtn = await page.$("button.ribbon-label:has-text('TOPICS')");
  await topBtn.click(); await page.waitForTimeout(300);
  const catPills = await page.$$eval(".ribbon-dropdown button", els => els.map(el => el.textContent.trim()));
  console.log(`  Topics: ${catPills.join(", ")}`);

  // Expand each sub-source
  for (const cat of ["World", "Tech", "Health", "Science", "Financial"]) {
    const expander = await page.$(`.ribbon-dropdown button:has-text('${cat}') + button`);
    if (expander) {
      await expander.click(); await page.waitForTimeout(200);
    }
  }
  await page.screenshot({ path: "audit/launch-03-topics-expanded.png", fullPage: false });
  await topBtn.click(); await page.waitForTimeout(200);

  // Sports
  const sportBtn = await page.$("button.ribbon-label:has-text('SPORTS')");
  if (sportBtn) {
    await sportBtn.click(); await page.waitForTimeout(300);
    const leagues = await page.$$eval(".ribbon-dropdown button", els => els.map(el => el.textContent.trim()));
    console.log(`  Sports: ${leagues.join(", ")}`);
    await page.screenshot({ path: "audit/launch-04-sports.png", fullPage: false });
    await sportBtn.click(); await page.waitForTimeout(200);
  }

  // Markets
  const mktBtn = await page.$("button.ribbon-label:has-text('MARKETS')");
  if (mktBtn) {
    await mktBtn.click(); await page.waitForTimeout(300);
    await page.screenshot({ path: "audit/launch-05-markets.png", fullPage: false });
    await mktBtn.click(); await page.waitForTimeout(200);
  }

  // Today — check two columns
  const todayBtn = await page.$("button.ribbon-label:has-text('TODAY')");
  if (todayBtn) {
    await todayBtn.click(); await page.waitForTimeout(500);
    const hasBreaking = await page.evaluate(() => document.body.innerText.includes("BREAKING"));
    const hasTopStories = await page.evaluate(() => document.body.innerText.includes("TOP STORIES"));
    console.log(`  Today: TOP STORIES=${hasTopStories}, BREAKING=${hasBreaking}`);
    await page.screenshot({ path: "audit/launch-06-today.png", fullPage: false });
    await todayBtn.click(); await page.waitForTimeout(200);
  }

  // Filters — should be collapsed
  const filterText = await page.$eval("button.ribbon-label:has-text('FILTERS')", el => el.textContent.trim());
  console.log(`  Filters: "${filterText}" (should be collapsed)`);

  // FEED HEADER
  console.log("\n--- FEED HEADER ---");
  const feedBtns = await page.evaluate(() => {
    const all = [];
    document.querySelectorAll("button").forEach(b => {
      const t = b.textContent.trim();
      if (["MUTE POLITICS","FAMILY MODE","3H","12H","24H"].includes(t)) all.push(t);
    });
    return all;
  });
  console.log(`  Buttons: ${feedBtns.join(" | ")}`);
  if (!feedBtns.includes("3H")) flag("3H button missing");
  if (!feedBtns.includes("MUTE POLITICS")) flag("MUTE POLITICS missing");

  // ARTICLES
  console.log("\n--- ARTICLES ---");
  const feed = await (await page.request.get(`${BASE}/api/feed?limit=1000`)).json();
  const articles = feed.articles;
  console.log(`  Total: ${articles.length}`);

  // Source distribution
  const srcDist = {};
  for (const a of articles) srcDist[a.source] = (srcDist[a.source] || 0) + 1;
  console.log(`  Sources (${Object.keys(srcDist).length}):`);
  for (const [s, c] of Object.entries(srcDist).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
    console.log(`    ${s.padEnd(18)} ${c}`);
  }

  // Category distribution
  const catDist = {};
  for (const a of articles) catDist[a.category] = (catDist[a.category] || 0) + 1;
  console.log(`  Categories:`);
  for (const c of ["world","sports","financial","tech","science","health","entertainment"]) {
    console.log(`    ${c.padEnd(15)} ${catDist[c] || 0}`);
  }

  // Stale articles
  const stale = articles.filter(a => Date.now() - new Date(a.pubDate).getTime() > 48 * 3600000);
  console.log(`  Stale (>48h): ${stale.length}`);
  if (stale.length > 0) flag(`${stale.length} stale articles`);

  // Opinion leaks
  const opinions = articles.filter(a => {
    const t = `${a.title} ${a.description || ""}`.toLowerCase();
    return t.includes("opinion:") || t.includes("editorial:") || t.includes("op-ed:");
  });
  console.log(`  Opinion leaks: ${opinions.length}`);
  if (opinions.length > 0) flag(`${opinions.length} opinion articles leaked through`);

  // Duplicate descriptions
  let dupDescs = 0;
  for (const a of articles.slice(0, 50)) {
    if (a.description && a.title) {
      const nt = a.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const nd = a.description.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (nd.startsWith(nt) && nd.length < nt.length + 30) dupDescs++;
    }
  }
  console.log(`  Dup descriptions: ${dupDescs}/50`);

  // Multi-source stories
  const multiSource = articles.filter(a => a.multiSource);
  console.log(`  Multi-source: ${multiSource.length}`);

  // Serendipity
  const discover = articles.filter(a => a.serendipity);
  console.log(`  DISCOVER: ${discover.length}`);

  // Story arcs
  const arcs = articles.filter(a => a.storyArc);
  console.log(`  Story arcs: ${arcs.length}`);

  // Spot check misclassifications
  console.log("\n--- MISCLASSIFICATION CHECK (first 40) ---");
  let misclass = 0;
  for (const a of articles.slice(0, 40)) {
    const t = `${a.title} ${a.description || ""}`.toLowerCase();
    if (a.category !== "sports" && (t.includes("nba ") || t.includes("nfl ") || t.includes("premier league") || t.includes("cricket") || t.includes("goalkeeper"))) {
      flag(`[${a.category}→sports] "${a.title.slice(0, 50)}..." (${a.source})`);
      misclass++;
    }
    if (a.category === "sports" && !t.match(/sport|nba|nfl|nhl|mlb|soccer|football|basketball|baseball|hockey|tennis|golf|cricket|rugby|f1|pga|ncaa|premier|championship|playoff|tournament|athlete|coach|referee|stadium|relegat|striker|goalkeeper|quarterback/)) {
      flag(`[sports but no sports keywords] "${a.title.slice(0, 50)}..." (${a.source})`);
      misclass++;
    }
  }
  if (misclass === 0) console.log("  No misclassifications found");

  // MUTE POLITICS FLOW
  console.log("\n--- MUTE POLITICS ---");
  const muteBtn = await page.$("button:has-text('MUTE POLITICS')");
  const beforeMute = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  await muteBtn.click(); await page.waitForTimeout(800);
  const afterMute = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  console.log(`  Before: ${beforeMute}, After: ${afterMute}, Removed: ${beforeMute - afterMute}`);
  await page.screenshot({ path: "audit/launch-07-muted.png", fullPage: false });
  // Unmute
  const unmuteBtn = await page.$("button:has-text('POLITICS')");
  if (unmuteBtn) await unmuteBtn.click();
  await page.waitForTimeout(500);

  // 3H MODE
  console.log("\n--- 3H MODE ---");
  const btn3h = await page.$("button:has-text('3H')");
  if (btn3h) {
    await btn3h.click(); await page.waitForTimeout(500);
    const count3h = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    console.log(`  3H articles: ${count3h}`);
    await page.screenshot({ path: "audit/launch-08-3h.png", fullPage: false });
    const btn24h = await page.$("button:has-text('24H')");
    if (btn24h) await btn24h.click();
    await page.waitForTimeout(300);
  }

  // SCROLL + FOOTER
  console.log("\n--- FOOTER ---");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const caughtUp = await page.$("text=You're caught up");
  const loadEarlier = await page.$("button:has-text('LOAD EARLIER')");
  const digestForm = await page.$("input[placeholder='you@email.com']");
  const readerLink = await page.evaluate(() => document.body.innerText.includes("Reader mode"));
  const shareBtn = await page.$("button:has-text('SHARE CLEAN FEED')");
  console.log(`  "You're caught up": ${!!caughtUp}`);
  console.log(`  LOAD EARLIER: ${!!loadEarlier}`);
  console.log(`  Digest signup: ${!!digestForm}`);
  console.log(`  Reader mode link: ${readerLink}`);
  console.log(`  Share button: ${!!shareBtn}`);
  await page.screenshot({ path: "audit/launch-09-footer.png", fullPage: false });

  // ============ LIGHT MODE ============
  console.log("\n═══ LIGHT MODE ═══");
  const themeBtn = await page.$("button[title='Toggle theme']");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  if (themeBtn) {
    await themeBtn.click(); await page.waitForTimeout(500);
    await page.screenshot({ path: "audit/launch-10-light.png", fullPage: false });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`  Background: ${bg}`);
    await themeBtn.click(); await page.waitForTimeout(300);
  }

  // ============ MOBILE ============
  console.log("\n═══ MOBILE (390x844) ═══");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "audit/launch-11-mobile.png", fullPage: false });
  const mobileArticles = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  console.log(`  Articles: ${mobileArticles}`);
  // Scroll to bottom on mobile
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "audit/launch-12-mobile-footer.png", fullPage: false });

  // ============ E-READER ============
  console.log("\n═══ E-READER ═══");
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto(`${BASE}/api/reader`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "audit/launch-13-reader.png", fullPage: false });
  const readerArticles = await page.$$eval(".article", els => els.length);
  const readerCats = await page.$$eval("h2", els => els.map(el => el.textContent));
  const readerScripts = await page.$$eval("script", els => els.length);
  console.log(`  Articles: ${readerArticles}`);
  console.log(`  Categories: ${readerCats.join(", ")}`);
  console.log(`  Scripts: ${readerScripts} (should be 0)`);
  if (readerScripts > 0) flag("Reader mode has JavaScript");

  // ============ DIGEST EMAIL ============
  console.log("\n═══ DIGEST ═══");
  await page.goto(`${BASE}/api/digest`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "audit/launch-14-digest.png", fullPage: false });
  const digestText = await page.evaluate(() => document.body.innerText);
  console.log(`  Has MARKETS: ${digestText.includes("MARKETS")}`);
  console.log(`  Has OVERNIGHT: ${digestText.includes("OVERNIGHT") || digestText.includes("Overnight")}`);
  console.log(`  Has TOP STORIES: ${digestText.includes("TOP STORIES") || digestText.includes("Top Stories")}`);
  console.log(`  Has DEVELOPING: ${digestText.includes("DEVELOPING") || digestText.includes("Developing")}`);
  console.log(`  Has WORTH READING: ${digestText.includes("WORTH READING") || digestText.includes("Worth Reading")}`);
  console.log(`  Has unsubscribe: ${digestText.includes("Unsubscribe")}`);
  console.log(`  Has no-tracking pledge: ${digestText.includes("no tracking")}`);

  // ============ API HEALTH ============
  console.log("\n═══ API ENDPOINTS ═══");
  const endpoints = ["feed?limit=5", "markets", "scores", "weather?lat=36.16&lon=-86.78", "today?lat=36.16&lon=-86.78", "financial-feed?limit=5", "local-feed?state=TN", "subscribe", "reader", "digest"];
  for (const ep of endpoints) {
    try {
      const t0 = Date.now();
      const r = await page.request.get(`${BASE}/api/${ep}`);
      const ms = Date.now() - t0;
      const ok = r.status() === 200;
      console.log(`  ${ok ? "✓" : "✗"} /api/${ep.split("?")[0].padEnd(18)} ${r.status()} ${ms}ms`);
      if (!ok) flag(`/api/${ep} returned ${r.status()}`);
    } catch (e) {
      console.log(`  ✗ /api/${ep.split("?")[0].padEnd(18)} FAILED`);
      flag(`/api/${ep} failed: ${e.message}`);
    }
  }

  // ============ SUMMARY ============
  console.log("\n\n╔══════════════════════════════════╗");
  console.log("║     PRE-LAUNCH AUDIT SUMMARY     ║");
  console.log("╚══════════════════════════════════╝\n");
  console.log(`  JS errors: ${jsErrors.length}`);
  if (jsErrors.length > 0) for (const e of jsErrors) console.log(`    ${e.slice(0, 100)}`);
  console.log(`  Issues: ${issues.length}`);
  if (issues.length > 0) for (const i of issues) console.log(`    ${i}`);
  else console.log("    NONE — ready to ship");
  console.log(`\n  Articles: ${articles.length}`);
  console.log(`  Sources: ${Object.keys(srcDist).length}`);
  console.log(`  Categories: ${Object.keys(catDist).length}`);
  console.log(`  Multi-source: ${multiSource.length}`);
  console.log(`  DISCOVER: ${discover.length}`);

  await browser.close();
  console.log("\n=== AUDIT COMPLETE ===");
})();
