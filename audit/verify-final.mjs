import { chromium } from "playwright";

const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  console.log("=== FINAL VERIFICATION ===\n");

  // 1. Main page
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "audit/final-desktop.png", fullPage: false });

  // Check filter presets in feed header
  const muteBtn = await page.$("button:has-text('MUTE POLITICS')");
  const familyBtn = await page.$("button:has-text('FAMILY MODE')");
  console.log(`MUTE POLITICS visible in feed header: ${muteBtn ? "YES" : "NO"}`);
  console.log(`FAMILY MODE visible in feed header: ${familyBtn ? "YES" : "NO"}`);

  // Check reader mode link in footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const readerLink = await page.$("a[href='/api/reader']");
  console.log(`Reader mode link in footer: ${readerLink ? "YES" : "NO"}`);

  // Check digest signup
  const digestForm = await page.$("input[placeholder='you@email.com']");
  console.log(`Digest signup form: ${digestForm ? "YES" : "NO"}`);
  await page.screenshot({ path: "audit/final-footer.png", fullPage: false });

  // 2. Digest preview
  console.log("\n--- DIGEST PREVIEW ---");
  const digestRes = await page.request.get(`${BASE}/api/digest`);
  console.log(`Digest endpoint: ${digestRes.status()}`);
  const digestHtml = await digestRes.text();
  console.log(`Digest HTML size: ${digestHtml.length} bytes`);
  console.log(`Contains CLEAN FEED header: ${digestHtml.includes("CLEAN FEED")}`);
  console.log(`Contains no tracking pledge: ${digestHtml.includes("no tracking pixels")}`);
  console.log(`Contains unsubscribe: ${digestHtml.includes("Unsubscribe")}`);

  // Open digest in page for screenshot
  await page.goto(`${BASE}/api/digest`, { waitUntil: "networkidle" });
  await page.screenshot({ path: "audit/final-digest-preview.png", fullPage: false });

  // 3. Subscribe endpoint
  console.log("\n--- SUBSCRIBE ENDPOINT ---");
  const subRes = await page.request.get(`${BASE}/api/subscribe`);
  const subData = await subRes.json();
  console.log(`Subscribe GET: ${JSON.stringify(subData)}`);

  // 4. About page transparency
  console.log("\n--- ABOUT PAGE ---");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(2000);
  const aboutBtn = await page.$("button:has-text('?')");
  if (aboutBtn) {
    await aboutBtn.click();
    await page.waitForTimeout(500);

    const hasTransparency = await page.evaluate(() =>
      document.body.innerText.includes("What We Edit")
    );
    console.log(`"What We Edit" section: ${hasTransparency ? "YES" : "NO"}`);

    const hasOpinionFilter = await page.evaluate(() =>
      document.body.innerText.includes("Opinion filter")
    );
    const hasDedupExplain = await page.evaluate(() =>
      document.body.innerText.includes("Duplicate removal")
    );
    const hasCatExplain = await page.evaluate(() =>
      document.body.innerText.includes("Category sorting")
    );
    console.log(`Opinion filter explained: ${hasOpinionFilter}`);
    console.log(`Duplicate removal explained: ${hasDedupExplain}`);
    console.log(`Category sorting explained: ${hasCatExplain}`);

    const hasNoEngagement = await page.evaluate(() =>
      document.body.innerText.includes("No engagement optimization")
    );
    console.log(`"No engagement optimization" closing: ${hasNoEngagement}`);

    // Scroll to transparency section and screenshot
    await page.evaluate(() => {
      const el = document.querySelector("div[style*='maxHeight']");
      if (el) el.scrollTop = 800;
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "audit/final-about-transparency.png", fullPage: false });
  }

  // 5. BBC balance check
  console.log("\n--- BBC BALANCE ---");
  const feedData = await (await page.request.get(`${BASE}/api/feed?limit=1000`)).json();
  const srcCounts = {};
  for (const a of feedData.articles) {
    srcCounts[a.source] = (srcCounts[a.source] || 0) + 1;
  }
  const total = feedData.articles.length;
  const sorted = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]);
  for (const [src, count] of sorted.slice(0, 6)) {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${src.padEnd(20)} ${count} (${pct}%)`);
  }
  const bbcPct = ((srcCounts["BBC"] || 0) / total * 100);
  console.log(`  BBC share: ${bbcPct.toFixed(1)}% (was ~27%, should be closer to 25% or below)`);

  await browser.close();
  console.log("\n=== VERIFICATION COMPLETE ===");
})();
