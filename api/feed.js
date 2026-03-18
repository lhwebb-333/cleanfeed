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

    // Dedupe exact matches + detect multi-source stories via keyword overlap
    // Step 1: Exact dedup (same headline from different feeds)
    const seenTitles = new Set();
    articles = articles.filter((a) => {
      const key = normalizeForDedup(a.title);
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    // Step 2: Detect multi-source stories via significant keyword overlap
    // Extract meaningful words from titles (skip common words)
    const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","be","been","being","has","have","had","do","does","did","will","would","could","should","may","might","can","shall","not","no","its","it","he","she","they","we","you","i","my","your","his","her","their","our","this","that","these","those","with","from","by","as","into","about","over","after","before","between","under","during","up","down","out","off","than","too","very","just","also","now","new","says","said","say"]);

    function getKeywords(title) {
      return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    }

    // Group articles by time window (within 24 hours) and check keyword overlap
    const wireServices = new Set(["Reuters", "AP News", "BBC", "NPR"]);
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (!wireServices.has(a.source)) continue;
      if (a.multiSource) continue;

      const aWords = new Set(getKeywords(a.title));
      if (aWords.size < 3) continue;

      const aTime = new Date(a.pubDate).getTime();
      const matchingSources = new Set([a.source]);

      for (let j = 0; j < articles.length; j++) {
        if (i === j) continue;
        const b = articles[j];
        if (!wireServices.has(b.source)) continue;
        if (matchingSources.has(b.source)) continue;

        // Within 24 hours
        const bTime = new Date(b.pubDate).getTime();
        if (Math.abs(aTime - bTime) > 24 * 60 * 60 * 1000) continue;

        const bWords = getKeywords(b.title);
        const overlap = bWords.filter((w) => aWords.has(w)).length;
        const overlapRatio = overlap / Math.min(aWords.size, bWords.length);

        // 40%+ keyword overlap = same story
        if (overlapRatio >= 0.4 && overlap >= 3) {
          matchingSources.add(b.source);
        }
      }

      if (matchingSources.size >= 3) {
        a.multiSource = true;
        a.sourceCount = matchingSources.size;
        a.coveredBy = [...matchingSources];
      }
    }

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
        world: 200, sports: 200, financial: 150, entertainment: 150,
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
      const catOrder = ["world", "sports", "entertainment", "financial", "tech", "science", "health"];
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
