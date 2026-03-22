// E-ink / Reader mode — server-rendered, zero JavaScript
// Bookmark-friendly: thecleanfeed.app/api/reader

import { fetchSource, fetchTopicFeeds, fetchSupplementalFeeds, normalizeForDedup, SOURCES } from "./_lib/shared.js";

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default async function handler(req, res) {
  try {
    const sourceKeys = Object.keys(SOURCES);
    const [sourceResults, topicArticles, supplementalArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map((key) => fetchSource(key))),
      fetchTopicFeeds(),
      fetchSupplementalFeeds(),
    ]);

    let articles = [
      ...sourceResults.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ...topicArticles,
      ...supplementalArticles,
    ];

    // Dedup
    const seenTitles = new Set();
    articles = articles.filter((a) => {
      const key = normalizeForDedup(a.title);
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    // Sort by date, newest first
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Last 24 hours only
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    articles = articles.filter((a) => new Date(a.pubDate).getTime() > cutoff);

    // Limit
    articles = articles.slice(0, 100);

    // Group by category
    const categories = {};
    for (const a of articles) {
      const cat = a.category || "world";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(a);
    }

    const catOrder = ["world", "financial", "sports", "entertainment", "tech", "science", "health"];
    const now = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clean Feed — Reader Mode</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px 16px;
      background: #fff;
      color: #111;
      line-height: 1.6;
    }
    h1 { font-family: monospace; font-size: 14px; letter-spacing: 0.15em; margin-bottom: 4px; }
    .date { font-family: monospace; font-size: 11px; color: #666; margin-bottom: 24px; }
    .tagline { font-style: italic; color: #888; font-size: 13px; margin-bottom: 4px; }
    h2 {
      font-family: monospace; font-size: 10px; letter-spacing: 0.1em;
      text-transform: uppercase; color: #999;
      border-bottom: 1px solid #ddd; padding-bottom: 4px;
      margin: 24px 0 12px;
    }
    .article { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #eee; }
    .article:last-child { border-bottom: none; }
    .meta { font-family: monospace; font-size: 10px; color: #888; margin-bottom: 4px; }
    .title { font-size: 15px; font-weight: 500; margin-bottom: 4px; }
    .title a { color: #111; text-decoration: none; }
    .title a:hover { text-decoration: underline; }
    .desc { font-size: 13px; color: #555; line-height: 1.5; }
    .footer { font-family: monospace; font-size: 9px; color: #aaa; margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; }
    .footer a { color: #888; }
    body.dark { background: #111; color: #ddd; }
    body.dark .title a { color: #ddd; }
    body.dark .desc { color: #aaa; }
    body.dark .meta { color: #777; }
    body.dark h2 { color: #666; border-color: #333; }
    body.dark .article { border-color: #222; }
    body.dark .footer { border-color: #333; color: #555; }
    body.dark .footer a { color: #666; }
    body.dark .toggle { color: #666; border-color: #333; }
    .toggle {
      font-family: monospace; font-size: 10px; padding: 4px 10px;
      background: none; border: 1px solid #ddd; border-radius: 3px;
      cursor: pointer; color: #888; float: right; margin-top: -20px;
      line-height: 1; display: inline-block; box-sizing: border-box;
    }
    @media (prefers-color-scheme: dark) {
      body:not(.light) { background: #111; color: #ddd; }
      body:not(.light) .title a { color: #ddd; }
      body:not(.light) .desc { color: #aaa; }
      body:not(.light) .meta { color: #777; }
      body:not(.light) h2 { color: #666; border-color: #333; }
      body:not(.light) .article { border-color: #222; }
      body:not(.light) .footer { border-color: #333; color: #555; }
      body:not(.light) .footer a { color: #666; }
      body:not(.light) .toggle { color: #666; border-color: #333; }
    }
  </style>
</head>
<body>
  <h1>CLEAN FEED</h1>
  <a href="https://thecleanfeed.app" class="toggle" style="margin-right:4px;text-decoration:none;display:inline-block;">Full Site</a>
  <button class="toggle" onclick="document.body.classList.toggle('dark');document.body.classList.toggle('light');">Light / Dark</button>
  <p class="tagline">No algorithms. No rage. Just news.</p>
  <p class="date">${escapeHtml(now)} — Reader Mode</p>
  <p class="meta" style="margin-bottom:16px">${catOrder.filter(c => categories[c]?.length > 0).map(c => `<a href="#${c}" style="color:inherit;text-decoration:underline;text-underline-offset:2px">${c}</a>`).join(" · ")}</p>
`;

    for (const cat of catOrder) {
      const items = categories[cat];
      if (!items || items.length === 0) continue;
      html += `  <h2 id="${cat}">${escapeHtml(cat)}</h2>\n`;
      for (const a of items) {
        const descDupsTitle = a.description && a.title &&
      a.description.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(
        a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, -5)
      );
    html += `  <div class="article">
    <p class="meta">${escapeHtml(a.source)} · ${timeAgo(a.pubDate)}</p>
    <p class="title"><a href="${escapeHtml(a.link)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></p>
    ${a.description && !descDupsTitle ? `<p class="desc">${escapeHtml(a.description)}</p>` : ""}
  </div>\n`;
      }
    }

    html += `  <p class="footer">
    <a href="https://thecleanfeed.app">Full site</a> ·
    Sources: Reuters, AP, BBC, NPR ·
    No tracking · No cookies
  </p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.send(html);
  } catch (err) {
    console.error("[Reader] Error:", err.message);
    res.status(500).send("<h1>Error loading reader mode</h1>");
  }
}
