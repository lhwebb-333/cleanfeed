// Deep interactive UX audit — exercises every feature on the live site
import { chromium } from "playwright";
import { writeFileSync } from "fs";

const BASE = "https://thecleanfeed.app";
let screenshotIdx = 0;

async function snap(page, label) {
  screenshotIdx++;
  const name = `audit/deep-${String(screenshotIdx).padStart(2, "0")}-${label}.png`;
  await page.screenshot({ path: name, fullPage: false });
  console.log(`    [screenshot: ${name}]`);
  return name;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    // Grant geolocation for weather/local
    geolocation: { latitude: 36.1627, longitude: -86.7816 }, // Nashville
    permissions: ["geolocation"],
  });
  const page = await ctx.newPage();

  const issues = [];
  function flag(section, issue) {
    issues.push({ section, issue });
    console.log(`  *** ISSUE: ${issue}`);
  }

  console.log("=== DEEP INTERACTIVE UX AUDIT ===\n");

  // ============================================================
  // SECTION 1: DARK MODE — Initial Load
  // ============================================================
  console.log("═══ 1. DARK MODE (default) ═══");
  await page.goto(BASE, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForSelector("h2", { timeout: 15000 });
  await page.waitForTimeout(2000);
  await snap(page, "dark-mode-initial");

  // Check background color
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  console.log(`  Body background: ${darkBg}`);
  if (!darkBg.includes("13") && !darkBg.includes("0d")) {
    flag("dark-mode", `Expected dark background, got ${darkBg}`);
  }

  // Check text readability
  const darkText = await page.evaluate(() => {
    const h2 = document.querySelector("h2");
    return h2 ? getComputedStyle(h2).color : "none";
  });
  console.log(`  Headline color: ${darkText}`);

  // ============================================================
  // SECTION 2: LIGHT MODE
  // ============================================================
  console.log("\n═══ 2. LIGHT MODE ═══");
  const themeBtn = await page.$("button:has-text('☾'), button:has-text('☀')");
  if (themeBtn) {
    await themeBtn.click();
    await page.waitForTimeout(600);
    await snap(page, "light-mode");

    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    console.log(`  Body background: ${lightBg}`);

    // Check contrast — headlines should be dark on light bg
    const lightHeadline = await page.evaluate(() => {
      const h2 = document.querySelector("h2");
      return h2 ? getComputedStyle(h2).color : "none";
    });
    console.log(`  Headline color: ${lightHeadline}`);

    // Check all source badges are visible in light mode
    const sourceBadges = await page.$$eval("a[target='_blank'] span:first-child", els =>
      els.slice(0, 5).map(el => ({
        text: el.textContent,
        color: getComputedStyle(el).color,
      }))
    );
    console.log(`  Source badges in light mode:`);
    for (const b of sourceBadges) {
      console.log(`    ${b.text}: ${b.color}`);
    }

    // Switch back to dark for rest of audit
    await themeBtn.click();
    await page.waitForTimeout(400);
  } else {
    flag("light-mode", "Could not find theme toggle button");
  }

  // ============================================================
  // SECTION 3: WEATHER — expand forecast
  // ============================================================
  console.log("\n═══ 3. WEATHER ═══");
  // Weather may take a moment to load
  await page.waitForTimeout(3000);
  const weatherBtn = await page.$("button:has(span[title='Toggle F/C'])");
  if (weatherBtn) {
    const weatherText = await weatherBtn.innerText();
    console.log(`  Weather display: "${weatherText.trim()}"`);

    // Click to expand 3-day forecast
    await weatherBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "weather-expanded");

    // Read forecast data
    const forecastData = await page.evaluate(() => {
      const header = document.querySelector("header");
      if (!header) return "no header";
      return header.innerText;
    });
    console.log(`  Header with forecast:\n    ${forecastData.replace(/\n/g, "\n    ")}`);

    // Toggle F/C
    const fcToggle = await page.$("span[title='Toggle F/C']");
    if (fcToggle) {
      const beforeTemp = await fcToggle.innerText();
      await fcToggle.click();
      await page.waitForTimeout(300);
      const afterTemp = await fcToggle.innerText();
      console.log(`  F/C toggle: "${beforeTemp}" → "${afterTemp}"`);
      if (beforeTemp === afterTemp) flag("weather", "F/C toggle did not change temperature");
      // Toggle back
      await fcToggle.click();
      await page.waitForTimeout(200);
    }

    // Close forecast
    await weatherBtn.click();
    await page.waitForTimeout(300);
  } else {
    console.log("  Weather not loaded (may need geolocation)");
  }

  // ============================================================
  // SECTION 4: SOURCES RIBBON — expand and inspect
  // ============================================================
  console.log("\n═══ 4. SOURCES RIBBON ═══");
  const sourcesBtn = await page.$("button.ribbon-label:has-text('SOURCES')");
  if (sourcesBtn) {
    await sourcesBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "sources-expanded");

    // Read all source pills
    const sourcePills = await page.$$eval(".ribbon-dropdown button", els =>
      els.map(el => ({
        text: el.textContent.trim(),
        opacity: getComputedStyle(el).opacity,
        border: getComputedStyle(el).borderColor,
      }))
    );
    console.log(`  Source pills (${sourcePills.length}):`);
    for (const p of sourcePills) {
      console.log(`    ${p.text} — opacity: ${p.opacity}`);
    }

    // Toggle one source off and back on
    if (sourcePills.length > 0) {
      const firstSourceBtn = await page.$(".ribbon-dropdown button");
      const firstName = await firstSourceBtn.innerText();
      console.log(`  Toggling off: ${firstName}`);
      await firstSourceBtn.click();
      await page.waitForTimeout(300);
      const afterOpacity = await firstSourceBtn.evaluate(el => getComputedStyle(el).opacity);
      console.log(`  After toggle off — opacity: ${afterOpacity}`);
      if (afterOpacity === "1") flag("sources", `${firstName} toggle did not visually change`);
      // Toggle back on
      await firstSourceBtn.click();
      await page.waitForTimeout(300);
    }

    // Close sources
    await sourcesBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 5: TOPICS RIBBON — expand, check sub-sources
  // ============================================================
  console.log("\n═══ 5. TOPICS RIBBON ═══");
  const topicsBtn = await page.$("button.ribbon-label:has-text('TOPICS')");
  if (topicsBtn) {
    await topicsBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "topics-expanded");

    // Read category pills
    const catPills = await page.$$eval(".ribbon-dropdown button", els =>
      els.map(el => el.textContent.trim())
    );
    console.log(`  Category pills: ${catPills.join(", ")}`);

    // Check each category has a count
    const catDetails = await page.$$eval(".ribbon-dropdown span", els =>
      els.filter(el => el.textContent.match(/^\d+$/)).map(el => ({
        count: el.textContent,
        parent: el.parentElement?.textContent?.trim(),
      }))
    );
    console.log(`  Categories with counts:`);
    for (const c of catDetails) {
      console.log(`    ${c.parent}`);
    }

    // Expand sub-sources for Science (should show Phys.org, Nature, Smithsonian, Atlas Obscura)
    const scienceExpanders = await page.$$(".ribbon-dropdown button:has-text('Science') + button");
    if (scienceExpanders.length > 0) {
      await scienceExpanders[0].click();
      await page.waitForTimeout(400);
      await snap(page, "topics-science-subsources");

      const subSourcePills = await page.$$eval(".ribbon-dropdown button", els =>
        els.map(el => el.textContent.trim()).filter(t =>
          ["Phys.org", "Nature", "Smithsonian", "Atlas Obscura"].some(s => t.includes(s))
        )
      );
      console.log(`  Science sub-sources: ${subSourcePills.join(", ")}`);
      if (subSourcePills.length < 4) {
        flag("topics", `Expected 4 science sub-sources, found ${subSourcePills.length}`);
      }
    }

    // Expand sub-sources for Tech
    const techExpanders = await page.$$(".ribbon-dropdown button:has-text('Tech') + button");
    if (techExpanders.length > 0) {
      await techExpanders[0].click();
      await page.waitForTimeout(400);
      const techSubs = await page.$$eval(".ribbon-dropdown button", els =>
        els.map(el => el.textContent.trim()).filter(t =>
          ["Ars", "MIT"].some(s => t.includes(s))
        )
      );
      console.log(`  Tech sub-sources: ${techSubs.join(", ")}`);
    }

    // Expand sub-sources for Health
    const healthExpanders = await page.$$(".ribbon-dropdown button:has-text('Health') + button");
    if (healthExpanders.length > 0) {
      await healthExpanders[0].click();
      await page.waitForTimeout(400);
      const healthSubs = await page.$$eval(".ribbon-dropdown button", els =>
        els.map(el => el.textContent.trim()).filter(t =>
          ["KFF", "STAT"].some(s => t.includes(s))
        )
      );
      console.log(`  Health sub-sources: ${healthSubs.join(", ")}`);
    }

    // Expand sub-sources for Financial
    const finExpanders = await page.$$(".ribbon-dropdown button:has-text('Financial') + button");
    if (finExpanders.length > 0) {
      await finExpanders[0].click();
      await page.waitForTimeout(400);
      await snap(page, "topics-financial-subsources");
      const finSubs = await page.$$eval(".ribbon-dropdown button", els =>
        els.map(el => el.textContent.trim()).filter(t =>
          ["FRED", "SEC", "BLS", "Treasury", "Fed"].some(s => t.includes(s))
        )
      );
      console.log(`  Financial sub-sources: ${finSubs.join(", ")}`);
    }

    // Close topics
    await topicsBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 6: SPORTS RIBBON — expand leagues, inspect scores
  // ============================================================
  console.log("\n═══ 6. SPORTS RIBBON ═══");
  const sportsBtn = await page.$("button.ribbon-label:has-text('SPORTS')");
  if (sportsBtn) {
    await sportsBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "sports-expanded");

    // Read league pills
    const leaguePills = await page.$$eval(".ribbon-dropdown button", els =>
      els.map(el => ({ text: el.textContent.trim(), hasLive: el.textContent.includes("LIVE") }))
    );
    console.log(`  Leagues: ${leaguePills.map(l => l.text).join(", ")}`);

    // Expand each league
    for (const league of leaguePills) {
      const leagueBtn = await page.$(`.ribbon-dropdown button:has-text('${league.text.split(" ")[0]}')`);
      if (leagueBtn) {
        await leagueBtn.click();
        await page.waitForTimeout(400);

        const games = await page.evaluate(() => {
          const container = document.querySelector(".ribbon-dropdown");
          if (!container) return [];
          const spans = container.querySelectorAll("span[style*='fontFamily']");
          return Array.from(spans).slice(0, 20).map(s => s.textContent).filter(t => t.includes("-"));
        });
        console.log(`  ${league.text}: ${games.length} game scores visible`);
        if (games.length > 0) {
          await snap(page, `sports-${league.text.split(" ")[0].toLowerCase()}`);
        }

        // Close this league (click again)
        await leagueBtn.click();
        await page.waitForTimeout(200);
      }
    }

    // Close sports
    await sportsBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 7: MARKETS RIBBON
  // ============================================================
  console.log("\n═══ 7. MARKETS RIBBON ═══");
  const marketsBtn = await page.$("button.ribbon-label:has-text('MARKETS')");
  if (marketsBtn) {
    await marketsBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "markets-expanded");

    const marketData = await page.evaluate(() => {
      const container = document.querySelector("button.ribbon-label:has(span)");
      const parent = container?.closest("div")?.querySelector("div[style*='flexWrap']");
      if (!parent) return "no expanded market data";
      return parent.innerText;
    });
    console.log(`  Market data:\n    ${(marketData || "empty").replace(/\n/g, "\n    ")}`);

    // Check for market state indicator
    const marketState = await page.evaluate(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) {
        const text = s.textContent.trim();
        if (["OPEN", "CLOSED", "PRE-MKT", "AFTER-HRS"].includes(text)) return text;
      }
      return "not found";
    });
    console.log(`  Market state: ${marketState}`);

    await marketsBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 8: TODAY RIBBON
  // ============================================================
  console.log("\n═══ 8. TODAY RIBBON ═══");
  const todayBtn = await page.$("button.ribbon-label:has-text('TODAY')");
  if (todayBtn) {
    await todayBtn.click();
    await page.waitForTimeout(500);
    await snap(page, "today-expanded");

    const todayContent = await page.evaluate(() => {
      const ribbons = document.querySelectorAll(".ribbon-dropdown");
      for (const r of ribbons) {
        if (r.textContent.includes("THIS DAY") || r.textContent.includes("TODAY")) {
          return r.innerText;
        }
      }
      return "not found";
    });
    console.log(`  Today content:\n    ${(todayContent || "empty").replace(/\n/g, "\n    ")}`);

    // Check for digest stories
    const digestStories = await page.$$eval("a[style*='fontSize: 12px'], a[style*='font-size: 12px']", els =>
      els.map(el => el.textContent.trim().slice(0, 80))
    );
    // Alternative: look for digest section
    const digestSection = await page.evaluate(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) {
        if (s.textContent.includes("TOP STORIES")) {
          const container = s.closest("div[style*='flexDirection']") || s.parentElement;
          return container ? container.innerText : "found but no content";
        }
      }
      return "not found";
    });
    console.log(`  Daily digest:\n    ${(digestSection || "empty").replace(/\n/g, "\n    ")}`);

    // Check This Day in History
    const historySection = await page.evaluate(() => {
      const spans = document.querySelectorAll("span");
      for (const s of spans) {
        if (s.textContent.includes("THIS DAY IN HISTORY")) {
          const container = s.closest("div[style*='flexDirection']") || s.parentElement;
          return container ? container.innerText : "found but no content";
        }
      }
      return "not found";
    });
    console.log(`  This Day in History:\n    ${(historySection || "empty").replace(/\n/g, "\n    ")}`);

    await todayBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 9: FILTERS RIBBON — Local + Mute + Presets
  // ============================================================
  console.log("\n═══ 9. FILTERS RIBBON ═══");
  const filtersBtn = await page.$("button.ribbon-label:has-text('FILTERS')");
  if (filtersBtn) {
    await filtersBtn.click();
    await page.waitForTimeout(400);
    await snap(page, "filters-expanded");

    // 9a: Set local state to TN
    console.log("  --- 9a: LOCAL STATE ---");
    const stateInput = await page.$("input[placeholder='+ state']");
    if (stateInput) {
      await stateInput.fill("TN");
      await stateInput.press("Enter");
      await page.waitForTimeout(2000);
      await snap(page, "filters-local-tn");

      // Check if local articles appeared
      const localArticles = await page.$$eval("a[target='_blank'] span", els =>
        els.filter(el => el.textContent.includes("Local TN")).length
      );
      console.log(`  Local TN articles visible: ${localArticles}`);

      // Check sources ribbon updated
      const sourcesText = await page.$eval("button.ribbon-label:has-text('SOURCES')", el => el.textContent);
      console.log(`  Sources after local: ${sourcesText.trim()}`);
    } else {
      console.log("  State input not found (may already have a state set)");
      // Try to clear existing state
      const clearStateBtn = await page.$(".ribbon-dropdown button:has-text('×')");
      if (clearStateBtn) {
        console.log("  Clearing existing state...");
        await clearStateBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 9b: MUTE POLITICS
    console.log("  --- 9b: MUTE POLITICS ---");
    const mutePoliticsBtn = await page.$("button:has-text('MUTE POLITICS')");
    if (mutePoliticsBtn) {
      // Count articles before
      const beforeCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
      await mutePoliticsBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, "filters-politics-muted");
      const afterCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
      console.log(`  Articles before mute: ${beforeCount}, after: ${afterCount} (diff: ${beforeCount - afterCount})`);

      // Check button changed to "POLITICS MUTED ×"
      const mutedBtn = await page.$("button:has-text('POLITICS MUTED')");
      console.log(`  Button says "POLITICS MUTED": ${mutedBtn ? "YES" : "NO"}`);
      if (!mutedBtn) flag("mute-politics", "Button text did not change to POLITICS MUTED");

      // Check muted keyword pills appeared
      const mutedPills = await page.$$eval(".ribbon-dropdown button", els =>
        els.filter(el => el.textContent.includes("×") && !el.textContent.includes("MUTED") && !el.textContent.includes("MODE")).map(el => el.textContent.trim())
      );
      console.log(`  Muted keyword pills: ${mutedPills.slice(0, 10).join(", ")}${mutedPills.length > 10 ? "..." : ""}`);

      // Unmute
      if (mutedBtn) {
        await mutedBtn.click();
        await page.waitForTimeout(500);
      }
    } else {
      flag("mute-politics", "MUTE POLITICS button not found");
    }

    // 9c: FAMILY MODE
    console.log("  --- 9c: FAMILY MODE ---");
    const familyBtn = await page.$("button:has-text('FAMILY MODE')");
    if (familyBtn) {
      const beforeCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
      await familyBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, "filters-family-mode");
      const afterCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
      console.log(`  Articles before family: ${beforeCount}, after: ${afterCount} (diff: ${beforeCount - afterCount})`);

      const familyOnBtn = await page.$("button:has-text('FAMILY MODE ON')");
      console.log(`  Button says "FAMILY MODE ON": ${familyOnBtn ? "YES" : "NO"}`);

      // Disable
      if (familyOnBtn) {
        await familyOnBtn.click();
        await page.waitForTimeout(500);
      }
    }

    // 9d: Custom mute keyword
    console.log("  --- 9d: CUSTOM MUTE ---");
    const muteInput = await page.$("input[placeholder='+ keyword']");
    if (muteInput) {
      await muteInput.fill("Iran");
      await muteInput.press("Enter");
      await page.waitForTimeout(1000);
      await snap(page, "filters-custom-mute-iran");

      const iranArticles = await page.$$eval("a[target='_blank'] h2", els =>
        els.filter(el => el.textContent.toLowerCase().includes("iran")).length
      );
      console.log(`  Articles mentioning "Iran" after mute: ${iranArticles} (should be 0)`);
      if (iranArticles > 0) flag("mute", "Muted keyword 'Iran' still showing articles");

      // Remove the mute
      const iranPill = await page.$("button:has-text('iran')");
      if (iranPill) {
        await iranPill.click();
        await page.waitForTimeout(500);
      }
    }

    // Clear local state if set
    const clearState = await page.$(".ribbon-dropdown button:has-text('×'):not(:has-text('iran'))");
    if (clearState && (await clearState.innerText()).includes("TN")) {
      await clearState.click();
      await page.waitForTimeout(500);
    }

    // Close filters
    await filtersBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 10: SOURCE HOVER TOOLTIPS
  // ============================================================
  console.log("\n═══ 10. SOURCE HOVER TOOLTIPS ═══");
  const sourceSpans = await page.$$("a[target='_blank'] span[style*='fontWeight: 700'][style*='fontSize: 10']");
  const tooltips = [];
  for (const span of sourceSpans.slice(0, 8)) {
    const title = await span.getAttribute("title");
    const text = await span.innerText();
    if (title) {
      tooltips.push({ source: text, tooltip: title.slice(0, 80) });
    }
  }
  console.log(`  Source tooltips found: ${tooltips.length}`);
  for (const t of tooltips) {
    console.log(`    ${t.source}: "${t.tooltip}..."`);
  }
  // Check known sources have tooltips
  const expectedSources = ["Reuters", "AP News", "BBC", "NPR"];
  for (const src of expectedSources) {
    const found = tooltips.find(t => t.source === src);
    if (!found) {
      // May just not be in first 8 articles
      console.log(`    ${src}: not in first 8 articles (not necessarily a bug)`);
    }
  }

  // ============================================================
  // SECTION 11: MULTI-SOURCE ARTICLES
  // ============================================================
  console.log("\n═══ 11. MULTI-SOURCE ARTICLES ═══");
  const multiSourceBadges = await page.$$("span:has-text('sources')");
  console.log(`  Multi-source badges visible: ${multiSourceBadges.length}`);

  for (const badge of multiSourceBadges.slice(0, 3)) {
    const articleEl = await badge.evaluateHandle(el => el.closest("a"));
    if (articleEl) {
      const articleText = await articleEl.evaluate(el => {
        const h2 = el.querySelector("h2");
        const sourcePills = el.querySelectorAll("a[style*='borderRadius']");
        return {
          title: h2?.textContent?.slice(0, 70) || "",
          sources: Array.from(sourcePills).map(s => s.textContent.trim()),
        };
      });
      console.log(`  "${articleText.title}..."`);
      console.log(`    Source links: ${articleText.sources.join(", ")}`);
    }
  }

  // Check for COMPARE ALL button
  const compareAllBtns = await page.$$("button:has-text('COMPARE ALL')");
  console.log(`  COMPARE ALL buttons: ${compareAllBtns.length}`);

  // ============================================================
  // SECTION 12: RUNNING STORY ARCS
  // ============================================================
  console.log("\n═══ 12. RUNNING STORY ARCS ═══");
  const storyArcBtns = await page.$$("button:has-text('RUNNING STORY')");
  console.log(`  Story arc badges visible: ${storyArcBtns.length}`);

  for (const arcBtn of storyArcBtns.slice(0, 3)) {
    const arcText = await arcBtn.innerText();
    console.log(`  Arc: "${arcText}"`);

    // Click to expand timeline
    await arcBtn.scrollIntoViewIfNeeded();
    await arcBtn.click();
    await page.waitForTimeout(500);
    await snap(page, `story-arc-${screenshotIdx}`);

    // Read timeline entries
    const timeline = await arcBtn.evaluate(el => {
      const container = el.closest("div")?.querySelector("div[style*='borderLeft']");
      if (!container) return [];
      const links = container.querySelectorAll("a");
      return Array.from(links).map(a => ({
        date: a.querySelector("span")?.textContent || "",
        title: a.textContent.slice(0, 80),
      }));
    });
    console.log(`    Timeline entries: ${timeline.length}`);
    for (const t of timeline) {
      console.log(`      ${t.date} — ${t.title}`);
    }

    // Check timeline links work (don't click, just verify href)
    const timelineLinks = await arcBtn.evaluate(el => {
      const container = el.closest("div")?.querySelector("div[style*='borderLeft']");
      if (!container) return [];
      return Array.from(container.querySelectorAll("a")).map(a => a.href).filter(Boolean);
    });
    console.log(`    Links: ${timelineLinks.length} (all have href: ${timelineLinks.every(l => l.startsWith("http"))})`);

    // Close arc
    await arcBtn.click();
    await page.waitForTimeout(300);
  }

  // ============================================================
  // SECTION 13: SERENDIPITY / DISCOVER ARTICLES
  // ============================================================
  console.log("\n═══ 13. SERENDIPITY (DISCOVER) ═══");
  const discoverBadges = await page.$$("span:has-text('DISCOVER')");
  console.log(`  DISCOVER badges visible: ${discoverBadges.length}`);
  for (const badge of discoverBadges.slice(0, 3)) {
    const article = await badge.evaluate(el => {
      const a = el.closest("a");
      return {
        title: a?.querySelector("h2")?.textContent?.slice(0, 70) || "",
        source: a?.querySelector("span")?.textContent || "",
      };
    });
    console.log(`    [${article.source}] "${article.title}..."`);
  }

  // ============================================================
  // SECTION 14: CATEGORY-BY-CATEGORY ARTICLE AUDIT
  // ============================================================
  console.log("\n═══ 14. CATEGORY-BY-CATEGORY AUDIT ═══");
  const feedData = await (await page.request.get(`${BASE}/api/feed?limit=1000`)).json();
  const articles = feedData.articles || [];

  const CATEGORY_SIGNALS = {
    sports: ["nba", "nfl", "nhl", "mlb", "premier league", "cricket", "tennis", "golf", "soccer", "football", "basketball", "baseball", "hockey", "f1", "grand prix", "pga", "ncaa", "celtics", "lakers", "yankees", "arsenal", "liverpool", "chelsea", "referee", "quarterback", "playoff", "relegation", "training camp", "captain"],
    financial: ["stock", "wall street", "nasdaq", "interest rate", "inflation", "gdp", "earnings", "bond", "fed rate", "tariff", "oil price", "market", "bank of england", "central bank", "investor", "economy"],
    tech: ["artificial intelligence", " ai ", "openai", "microsoft", "apple", "google", "nvidia", "cybersecurity", "startup", "robot", "chatgpt", "software"],
    science: ["nasa", "climate", "species", "genome", "physics", "earthquake", "telescope", "fossil", "glacier", "biodiversity", "neuroscience"],
    health: ["cancer", "disease", "hospital", "vaccine", "virus", "drug trial", "mental health", "diabetes", "fda", "pharmaceutical", "therapy", "outbreak"],
    entertainment: ["movie", "film", "oscar", "emmy", "grammy", "netflix", "concert", "album", "broadway", "celebrity", "video game"],
  };

  for (const cat of ["world", "sports", "entertainment", "financial", "tech", "science", "health"]) {
    const catArticles = articles.filter(a => a.category === cat);
    console.log(`\n  --- ${cat.toUpperCase()} (${catArticles.length} articles) ---`);

    // Check for misclassified articles
    let misclass = 0;
    for (const a of catArticles) {
      const text = `${a.title} ${a.description || ""}`.toLowerCase();
      for (const [otherCat, keywords] of Object.entries(CATEGORY_SIGNALS)) {
        if (otherCat === cat) continue;
        const hits = keywords.filter(kw => text.includes(kw));
        if (hits.length >= 3 && cat !== "world") {
          misclass++;
          if (misclass <= 3) {
            console.log(`    MISCLASS? [${cat}→${otherCat}] "${a.title.slice(0, 60)}..." (hits: ${hits.join(", ")})`);
          }
        }
      }
    }
    if (misclass > 0) console.log(`    Total potentially misclassified: ${misclass}`);

    // Check for same-source duplicates
    const bySource = {};
    for (const a of catArticles) {
      if (!bySource[a.source]) bySource[a.source] = [];
      bySource[a.source].push(a);
    }
    let dupes = 0;
    for (const [src, items] of Object.entries(bySource)) {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const norm1 = items[i].title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
          const norm2 = items[j].title.toLowerCase().replace(/[^a-z0-9\s]/g, "");
          const words1 = new Set(norm1.split(" ").filter(w => w.length > 3));
          const words2 = norm2.split(" ").filter(w => w.length > 3);
          const overlap = words2.filter(w => words1.has(w)).length;
          if (words1.size >= 3 && overlap / Math.min(words1.size, words2.length) >= 0.6) {
            dupes++;
            if (dupes <= 2) {
              console.log(`    DUPE [${src}]: "${items[i].title.slice(0, 50)}..." vs "${items[j].title.slice(0, 50)}..."`);
            }
          }
        }
      }
    }
    if (dupes > 0) console.log(`    Same-source duplicates: ${dupes}`);

    // Show sample headlines
    console.log(`    Sample (first 5):`);
    for (const a of catArticles.slice(0, 5)) {
      console.log(`      [${a.source}] ${a.title.slice(0, 70)}`);
    }
  }

  // ============================================================
  // SECTION 15: BRIEF MODE
  // ============================================================
  console.log("\n═══ 15. BRIEF MODE ═══");
  const briefBtn = await page.$("button:has-text('BRIEF')");
  if (briefBtn) {
    const fullCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    await briefBtn.click();
    await page.waitForTimeout(1000);
    const briefCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    console.log(`  24H articles: ${fullCount}, BRIEF (12h): ${briefCount}`);
    if (briefCount >= fullCount) flag("brief-mode", "Brief mode did not reduce article count");

    // Switch back to 24H
    const fullBtn = await page.$("button:has-text('24H')");
    if (fullBtn) await fullBtn.click();
    await page.waitForTimeout(500);
  }

  // ============================================================
  // SECTION 16: LOAD EARLIER
  // ============================================================
  console.log("\n═══ 16. LOAD EARLIER ═══");
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1000);
  const loadEarlierBtn = await page.$("button:has-text('LOAD EARLIER')");
  if (loadEarlierBtn) {
    const beforeCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    await loadEarlierBtn.click();
    await page.waitForTimeout(2000);
    const afterCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    console.log(`  Before: ${beforeCount}, After: ${afterCount} (+${afterCount - beforeCount} articles)`);
    if (afterCount <= beforeCount) flag("load-earlier", "LOAD EARLIER did not add articles");
  } else {
    console.log("  LOAD EARLIER button not visible");
  }

  // ============================================================
  // SECTION 17: SEARCH
  // ============================================================
  console.log("\n═══ 17. SEARCH ═══");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const searchInput = await page.$("input[placeholder='Search...']");
  if (searchInput) {
    // Search for a common term
    await searchInput.fill("energy");
    await page.waitForTimeout(1000);
    await snap(page, "search-energy");
    const searchCount = await page.$$eval("a[target='_blank']", els => els.filter(el => el.querySelector("h2")).length);
    console.log(`  Search "energy": ${searchCount} results`);

    // Check results actually contain the term
    const resultTitles = await page.$$eval("a[target='_blank'] h2", els => els.map(el => el.textContent.toLowerCase()));
    const relevantCount = resultTitles.filter(t => t.includes("energy") || t.includes("oil") || t.includes("gas") || t.includes("crude")).length;
    console.log(`  Results containing energy/oil/gas/crude: ${relevantCount}/${resultTitles.length}`);

    // Clear search
    const clearBtn = await page.$("button:has-text('CLEAR')");
    if (clearBtn) await clearBtn.click();
    else await searchInput.fill("");
    await page.waitForTimeout(500);
  }

  // ============================================================
  // SECTION 18: FINANCIAL DATA CARDS
  // ============================================================
  console.log("\n═══ 18. FINANCIAL DATA CARDS ═══");
  const finFeedData = await (await page.request.get(`${BASE}/api/financial-feed?limit=50`)).json();
  console.log(`  Financial feed items: ${finFeedData.count || 0}`);
  for (const item of (finFeedData.items || []).slice(0, 5)) {
    console.log(`    [${item.source}] ${item.title?.slice(0, 60) || "no title"}`);
    if (item.data) {
      console.log(`      actual=${item.data.actual} exp=${item.data.expected} prior=${item.data.prior} unit=${item.data.unit}`);
    }
    if (item.cardContext?.length > 0) {
      console.log(`      Card context sections: ${item.cardContext.map(c => c.label).join(", ")}`);
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n\n╔══════════════════════════════════════╗");
  console.log("║       AUDIT SUMMARY                  ║");
  console.log("╚══════════════════════════════════════╝\n");

  if (issues.length === 0) {
    console.log("  NO ISSUES FOUND\n");
  } else {
    console.log(`  ISSUES FOUND: ${issues.length}\n`);
    for (const iss of issues) {
      console.log(`  [${iss.section}] ${iss.issue}`);
    }
  }

  console.log("\n=== DEEP AUDIT COMPLETE ===");
  await browser.close();
})();
