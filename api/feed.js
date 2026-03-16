import { fetchSource, fetchTopicFeeds, fetchSupplementalFeeds, normalizeForDedup, SOURCES } from "./_lib/shared.js";

export default async function handler(req, res) {
  try {
    const { source: sourceFilter, category: categoryFilter } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 300, 1000);

    const sourceKeys = sourceFilter ? [sourceFilter] : Object.keys(SOURCES);

    const [sourceResults, topicArticles, supplementalArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map((key) => fetchSource(key))),
      sourceFilter ? Promise.resolve([]) : fetchTopicFeeds(),
      sourceFilter ? Promise.resolve([]) : fetchSupplementalFeeds(),
    ]);

    let articles = [
      ...sourceResults.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ...topicArticles,
      ...supplementalArticles,
    ];

    // Dedupe by normalized title (same story from source feeds + topic feeds)
    const seenTitles = new Set();
    articles = articles.filter((a) => {
      const key = normalizeForDedup(a.title);
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    if (categoryFilter && categoryFilter !== "all") {
      articles = articles.filter((a) => a.category === categoryFilter);
    }

    // Sort by date first (newest first)
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // When showing all categories, use tiered weighting:
    // Primary (world, sports, financial) get more slots
    // Secondary (tech, science, health) get fewer but guaranteed slots
    // Fixed caps prevent any category from dominating regardless of limit
    if (!categoryFilter || categoryFilter === "all") {
      const secondaryCap = 100;
      const caps = {
        world: 200, sports: 200, financial: 150,
        tech: secondaryCap, science: secondaryCap, health: secondaryCap,
      };
      // Build per-category buckets (already sorted by date)
      const buckets = {};
      for (const a of articles) {
        const cat = a.category || "world";
        if (!buckets[cat]) buckets[cat] = [];
        const cap = caps[cat] || secondaryCap;
        if (buckets[cat].length < cap) {
          buckets[cat].push(a);
        }
      }
      // Round-robin interleave: 1 from each category per round
      const catOrder = ["world", "sports", "financial", "tech", "science", "health"];
      const indices = {};
      catOrder.forEach((c) => { indices[c] = 0; });
      const interleaved = [];
      let placed = true;
      while (placed) {
        placed = false;
        for (const cat of catOrder) {
          const bucket = buckets[cat];
          if (bucket && indices[cat] < bucket.length) {
            interleaved.push(bucket[indices[cat]]);
            indices[cat]++;
            placed = true;
          }
        }
      }
      articles = interleaved;
    }

    articles = articles.slice(0, limit);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    res.json({ ok: true, count: articles.length, articles });
  } catch (err) {
    console.error("[CleanFeed] Feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch feeds" });
  }
}
