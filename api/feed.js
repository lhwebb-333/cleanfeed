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
      // Collect links from all versions so user can pick
      primary.sourceLinks = [{ source: primary.source, link: primary.link }];
      for (const idx of cluster.dupeIndices) {
        const dupe = articles[idx];
        if (dupe.link && dupe.source !== primary.source) {
          primary.sourceLinks.push({ source: dupe.source, link: dupe.link });
        }
        dupeIndices.add(idx);
      }
    }

    // Remove duplicate articles (keep the primary from each cluster)
    articles = articles.filter((_, idx) => !dupeIndices.has(idx));

    // Detect running stories — topics covered by 5+ articles across 2+ days
    const STOP2 = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","has","have","had","not","its","it","with","from","by","as","this","that","says","said","say","new","up","down","out","just","also","now","after","how","why","what","who","more","been"]);
    function storyKeywords(title) {
      return title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
        .filter((w) => w.length > 3 && !STOP2.has(w));
    }

    // Build keyword frequency map
    const kwArticles = {}; // keyword → [article indices]
    for (let i = 0; i < articles.length; i++) {
      const kws = storyKeywords(articles[i].title);
      for (const kw of kws) {
        if (!kwArticles[kw]) kwArticles[kw] = [];
        kwArticles[kw].push(i);
      }
    }

    // Find keywords that appear in 5+ articles across 2+ different days
    const runningTopics = {};
    for (const [kw, indices] of Object.entries(kwArticles)) {
      if (indices.length < 5) continue;
      const days = new Set(indices.map((i) => new Date(articles[i].pubDate).toISOString().split("T")[0]));
      if (days.size < 2) continue;
      // Group by day, pick the first article per day as a timeline entry
      const timeline = [];
      const seenDays = new Set();
      for (const idx of indices) {
        const day = new Date(articles[idx].pubDate).toISOString().split("T")[0];
        if (seenDays.has(day)) continue;
        seenDays.add(day);
        timeline.push({ date: day, title: articles[idx].title, source: articles[idx].source });
      }
      if (timeline.length >= 2) {
        runningTopics[kw] = { keyword: kw, count: indices.length, days: days.size, timeline: timeline.slice(0, 5) };
      }
    }

    // Attach running story context to articles that are part of major running stories
    const topRunning = Object.values(runningTopics)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // top 5 running stories

    for (const story of topRunning) {
      const indices = kwArticles[story.keyword];
      for (const idx of indices) {
        if (!articles[idx].storyArc) {
          articles[idx].storyArc = {
            keyword: story.keyword,
            articleCount: story.count,
            dayCount: story.days,
            timeline: story.timeline,
          };
        }
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
