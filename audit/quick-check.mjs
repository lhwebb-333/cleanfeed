import { chromium } from "playwright";
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto("https://thecleanfeed.app", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: "audit/broken-state.png", fullPage: false });
  console.log(`Errors: ${errors.length}`);
  for (const e of errors) console.log(`  ${e.slice(0, 200)}`);
  const articleCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
  console.log(`Articles rendered: ${articleCount}`);
  const ribbons = await page.$$eval("button.ribbon-label", els => els.map(el => el.textContent.trim()));
  console.log(`Ribbons: ${ribbons.join(" | ")}`);
  await browser.close();
})();
