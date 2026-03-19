// Daily digest — generates the email content
// GET /api/digest → returns HTML email body (preview in browser)
// This is the same feed, same chronological order, delivered to your inbox.
// No tracking pixels. No click tracking. No engagement metrics.

import { fetchSource, fetchTopicFeeds, fetchSupplementalFeeds, normalizeForDedup, SOURCES } from "./_lib/shared.js";

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_COLORS = {
  Reuters: "#FF8C00", "AP News": "#4A90D9", BBC: "#C1272D", NPR: "#5BBD72",
  "Phys.org": "#4FC3F7", Nature: "#E53935", "KFF Health": "#AB47BC",
  "STAT News": "#00ACC1", "Ars Technica": "#FF7043", "MIT Tech Review": "#EC407A",
  Smithsonian: "#B8860B", "Atlas Obscura": "#C97E4A",
  CSM: "#1565C0", Bloomberg: "#7B1FA2",
  "The Hill": "#1E88E5", PBS: "#1976D2", DW: "#0097A7", "France 24": "#2E7D32",
  FRED: "#607D8B", SEC: "#607D8B", BLS: "#607D8B", Treasury: "#607D8B", Fed: "#607D8B",
};

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

    // Last 24 hours, chronological
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    articles = articles
      .filter((a) => new Date(a.pubDate).getTime() > cutoff)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Group by category
    const categories = {};
    for (const a of articles) {
      const cat = a.category || "world";
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(a);
    }

    // Pick top stories per category (5 world, 3 each other)
    const catOrder = ["world", "financial", "sports", "tech", "science", "health", "entertainment"];
    const limits = { world: 5, financial: 3, sports: 3, tech: 3, science: 3, health: 3, entertainment: 3 };

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0d0d0d;color:#d4d4d4;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
    <tr>
      <td style="font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.2em;color:#eee;">
        CLEAN FEED
      </td>
      <td style="text-align:right;font-family:monospace;font-size:10px;color:#888;">
        ${escapeHtml(dateStr)}
      </td>
    </tr>
    <tr>
      <td colspan="2" style="font-family:Georgia,serif;font-size:13px;color:#888;font-style:italic;padding-top:2px;">
        News with nothing else.
      </td>
    </tr>
  </table>

  <div style="height:1px;background:#333;margin-bottom:20px;"></div>

  <p style="font-family:monospace;font-size:9px;color:#666;letter-spacing:0.05em;margin-bottom:16px;">
    ${articles.length} stories from the last 24 hours · No tracking · No click counting · <a href="https://thecleanfeed.app" style="color:#888;text-decoration:underline;">Read on web</a>
  </p>
`;

    for (const cat of catOrder) {
      const items = categories[cat];
      if (!items || items.length === 0) continue;
      const limit = limits[cat] || 3;

      html += `
  <!-- ${cat} -->
  <p style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#666;margin:20px 0 8px;border-bottom:1px solid #222;padding-bottom:4px;">
    ${escapeHtml(cat)}
  </p>
`;

      for (const a of items.slice(0, limit)) {
        const color = SOURCE_COLORS[a.source] || "#888";
        const descDupsTitle = a.description && a.title &&
          a.description.toLowerCase().replace(/[^a-z0-9]/g, "").startsWith(
            a.title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, -5)
          );
        html += `
  <div style="margin-bottom:14px;">
    <p style="font-family:monospace;font-size:9px;margin:0 0 3px;">
      <span style="color:${color};font-weight:700;">${escapeHtml(a.source)}</span>
      <span style="color:#666;margin-left:6px;">${timeAgo(a.pubDate)}</span>
    </p>
    <a href="${escapeHtml(a.link)}" style="color:#eee;text-decoration:none;font-size:15px;line-height:1.4;font-weight:500;">
      ${escapeHtml(a.title)}
    </a>
    ${a.description && !descDupsTitle ? `<p style="font-size:13px;color:#aaa;line-height:1.5;margin:4px 0 0;">${escapeHtml(a.description.slice(0, 200))}${a.description.length > 200 ? "..." : ""}</p>` : ""}
  </div>
`;
      }
    }

    html += `
  <!-- Footer -->
  <div style="height:1px;background:#333;margin:24px 0 16px;"></div>
  <p style="font-family:monospace;font-size:9px;color:#666;line-height:1.6;">
    Sources: Reuters · AP · BBC · NPR · The Hill · PBS · CSM · Bloomberg · DW · France 24 + specialty<br>
    Chronological order · No ranking · No engagement tracking<br>
    <a href="https://thecleanfeed.app" style="color:#888;text-decoration:underline;">Open Clean Feed</a> ·
    <a href="https://thecleanfeed.app/api/reader" style="color:#888;text-decoration:underline;">Reader Mode</a> ·
    <a href="%%UNSUB_URL%%" style="color:#888;text-decoration:underline;">Unsubscribe</a>
  </p>
  <p style="font-family:Georgia,serif;font-size:11px;color:#555;font-style:italic;margin-top:12px;">
    This email contains no tracking pixels and no click tracking.<br>
    We don't know if you opened it. That's the point.
  </p>

</div>
</body>
</html>`;

    // Return as previewable HTML or JSON with html field
    const format = req.query.format || "html";
    if (format === "json") {
      res.json({
        ok: true,
        articleCount: articles.length,
        categoryBreakdown: Object.fromEntries(catOrder.map((c) => [c, (categories[c] || []).length])),
        html,
      });
    } else {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      res.send(html);
    }
  } catch (err) {
    console.error("[Digest] Error:", err.message);
    res.status(500).json({ ok: false, error: "Failed to generate digest" });
  }
}
