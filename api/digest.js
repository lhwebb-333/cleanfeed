// Daily digest — morning briefing email
// Scannable in 90 seconds. Not a feed dump — a briefing.
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
  "The Hill": "#1E88E5", PBS: "#1976D2", CSM: "#1565C0", Bloomberg: "#7B1FA2",
  DW: "#0097A7", "France 24": "#2E7D32",
  "Phys.org": "#4FC3F7", Nature: "#E53935", "KFF Health": "#AB47BC",
  "STAT News": "#00ACC1", "Ars Technica": "#FF7043", "MIT Tech Review": "#EC407A",
  Smithsonian: "#B8860B", "Atlas Obscura": "#C97E4A",
  FRED: "#607D8B", SEC: "#607D8B", BLS: "#607D8B", Treasury: "#607D8B", Fed: "#607D8B",
};

const STOP = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","has","have","had","not","its","it","with","from","by","as","this","that","says","said","say","new","up","down","out","just","also","now"]);
function getWords(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
}

function findMultiSourceStories(articles, cutoffMs) {
  const cutoff = Date.now() - cutoffMs;
  const recent = articles.filter(a => new Date(a.pubDate).getTime() > cutoff);
  const checked = new Set();
  const stories = [];

  for (let i = 0; i < recent.length; i++) {
    if (checked.has(i)) continue;
    const a = recent[i];
    const aWords = new Set(getWords(a.title));
    if (aWords.size < 3) continue;
    const sources = new Set([a.source]);
    const sourceLinks = [{ source: a.source, link: a.link }];

    for (let j = i + 1; j < recent.length; j++) {
      if (checked.has(j) || sources.has(recent[j].source)) continue;
      const bWords = getWords(recent[j].title);
      const overlap = bWords.filter(w => aWords.has(w)).length;
      if (overlap >= 3 && overlap / Math.min(aWords.size, bWords.length) >= 0.35) {
        sources.add(recent[j].source);
        sourceLinks.push({ source: recent[j].source, link: recent[j].link });
        checked.add(j);
      }
    }

    if (sources.size >= 2) {
      stories.push({
        title: a.title, sources: [...sources], sourceCount: sources.size,
        pubDate: a.pubDate, link: a.link, sourceLinks, category: a.category,
      });
    }
  }

  // Dedup
  const deduped = [];
  for (const s of stories) {
    const sWords = new Set(getWords(s.title));
    const isDupe = deduped.some(e => {
      const eWords = getWords(e.title);
      const overlap = eWords.filter(w => sWords.has(w)).length;
      return overlap >= 3 && overlap / Math.min(sWords.size, eWords.length) >= 0.4;
    });
    if (!isDupe) deduped.push(s);
  }

  return deduped.sort((a, b) => b.sourceCount - a.sourceCount || new Date(b.pubDate) - new Date(a.pubDate));
}

function articleHtml(a, accent) {
  const color = SOURCE_COLORS[a.source] || "#888";
  return `<div style="margin-bottom:14px;">
    <p style="font-family:monospace;font-size:9px;margin:0 0 2px;">
      <span style="color:${color};font-weight:700;">${escapeHtml(a.source)}</span>
      <span style="color:#999;margin-left:6px;">${timeAgo(a.pubDate)}</span>
      ${a.sourceCount ? `<span style="color:${accent || '#FF8C00'};margin-left:6px;font-weight:700;">${a.sourceCount}+ sources</span>` : ""}
    </p>
    <a href="${escapeHtml(a.link)}" style="color:#111;text-decoration:none;font-size:15px;line-height:1.45;font-weight:500;font-family:Georgia,serif;">
      ${escapeHtml(a.title)}
    </a>
    ${a.sourceLinks?.length > 1 ? `<p style="margin:4px 0 0;">${a.sourceLinks.map(sl =>
      `<a href="${escapeHtml(sl.link)}" style="font-family:monospace;font-size:8px;color:${SOURCE_COLORS[sl.source] || '#888'};text-decoration:none;padding:1px 4px;border:1px solid ${(SOURCE_COLORS[sl.source] || '#888')}40;border-radius:3px;margin-right:4px;">${escapeHtml(sl.source)}</a>`
    ).join("")}</p>` : ""}
  </div>`;
}

function sectionHeader(title, color) {
  return `<p style="font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${color || '#999'};margin:24px 0 10px;border-bottom:1px solid #eee;padding-bottom:4px;">${escapeHtml(title)}</p>`;
}

export default async function handler(req, res) {
  try {
    const sourceKeys = Object.keys(SOURCES);
    const [sourceResults, topicArticles, supplementalArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map(key => fetchSource(key))),
      fetchTopicFeeds(),
      fetchSupplementalFeeds(),
    ]);

    let articles = [
      ...sourceResults.filter(r => r.status === "fulfilled").flatMap(r => r.value),
      ...topicArticles,
      ...supplementalArticles,
    ];

    // Dedup
    const seenTitles = new Set();
    articles = articles.filter(a => {
      const key = normalizeForDedup(a.title);
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // === BUILD BRIEFING SECTIONS ===

    // 1. Overnight / Breaking — multi-source, last 12 hours
    const overnight = findMultiSourceStories(articles, 12 * 60 * 60 * 1000).slice(0, 3);

    // 2. Top 5 Stories — multi-source, last 24 hours
    const top5 = findMultiSourceStories(articles, 24 * 60 * 60 * 1000).slice(0, 3);

    // 3. Market snapshot
    let marketHtml = "";
    try {
      const mRes = await fetch("https://thecleanfeed.app/api/markets");
      const mData = await mRes.json();
      if (mData.ok && mData.indices?.length > 0) {
        const mkts = mData.indices.slice(0, 5).map(idx => {
          const arrow = idx.direction === "up" ? "\u25B2" : idx.direction === "down" ? "\u25BC" : "";
          const color = idx.direction === "up" ? "#4CAF50" : idx.direction === "down" ? "#EF5350" : "#888";
          return `<span style="margin-right:14px;"><span style="color:#888;">${idx.short}</span> <span style="color:#eee;font-weight:700;">${idx.price >= 1000 ? idx.price.toLocaleString("en-US", {maximumFractionDigits:0}) : idx.price.toFixed(2)}</span> <span style="color:${color};font-size:10px;">${arrow} ${Math.abs(idx.changePct || 0).toFixed(1)}%</span></span>`;
        }).join("");
        const state = mData.marketState === "REGULAR" ? "OPEN" : mData.marketState === "PRE" ? "PRE-MARKET" : mData.marketState === "POST" ? "AFTER-HOURS" : "CLOSED";
        marketHtml = `<div style="font-family:monospace;font-size:11px;line-height:2;padding:10px 0;">${mkts}<span style="color:#666;font-size:9px;margin-left:8px;">${state}</span></div>`;
      }
    } catch {}

    // 4. Running stories — multi-day coverage
    const runningStories = [];
    const STOP2 = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","has","have","had","not","its","it","with","from","by","as","this","that","says","said","say","new","up","down","out","just","also","now","news","today","todays","latest","stories","updates","report","world","state","reuters","press"]);
    function storyWords(title) {
      return [...new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3 && !STOP2.has(w)))];
    }
    const clustered = new Set();
    for (let i = 0; i < articles.length; i++) {
      if (clustered.has(i)) continue;
      const aWords = new Set(storyWords(articles[i].title));
      if (aWords.size < 3) continue;
      const cluster = [i];
      for (let j = i + 1; j < articles.length; j++) {
        if (clustered.has(j)) continue;
        const bWords = storyWords(articles[j].title);
        const overlap = bWords.filter(w => aWords.has(w)).length;
        if (overlap >= 3) { cluster.push(j); clustered.add(j); }
      }
      if (cluster.length >= 3) {
        const days = new Set(cluster.map(idx => new Date(articles[idx].pubDate).toISOString().split("T")[0]));
        if (days.size >= 2) {
          runningStories.push({
            title: articles[i].title,
            count: cluster.length,
            days: days.size,
            link: articles[i].link,
            source: articles[i].source,
          });
        }
      }
    }

    // 5. Worth Reading — 1 best article per specialty category
    const worthReading = [];
    for (const cat of ["financial", "tech", "science", "health"]) {
      const catArticles = articles.filter(a => a.category === cat && a.description?.length > 50);
      if (catArticles.length > 0) {
        worthReading.push({ ...catArticles[0], _cat: cat });
      }
    }

    // === BUILD EMAIL HTML ===
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    // Rebuild market HTML for light mode + smaller
    let marketHtmlLight = "";
    try {
      const mRes2 = await fetch("https://thecleanfeed.app/api/markets");
      const mData2 = await mRes2.json();
      if (mData2.ok && mData2.indices?.length > 0) {
        const mkts = mData2.indices.slice(0, 7).map(idx => {
          const arrow = idx.direction === "up" ? "\u25B2" : idx.direction === "down" ? "\u25BC" : "";
          const color = idx.direction === "up" ? "#2E7D32" : idx.direction === "down" ? "#C62828" : "#888";
          return `<span style="margin-right:12px;"><span style="color:#888;font-size:9px;">${idx.short}</span> <span style="color:#222;font-weight:700;font-size:10px;">${idx.price >= 1000 ? idx.price.toLocaleString("en-US", {maximumFractionDigits:0}) : idx.price.toFixed(2)}</span><span style="color:${color};font-size:9px;"> ${arrow}${Math.abs(idx.changePct || 0).toFixed(1)}%</span></span>`;
        }).join("");
        const state = mData2.marketState === "REGULAR" ? "OPEN" : mData2.marketState === "PRE" ? "PRE-MKT" : mData2.marketState === "POST" ? "AFTER-HRS" : "CLOSED";
        marketHtmlLight = `<div style="font-family:monospace;font-size:10px;line-height:2;padding:6px 0;border-bottom:1px solid #ddd;">${mkts}<span style="color:#aaa;font-size:8px;">${state}</span></div>`;
      }
    } catch {}

    let html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#ffffff;color:#2a2a2a;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;">

  <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
    <tr>
      <td style="font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.2em;color:#111;">CLEAN FEED</td>
      <td style="text-align:right;font-family:monospace;font-size:10px;color:#999;">${escapeHtml(dateStr)}</td>
    </tr>
    <tr>
      <td colspan="2" style="font-family:Georgia,serif;font-size:13px;color:#999;font-style:italic;padding-top:2px;">Your morning briefing.</td>
    </tr>
  </table>

  ${marketHtmlLight ? sectionHeader("Markets", "#FF8C00") + marketHtmlLight : ""}
`;

    // OVERNIGHT
    if (overnight.length > 0) {
      html += sectionHeader("Overnight", "#C62828");
      for (const s of overnight) html += articleHtml(s, "#C62828");
    }

    // TOP STORIES
    if (top5.length > 0) {
      html += sectionHeader("Top Stories", "#FF8C00");
      for (const s of top5) html += articleHtml(s);
    }

    // RUNNING STORIES
    if (runningStories.length > 0) {
      html += sectionHeader("Developing", "#9C27B0");
      for (const s of runningStories.slice(0, 3)) {
        const color = SOURCE_COLORS[s.source] || "#888";
        html += `<div style="margin-bottom:8px;">
          <a href="${escapeHtml(s.link)}" style="font-family:Georgia,serif;font-size:13px;color:#222;text-decoration:none;line-height:1.4;">
            ${escapeHtml(s.title)}
          </a>
          <span style="font-family:monospace;font-size:8px;color:#9C27B0;margin-left:6px;">${s.count} articles · ${s.days} days</span>
        </div>`;
      }
    }

    // WORTH READING
    if (worthReading.length > 0) {
      html += sectionHeader("Worth Reading", "#4CAF50");
      for (const a of worthReading) {
        const catLabel = a._cat.charAt(0).toUpperCase() + a._cat.slice(1);
        const color = SOURCE_COLORS[a.source] || "#888";
        html += `<div style="margin-bottom:12px;">
          <p style="font-family:monospace;font-size:8px;margin:0 0 2px;">
            <span style="color:${color};font-weight:700;">${escapeHtml(a.source)}</span>
            <span style="color:#444;margin:0 4px;">·</span>
            <span style="color:#4CAF50;">${catLabel}</span>
          </p>
          <a href="${escapeHtml(a.link)}" style="color:#222;text-decoration:none;font-size:14px;line-height:1.4;">
            ${escapeHtml(a.title)}
          </a>
          ${a.description ? `<p style="font-size:12px;color:#777;line-height:1.4;margin:3px 0 0;">${escapeHtml(a.description.slice(0, 150))}${a.description.length > 150 ? "..." : ""}</p>` : ""}
        </div>`;
      }
    }

    // QUICK LINKS — sports, weather, full feed
    html += sectionHeader("At a Glance", "#888");
    html += `<div style="font-family:monospace;font-size:10px;line-height:2.2;">
      <a href="https://thecleanfeed.app" style="color:#333;text-decoration:none;border:1px solid #ddd;border-radius:3px;padding:3px 10px;margin-right:6px;">Live Scores</a>
      <a href="https://thecleanfeed.app" style="color:#333;text-decoration:none;border:1px solid #ddd;border-radius:3px;padding:3px 10px;margin-right:6px;">Local Weather</a>
      <a href="https://thecleanfeed.app" style="color:#333;text-decoration:none;border:1px solid #ddd;border-radius:3px;padding:3px 10px;">Full Feed</a>
    </div>
    <p style="font-family:monospace;font-size:8px;color:#aaa;margin-top:6px;">Scores and weather update live on the site.</p>`;

    // FOOTER
    html += `
  <div style="height:1px;background:#eee;margin:24px 0 16px;"></div>
  <p style="font-family:monospace;font-size:9px;color:#999;line-height:1.6;">
    ${articles.length} stories from 23 sources · <a href="https://thecleanfeed.app" style="color:#666;text-decoration:underline;">Read full feed</a> ·
    <a href="https://thecleanfeed.app/api/reader" style="color:#666;text-decoration:underline;">Reader mode</a> ·
    <a href="%%UNSUB_URL%%" style="color:#666;text-decoration:underline;">Unsubscribe</a>
  </p>
  <p style="font-family:Georgia,serif;font-size:11px;color:#aaa;font-style:italic;margin-top:12px;">
    This email contains no tracking pixels and no click tracking.<br>
    We don't know if you opened it. That's the point.
  </p>
</div>
</body>
</html>`;

    const format = req.query.format || "html";
    if (format === "json") {
      res.json({ ok: true, articleCount: articles.length, html });
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
