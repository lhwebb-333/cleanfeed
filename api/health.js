// Health check — verifies all critical feeds are working
// Pings healthchecks.io on success. If this stops pinging, you get alerted.
// Called by Vercel Cron every 5 minutes.

import { fetchSource, SOURCES } from "./_lib/shared.js";

const HC_PING = "https://hc-ping.com/c701a064-53bd-44d0-b6a4-96ee4ace9552";

export default async function handler(req, res) {
  const start = Date.now();
  const checks = [];
  const failures = [];

  // 1. Check each wire source returns articles
  for (const key of Object.keys(SOURCES)) {
    try {
      const articles = await fetchSource(key);
      const ok = articles.length > 0;
      checks.push({ source: key, ok, count: articles.length });
      if (!ok) failures.push(`${key}: 0 articles`);
    } catch (err) {
      checks.push({ source: key, ok: false, error: err.message });
      failures.push(`${key}: ${err.message}`);
    }
  }

  // 2. Check markets endpoint
  try {
    const marketsRes = await fetch("https://thecleanfeed.app/api/markets");
    const markets = await marketsRes.json();
    const ok = markets.ok && markets.indices?.length > 0;
    checks.push({ source: "markets", ok, count: markets.indices?.length || 0 });
    if (!ok) failures.push("markets: no data");
  } catch (err) {
    checks.push({ source: "markets", ok: false, error: err.message });
    failures.push(`markets: ${err.message}`);
  }

  // 3. Check scores endpoint
  try {
    const scoresRes = await fetch("https://thecleanfeed.app/api/scores");
    const scores = await scoresRes.json();
    checks.push({ source: "scores", ok: scores.ok, count: scores.count || 0 });
    // Scores can be 0 legitimately (off-season, no games today) — don't flag
  } catch (err) {
    checks.push({ source: "scores", ok: false, error: err.message });
    failures.push(`scores: ${err.message}`);
  }

  const duration = Date.now() - start;
  const allOk = failures.length === 0;

  // Ping healthchecks.io
  try {
    if (allOk) {
      await fetch(HC_PING, { method: "GET" });
    } else {
      // Ping with /fail to signal degraded state
      await fetch(`${HC_PING}/fail`, {
        method: "POST",
        body: failures.join("\n"),
        headers: { "Content-Type": "text/plain" },
      });
    }
  } catch (err) {
    console.error("[Health] Failed to ping healthchecks.io:", err.message);
  }

  const status = allOk ? "healthy" : "degraded";
  console.log(`[Health] ${status} — ${checks.length} checks in ${duration}ms. Failures: ${failures.length}`);

  res.setHeader("Cache-Control", "no-store");
  res.json({
    ok: allOk,
    status,
    duration: `${duration}ms`,
    failures,
    checks,
  });
}
