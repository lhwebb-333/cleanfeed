import { chromium } from "playwright";
const BASE = "https://thecleanfeed.app";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

  console.log("=== FILTER + TIME WINDOW VERIFICATION ===\n");

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(2000);

  // 1. Check filter ribbon is COLLAPSED on load
  const filterDropdown = await page.$(".ribbon-dropdown:last-of-type");
  const filtersExpanded = await page.evaluate(() => {
    const btns = document.querySelectorAll("button.ribbon-label");
    for (const b of btns) {
      if (b.textContent.includes("FILTERS")) {
        const parent = b.closest("div");
        return parent?.querySelector(".ribbon-dropdown") !== null;
      }
    }
    return false;
  });
  console.log(`1. Filter ribbon collapsed on load: ${!filtersExpanded ? "YES" : "NO — still auto-opening"}`);
  await page.screenshot({ path: "audit/verify-filter-collapsed.png", fullPage: false });

  // 2. Check 3H button exists
  const threeHBtn = await page.$("button:has-text('3H')");
  const twelveHBtn = await page.$("button:has-text('12H')");
  const twentyfourHBtn = await page.$("button:has-text('24H')");
  console.log(`2. Time buttons: 3H=${!!threeHBtn}, 12H=${!!twelveHBtn}, 24H=${!!twentyfourHBtn}`);

  // 3. Test 3H mode
  if (threeHBtn) {
    const beforeCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    await threeHBtn.click();
    await page.waitForTimeout(500);
    const afterCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    const label = await page.evaluate(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) { if (s.textContent === "Recent") return s.textContent; }
      return null;
    });
    console.log(`3. 3H mode: ${beforeCount} → ${afterCount} articles, label="${label}"`);
    await page.screenshot({ path: "audit/verify-3h-mode.png", fullPage: false });

    // Switch back to 24H
    if (twentyfourHBtn) await twentyfourHBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. Test MUTE POLITICS → filter ribbon opens
  const muteBtn = await page.$("button:has-text('MUTE POLITICS')");
  if (muteBtn) {
    await muteBtn.click();
    await page.waitForTimeout(800);

    // Check filter ribbon is now open
    const filtersOpenAfterMute = await page.evaluate(() => {
      const btns = document.querySelectorAll("button.ribbon-label");
      for (const b of btns) {
        if (b.textContent.includes("FILTERS")) {
          const parent = b.closest("div[style*='maxWidth']") || b.closest("div");
          const dropdown = parent?.querySelector(".ribbon-dropdown, div[style*='borderTop']");
          return dropdown !== null;
        }
      }
      return false;
    });
    console.log(`4. Filter ribbon opened after MUTE POLITICS: ${filtersOpenAfterMute ? "YES" : "NO"}`);
    await page.screenshot({ path: "audit/verify-mute-opens-filter.png", fullPage: false });

    // 5. Click unmute (POLITICS ✕) from feed header
    const unmuteBtn = await page.$("button:has-text('POLITICS')");
    if (unmuteBtn) {
      await unmuteBtn.click();
      await page.waitForTimeout(800);

      const filtersClosedAfterUnmute = await page.evaluate(() => {
        const btns = document.querySelectorAll("button.ribbon-label");
        for (const b of btns) {
          if (b.textContent.includes("FILTERS")) {
            const parent = b.closest("div[style*='maxWidth']") || b.closest("div");
            const dropdown = parent?.querySelector(".ribbon-dropdown, div[style*='borderTop']");
            return dropdown === null;
          }
        }
        return true;
      });
      console.log(`5. Filter ribbon collapsed after unmute: ${filtersClosedAfterUnmute ? "YES" : "NO"}`);
      await page.screenshot({ path: "audit/verify-unmute-collapses.png", fullPage: false });
    }
  }

  await browser.close();
  console.log("\n=== VERIFICATION COMPLETE ===");
})();
