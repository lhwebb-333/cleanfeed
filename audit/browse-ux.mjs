// Full UX audit — browse thecleanfeed.app as each user archetype would
import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });
  const page = await ctx.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(`JS ERROR: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`CONSOLE: ${msg.text()}`);
  });

  console.log("=== UX AUDIT — FRESH USER EXPERIENCE ===\n");

  // 1. FIRST LOAD — what does a new user see?
  console.log("--- FIRST LOAD ---");
  const t0 = Date.now();
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  const loadTime = Date.now() - t0;
  console.log(`  Page load: ${loadTime}ms`);

  // Wait for articles to render
  await page.waitForSelector("h2", { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Screenshot the initial view
  await page.screenshot({ path: "audit/screenshot-desktop-dark.png", fullPage: false });
  console.log("  Screenshot saved: audit/screenshot-desktop-dark.png");

  // 2. HEADER ASSESSMENT
  console.log("\n--- HEADER ---");
  const headerText = await page.$eval("header", el => el.innerText);
  console.log(`  Header text:\n    ${headerText.replace(/\n/g, "\n    ")}`);

  // 3. CHECK: Is the feed actually chronological?
  console.log("\n--- CHRONOLOGICAL ORDER CHECK ---");
  const articleTimes = await page.$$eval("a[target='_blank']", els => {
    return els.slice(0, 20).map(el => {
      const timeEl = el.querySelector("span[style*='letterSpacing']");
      return timeEl ? timeEl.textContent : null;
    }).filter(Boolean);
  });
  console.log(`  First 20 article timestamps: ${articleTimes.join(", ")}`);

  // Check if timestamps are monotonically decreasing (newest first)
  const timePattern = /(\d+)(m|h|d) ago/;
  let isChronological = true;
  let prevMinutes = 0;
  for (const t of articleTimes) {
    const match = t.match(timePattern);
    if (!match) continue;
    const val = parseInt(match[1]);
    const unit = match[2];
    const mins = unit === "m" ? val : unit === "h" ? val * 60 : val * 1440;
    if (mins < prevMinutes - 5) { // 5 min tolerance
      isChronological = false;
      console.log(`  BREAK: "${t}" appears after older content`);
    }
    prevMinutes = mins;
  }
  console.log(`  Chronological: ${isChronological ? "YES" : "NO — articles are NOT in time order"}`);

  // 4. RIBBON BARS — what info density does the user see?
  console.log("\n--- RIBBON BARS (collapsed state) ---");
  const ribbonTexts = await page.$$eval("button.ribbon-label", els => els.map(el => el.textContent.trim()));
  for (const r of ribbonTexts) {
    console.log(`  [${r}]`);
  }

  // 5. ARTICLE QUALITY SPOT-CHECK — first 10 articles
  console.log("\n--- FIRST 10 ARTICLES (what user sees on load) ---");
  const firstArticles = await page.$$eval("a[target='_blank']", els => {
    return els.slice(0, 10).map(el => {
      const h2 = el.querySelector("h2");
      const spans = el.querySelectorAll("span");
      const source = spans[0]?.textContent || "";
      const category = spans[1]?.textContent || "";
      const time = spans[2]?.textContent || "";
      return {
        title: h2?.textContent?.slice(0, 80) || "(no title)",
        source,
        category,
        time,
      };
    });
  });
  for (const a of firstArticles) {
    console.log(`  [${a.source}] ${a.category} | ${a.time}`);
    console.log(`    ${a.title}`);
  }

  // 6. CATEGORY DIVERSITY in first 20 articles
  console.log("\n--- CATEGORY MIX (first 20 articles) ---");
  const first20Cats = await page.$$eval("a[target='_blank']", els => {
    return els.slice(0, 20).map(el => {
      const spans = el.querySelectorAll("span");
      return spans[1]?.textContent?.trim() || "unknown";
    });
  });
  const catCount = {};
  for (const c of first20Cats) { catCount[c] = (catCount[c] || 0) + 1; }
  for (const [cat, count] of Object.entries(catCount).sort((a,b) => b[1]-a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  // 7. SCROLL DOWN — check "You're caught up" message
  console.log("\n--- SCROLL TO BOTTOM ---");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const caughtUp = await page.$("text=You're caught up");
  console.log(`  "You're caught up" visible: ${caughtUp ? "YES" : "NO"}`);
  const loadEarlier = await page.$("text=LOAD EARLIER");
  console.log(`  "LOAD EARLIER" button visible: ${loadEarlier ? "YES" : "NO"}`);

  // 8. LIGHT MODE
  console.log("\n--- LIGHT MODE ---");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  // Click the theme toggle (sun/moon button)
  const themeBtn = await page.$("button:has-text('☀'), button:has-text('☾')");
  if (themeBtn) {
    await themeBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "audit/screenshot-desktop-light.png", fullPage: false });
    console.log("  Screenshot saved: audit/screenshot-desktop-light.png");
    // Switch back
    await themeBtn.click();
    await page.waitForTimeout(300);
  } else {
    console.log("  Could not find theme toggle");
  }

  // 9. MOBILE VIEW
  console.log("\n--- MOBILE VIEW (390x844) ---");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: "audit/screenshot-mobile-dark.png", fullPage: false });
  console.log("  Screenshot saved: audit/screenshot-mobile-dark.png");

  // Check if ribbons overflow properly
  const ribbonOverflow = await page.evaluate(() => {
    const ribbons = document.querySelectorAll(".ribbon-dropdown");
    return Array.from(ribbons).map(r => ({
      scrollWidth: r.scrollWidth,
      clientWidth: r.clientWidth,
      overflows: r.scrollWidth > r.clientWidth
    }));
  });
  console.log(`  Ribbon overflow status: ${ribbonOverflow.length > 0 ? JSON.stringify(ribbonOverflow) : "no dropdowns open"}`);

  // 10. ABOUT MODAL
  console.log("\n--- ABOUT MODAL ---");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(300);
  const aboutBtn = await page.$("button:has-text('?')");
  if (aboutBtn) {
    await aboutBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: "audit/screenshot-about.png", fullPage: false });
    console.log("  Screenshot saved: audit/screenshot-about.png");

    // Check all links in About
    const aboutLinks = await page.$$eval("div[style*='maxHeight'] a[href]", els =>
      els.map(el => ({ text: el.textContent.trim().slice(0, 40), href: el.href }))
    );
    console.log(`  Links in About modal (${aboutLinks.length}):`);
    for (const l of aboutLinks) {
      console.log(`    "${l.text}" → ${l.href}`);
    }

    // Close about
    const closeBtn = await page.$("button:has-text('×')");
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // 11. SEARCH
  console.log("\n--- SEARCH ---");
  const searchInput = await page.$("input[placeholder='Search...']");
  if (searchInput) {
    await searchInput.fill("Ukraine");
    await page.waitForTimeout(1000);
    const resultCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    console.log(`  Search "Ukraine": ${resultCount} results`);
    const searchLabel = await page.$eval("span", el => el.textContent);
    console.log(`  Search label: "${searchLabel}"`);
    // Clear
    await searchInput.fill("");
    await page.waitForTimeout(500);
  }

  // 12. INSTALL PROMPT
  console.log("\n--- INSTALL PROMPT ---");
  const installPrompt = await page.$("text=Install Clean Feed");
  console.log(`  Install prompt visible: ${installPrompt ? "YES" : "NO"}`);

  // 13. FOOTER
  console.log("\n--- FOOTER ---");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const footerText = await page.$eval("footer", el => el.innerText);
  console.log(`  Footer:\n    ${footerText.replace(/\n/g, "\n    ")}`);

  // 14. SHARE BUTTON
  console.log("\n--- SHARE BUTTON ---");
  const shareBtn = await page.$("button:has-text('SHARE CLEAN FEED')");
  console.log(`  Share button visible: ${shareBtn ? "YES" : "NO"}`);

  // 15. PERFORMANCE
  console.log("\n--- PERFORMANCE ---");
  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd || 0),
      loadComplete: Math.round(nav?.loadEventEnd || 0),
      totalResources: resources.length,
      totalTransferred: Math.round(resources.reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024),
    };
  });
  console.log(`  DOMContentLoaded: ${perf.domContentLoaded}ms`);
  console.log(`  Load complete: ${perf.loadComplete}ms`);
  console.log(`  Total resources: ${perf.totalResources}`);
  console.log(`  Total transferred: ${perf.totalTransferred}KB`);

  // 16. ERRORS
  console.log("\n--- ERRORS ---");
  if (errors.length === 0) {
    console.log("  No errors detected");
  } else {
    for (const e of errors) {
      console.log(`  ${e.slice(0, 150)}`);
    }
  }

  // 17. COMPETITOR COMPARISON NOTES
  console.log("\n--- COMPETITOR LENS ---");
  console.log("  vs 1440: Do we feel calmer? Is info density appropriate?");
  console.log("  vs Twitter: Is the feed obviously un-algorithmic? No engagement hooks?");
  console.log("  vs Apple News: Does everyone see the same thing? No personalization?");

  // Count total visible elements of engagement/manipulation
  const engagementElements = await page.evaluate(() => {
    const doc = document.documentElement.innerHTML.toLowerCase();
    return {
      hasComments: doc.includes("comment") && !doc.includes("no comment"),
      hasLikes: doc.includes("like") || doc.includes("thumbs"),
      hasShare: doc.includes("share"),
      hasNotification: doc.includes("notification") || doc.includes("bell"),
      hasAutoplay: doc.includes("autoplay"),
      hasInfiniteScroll: doc.includes("infinite"),
      hasCookieBanner: doc.includes("cookie") && (doc.includes("accept") || doc.includes("consent")),
      hasPopup: doc.includes("popup") || doc.includes("subscribe now"),
    };
  });
  console.log(`  Engagement elements found:`);
  for (const [k, v] of Object.entries(engagementElements)) {
    if (v) console.log(`    WARNING: ${k} detected`);
  }
  const cleanCount = Object.values(engagementElements).filter(v => !v).length;
  console.log(`  Clean score: ${cleanCount}/${Object.keys(engagementElements).length} (${cleanCount === Object.keys(engagementElements).length ? "PERFECT" : "needs review"})`);

  await browser.close();
  console.log("\n=== UX AUDIT COMPLETE ===");
})();
