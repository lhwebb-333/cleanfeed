// E-Reader mode audit
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Desktop e-reader
  console.log("═══ E-READER MODE AUDIT ═══\n");

  const ctx = await browser.newContext({ viewport: { width: 600, height: 800 } });
  const page = await ctx.newPage();

  const t0 = Date.now();
  const res = await page.goto(`${BASE}/api/reader`, { waitUntil: "networkidle", timeout: 30000 });
  const loadTime = Date.now() - t0;
  console.log(`Load time: ${loadTime}ms`);
  console.log(`Status: ${res.status()}`);
  console.log(`Content-Type: ${res.headers()["content-type"]}`);

  await page.screenshot({ path: "audit/deep-reader-desktop.png", fullPage: false });
  console.log(`Screenshot: audit/deep-reader-desktop.png`);

  // Check basic structure
  const title = await page.title();
  console.log(`Title: "${title}"`);

  const h1 = await page.$eval("h1", el => el.textContent);
  console.log(`H1: "${h1}"`);

  const tagline = await page.$eval(".tagline", el => el.textContent);
  console.log(`Tagline: "${tagline}"`);

  const date = await page.$eval(".date", el => el.textContent);
  console.log(`Date: "${date}"`);

  // Check categories present
  const h2s = await page.$$eval("h2", els => els.map(el => ({ id: el.id, text: el.textContent })));
  console.log(`\nCategories (${h2s.length}):`);
  for (const h of h2s) {
    console.log(`  #${h.id}: ${h.text}`);
  }

  // Check articles per category
  const articles = await page.$$eval(".article", els => els.map(el => ({
    meta: el.querySelector(".meta")?.textContent || "",
    title: el.querySelector(".title")?.textContent?.slice(0, 70) || "",
    hasDesc: !!el.querySelector(".desc"),
    link: el.querySelector("a")?.href || "",
  })));
  console.log(`\nTotal articles: ${articles.length}`);

  // Group by category (based on which h2 they follow)
  const catArticles = {};
  let currentCat = "unknown";
  const allElements = await page.$$("h2, .article");
  for (const el of allElements) {
    const tag = await el.evaluate(e => e.tagName);
    if (tag === "H2") {
      currentCat = await el.evaluate(e => e.textContent);
    } else {
      if (!catArticles[currentCat]) catArticles[currentCat] = [];
      const info = await el.evaluate(e => ({
        meta: e.querySelector(".meta")?.textContent || "",
        title: e.querySelector(".title a")?.textContent?.slice(0, 60) || "",
      }));
      catArticles[currentCat].push(info);
    }
  }

  console.log("\nArticles per category:");
  for (const [cat, items] of Object.entries(catArticles)) {
    console.log(`  ${cat}: ${items.length}`);
    // Check for duplicates within category
    const titles = items.map(i => i.title.toLowerCase());
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    if (dupes.length > 0) {
      console.log(`    DUPLICATES: ${dupes.join(", ")}`);
    }
    // Show sample
    for (const item of items.slice(0, 3)) {
      console.log(`    [${item.meta.split("·")[0].trim()}] ${item.title}`);
    }
  }

  // Check links all work (just verify they have hrefs)
  const brokenLinks = articles.filter(a => !a.link || !a.link.startsWith("http"));
  console.log(`\nBroken/missing links: ${brokenLinks.length}`);

  // Check for jump links at top
  const jumpLinks = await page.$$eval(".meta a", els => els.map(el => ({
    text: el.textContent,
    href: el.getAttribute("href"),
  })));
  console.log(`Jump links: ${jumpLinks.map(l => `${l.text}→${l.href}`).join(", ")}`);

  // Light/dark toggle
  console.log("\n--- Light/Dark Toggle ---");
  const toggleBtn = await page.$(".toggle");
  if (toggleBtn) {
    const btnText = await toggleBtn.innerText();
    console.log(`Toggle button: "${btnText}"`);
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: "audit/deep-reader-dark.png", fullPage: false });
    console.log("Screenshot: audit/deep-reader-dark.png (toggled)");
  }

  // Footer
  const footer = await page.$eval(".footer", el => el.textContent);
  console.log(`\nFooter: "${footer.trim()}"`);

  // Kindle/E-ink simulation (grayscale check)
  console.log("\n--- E-ink Simulation (320x480) ---");
  await page.setViewportSize({ width: 320, height: 480 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "audit/deep-reader-eink.png", fullPage: false });
  console.log("Screenshot: audit/deep-reader-eink.png");

  // Check: no JavaScript loaded (key feature)
  const scripts = await page.$$eval("script", els => els.length);
  console.log(`\nScript tags in reader mode: ${scripts}`);
  if (scripts > 1) {
    console.log("  WARNING: Reader mode should have zero or minimal JS");
  }

  // Spot check for misclassified articles
  console.log("\n--- Spot Check: Misclassifications in Reader ---");
  for (const [cat, items] of Object.entries(catArticles)) {
    for (const item of items) {
      const text = `${item.title} ${item.meta}`.toLowerCase();
      // Sports in non-sports
      if (cat !== "sports" && (text.includes("nba") || text.includes("nfl") || text.includes("premier league") || text.includes("goalkeeper") || text.includes("cricket"))) {
        console.log(`  [${cat}] Sports content: "${item.title}"`);
      }
      // Financial in non-financial
      if (cat !== "financial" && (text.includes("stock market") || text.includes("interest rate") || text.includes("fed rate"))) {
        console.log(`  [${cat}] Financial content: "${item.title}"`);
      }
    }
  }

  await browser.close();
  console.log("\n═══ E-READER AUDIT COMPLETE ═══");
})();
