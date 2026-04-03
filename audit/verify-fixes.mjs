// Quick verification of deployed fixes
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  console.log("=== POST-FIX VERIFICATION ===\n");

  // 1. Check feed API — stale articles
  console.log("--- STALE ARTICLE CHECK ---");
  const feedData = await (await page.request.get(`${BASE}/api/feed?limit=1000`)).json();
  const now = Date.now();
  let staleCount = 0;
  for (const a of feedData.articles) {
    const age = (now - new Date(a.pubDate).getTime()) / (60 * 60 * 1000);
    if (age > 48) staleCount++;
  }
  console.log(`  Total articles: ${feedData.count}`);
  console.log(`  Articles >48h old: ${staleCount} (was 176, should be 0)`);

  // 2. Check for Google News landing pages
  console.log("\n--- LANDING PAGE CHECK ---");
  const landingPages = feedData.articles.filter(a =>
    /\| today's latest stories$/i.test(a.title) ||
    /\| latest news & updates$/i.test(a.title)
  );
  console.log(`  Landing pages in feed: ${landingPages.length} (should be 0)`);

  // 3. Category distribution
  console.log("\n--- CATEGORY DISTRIBUTION ---");
  const catCounts = {};
  for (const a of feedData.articles) {
    catCounts[a.category] = (catCounts[a.category] || 0) + 1;
  }
  for (const cat of ["world", "sports", "entertainment", "financial", "tech", "science", "health"]) {
    console.log(`  ${cat.padEnd(15)} ${(catCounts[cat] || 0).toString().padStart(4)}`);
  }

  // 4. Check chronological order
  console.log("\n--- CHRONOLOGICAL ORDER ---");
  let outOfOrder = 0;
  for (let i = 1; i < feedData.articles.length; i++) {
    const prev = new Date(feedData.articles[i-1].pubDate).getTime();
    const curr = new Date(feedData.articles[i].pubDate).getTime();
    if (curr > prev + 60000) outOfOrder++; // 1 min tolerance
  }
  console.log(`  Out-of-order articles: ${outOfOrder} (should be 0 — truly chronological now)`);

  // 5. Load the page — check install prompt fix
  console.log("\n--- VISUAL CHECKS ---");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);

  // Check install prompt doesn't show literal \u00D7
  const installText = await page.evaluate(() => {
    const el = document.querySelector("div[style*='position: fixed'][style*='bottom']");
    return el ? el.innerText : null;
  });
  if (installText) {
    const hasLiteralUnicode = installText.includes("\\u00D7") || installText.includes("u00D7");
    console.log(`  Install prompt: ${hasLiteralUnicode ? "STILL BROKEN — shows literal \\u00D7" : "FIXED — × renders correctly"}`);
  } else {
    console.log("  Install prompt: not visible (may be dismissed)");
  }

  // Check SOURCES count
  const sourcesText = await page.$eval("button.ribbon-label", el => el.textContent);
  console.log(`  Sources ribbon: "${sourcesText.trim()}"`);
  const sourceMatch = sourcesText.match(/(\d+)\/(\d+)/);
  if (sourceMatch) {
    const [, active, total] = sourceMatch;
    console.log(`  Source count: ${active}/${total} (was 4/4, should be ~15/15)`);
  }

  // Check for duplicate descriptions in first articles
  console.log("\n--- DESCRIPTION DEDUP CHECK ---");
  const articleData = await page.$$eval("a[target='_blank']", els => {
    return els.slice(0, 15).map(el => {
      const h2 = el.querySelector("h2");
      const p = el.querySelector("p[style*='lineHeight']");
      return {
        title: h2?.textContent || "",
        desc: p?.textContent || "",
      };
    });
  });
  let dupDescCount = 0;
  for (const a of articleData) {
    if (a.desc && a.title && a.desc.toLowerCase().startsWith(a.title.toLowerCase().slice(0, 30))) {
      dupDescCount++;
      console.log(`  STILL DUPED: "${a.title.slice(0, 50)}..." → "${a.desc.slice(0, 50)}..."`);
    }
  }
  console.log(`  Articles with duplicate description: ${dupDescCount} (should be 0)`);

  // Screenshot
  await page.screenshot({ path: "audit/screenshot-post-fix.png", fullPage: false });
  console.log("\n  Screenshot saved: audit/screenshot-post-fix.png");

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: "audit/screenshot-post-fix-mobile.png", fullPage: false });
  console.log("  Mobile screenshot saved: audit/screenshot-post-fix-mobile.png");

  await browser.close();
  console.log("\n=== VERIFICATION COMPLETE ===");
})();
