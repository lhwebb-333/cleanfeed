import { chromium } from "playwright";
const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "dark",
  })).newPage();

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(3000);

  // --- ABOUT MODAL ---
  console.log("--- ABOUT MODAL ---");
  const aboutBtn = await page.$("button[title='About']");
  if (aboutBtn) {
    await aboutBtn.click(); await page.waitForTimeout(500);
    const aboutText = await page.evaluate(() => {
      const modal = document.querySelector("div[style*='maxHeight']");
      return modal ? modal.innerText : "";
    });
    console.log(`  "What We Edit" section: ${aboutText.includes("What We Edit")}`);
    for (const src of ["The Hill", "PBS NewsHour", "Christian Science Monitor", "Deutsche Welle", "France 24", "Bloomberg"]) {
      console.log(`  ${src}: ${aboutText.includes(src)}`);
    }
    const closeBtn = await page.$("button:has-text('×')");
    if (closeBtn) await closeBtn.click();
    await page.waitForTimeout(300);
  }

  // --- LIGHT MODE ---
  console.log("\n--- LIGHT MODE ---");
  const themeBtn = await page.$("button[title='Toggle theme']");
  if (themeBtn) {
    await themeBtn.click(); await page.waitForTimeout(500);
    await page.screenshot({ path: "audit/final-light.png", fullPage: false });
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`  Background: ${bg}`);
    await themeBtn.click(); await page.waitForTimeout(300);
  }

  // --- MOBILE ---
  console.log("\n--- MOBILE ---");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await page.screenshot({ path: "audit/final-mobile.png", fullPage: false });
  const mobileArticles = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  console.log(`  Mobile articles: ${mobileArticles}`);

  // --- E-READER ---
  console.log("\n--- E-READER ---");
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto(`${BASE}/api/reader`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "audit/final-reader.png", fullPage: false });
  const readerArticles = await page.$$eval(".article", els => els.length);
  const readerCats = await page.$$eval("h2", els => els.map(el => el.textContent));
  console.log(`  Articles: ${readerArticles}`);
  console.log(`  Categories: ${readerCats.join(", ")}`);
  const readerDups = await page.$$eval(".article", els => {
    let c = 0;
    for (const el of els) {
      const t = el.querySelector(".title a")?.textContent || "";
      const d = el.querySelector(".desc")?.textContent || "";
      if (d && t && d.toLowerCase().replace(/[^a-z]/g, "").startsWith(t.toLowerCase().replace(/[^a-z]/g, "").slice(0, 20))) c++;
    }
    return c;
  });
  console.log(`  Duplicate descs in reader: ${readerDups}`);
  const readerSources = await page.$$eval(".meta", els => {
    const srcs = new Set();
    for (const el of els) { const s = el.textContent.split("·")[0].trim(); srcs.add(s); }
    return [...srcs];
  });
  console.log(`  Sources in reader: ${readerSources.join(", ")}`);
  const scriptTags = await page.$$eval("script", els => els.length);
  console.log(`  Script tags: ${scriptTags}`);

  // E-ink
  await page.setViewportSize({ width: 320, height: 480 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "audit/final-reader-eink.png", fullPage: false });

  // --- DIGEST ---
  console.log("\n--- DIGEST EMAIL ---");
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto(`${BASE}/api/digest`, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: "audit/final-digest.png", fullPage: false });
  const digestText = await page.evaluate(() => document.body.innerText);
  console.log(`  "no tracking pixels": ${digestText.includes("no tracking pixels")}`);
  console.log(`  "Unsubscribe": ${digestText.includes("Unsubscribe")}`);
  for (const s of ["The Hill", "Bloomberg", "France 24", "DW", "PBS"]) {
    if (digestText.includes(s)) console.log(`  ${s} in digest articles: YES`);
  }

  await browser.close();
  console.log("\n=== DONE ===");
})();
