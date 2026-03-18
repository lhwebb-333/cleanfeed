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

    // Step 2: Detect multi-source stories + collapse duplicates
    const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","be","been","being","has","have","had","do","does","did","will","would","could","should","may","might","can","shall","not","no","its","it","he","she","they","we","you","i","my","your","his","her","their","our","this","that","these","those","with","from","by","as","into","about","over","after","before","between","under","during","up","down","out","off","than","too","very","just","also","now","new","says","said","say"]);

    function getKeywords(title) {
      return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    }

    // Build story clusters — group articles about the same event
    const wireServices = new Set(["Reuters", "AP News", "BBC", "NPR"]);
    const clusters = []; // each cluster: { primary, sources: Set, dupeIndices: Set }
    const clustered = new Set(); // indices already assigned to a cluster

    for (let i = 0; i < articles.length; i++) {
      if (clustered.has(i)) continue;
      const a = articles[i];
      const aWords = new Set(getKeywords(a.title));
      if (aWords.size < 3) continue;

      const aTime = new Date(a.pubDate).getTime();
      const cluster = { primary: i, sources: new Set([a.source]), dupeIndices: new Set() };

      for (let j = i + 1; j < articles.length; j++) {
        if (clustered.has(j)) continue;
        const b = articles[j];

        // Within 24 hours
        const bTime = new Date(b.pubDate).getTime();
        if (Math.abs(aTime - bTime) > 24 * 60 * 60 * 1000) continue;

        const bWords = getKeywords(b.title);
        if (bWords.length < 3) continue;
        const overlap = bWords.filter((w) => aWords.has(w)).length;
        const overlapRatio = overlap / Math.min(aWords.size, bWords.length);

        if (overlapRatio >= 0.4 && overlap >= 3) {
          cluster.sources.add(b.source);
          cluster.dupeIndices.add(j);
          clustered.add(j);
        }
      }

      if (cluster.sources.size >= 2) {
        clusters.push(cluster);
        clustered.add(i); // mark primary as clustered too
      }
    }

    // Apply cluster info to primary articles, remove dupes
    const dupeIndices = new Set();
    for (const cluster of clusters) {
      const primary = articles[cluster.primary];
      primary.multiSource = true;
      primary.sourceCount = cluster.sources.size;
      primary.coveredBy = [...cluster.sources];
      // Collect all non-primary articles in the cluster for removal
      for (const idx of cluster.dupeIndices) {
        dupeIndices.add(idx);
      }
    }

    // Remove duplicate articles (keep the primary from each cluster)
    articles = articles.filter((_, idx) => !dupeIndices.has(idx));

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
