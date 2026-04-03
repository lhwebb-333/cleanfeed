import { fetchSource, fetchTopicFeeds, fetchSupplementalFeeds, normalizeForDedup, enrichDescriptions, SOURCES } from "./_lib/shared.js";

// In-memory cache — survives across warm Vercel invocations, saves CPU on repeat requests
const cache = { data: null, params: null, ts: 0 };
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Server-side unique visitor counter — no cookies, no client JS, no third party
// Counts once per IP per day using a Redis set. IP is not stored — only used
// to check if this visitor was already counted today, then discarded.
async function countPageView(req) {
  try {
    const { Redis } = await import("@upstash/redis");
    const redis = Redis.fromEnv();
    const today = new Date().toISOString().split("T")[0];
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
    // Hash the IP so we never store it in readable form
    const { createHash } = await import("crypto");
    const hash = createHash("sha256").update(ip + today).digest("hex").slice(0, 12);
    const isNew = await redis.sadd(`visitors:${today}`, hash);
    if (isNew) await redis.incr(`views:${today}`);
    // Expire the visitor set after 48h to save memory
    await redis.expire(`visitors:${today}`, 172800);
  } catch {}
}

export default async function handler(req, res) {
  try {
    // Count unique visitor (fire-and-forget, don't await)
    countPageView(req);
    const { source: sourceFilter, category: categoryFilter } = req.query;
    const limit = Math.min(parseInt(req.query.limit) || 300, 1000);

    // Check in-memory cache (keyed on source+category+limit)
    const cacheKey = `${sourceFilter || ""}|${categoryFilter || ""}|${limit}`;
    if (cache.data && cache.params === cacheKey && Date.now() - cache.ts < CACHE_TTL) {
      res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
      return res.json(cache.data);
    }

    const sourceKeys = sourceFilter ? [sourceFilter] : Object.keys(SOURCES);

    const [sourceResults, topicArticles, supplementalArticles] = await Promise.all([
      Promise.allSettled(sourceKeys.map((key) => fetchSource(key))),
      sourceFilter ? Promise.resolve([]) : fetchTopicFeeds(),
      sourceFilter ? Promise.resolve([]) : fetchSupplementalFeeds(),
    ]);

    // Check source health — detect Google News RSS failures
    const sourceHealth = {};
    const googleProxiedSources = ["reuters", "ap"]; // These depend on Google News RSS
    for (let i = 0; i < sourceKeys.length; i++) {
      const key = sourceKeys[i];
      const result = sourceResults[i];
      const count = result.status === "fulfilled" ? result.value.length : 0;
      sourceHealth[key] = { ok: count > 0, count };
      if (count === 0 && googleProxiedSources.includes(key)) {
        console.warn(`[Feed] WARNING: ${key} returned 0 articles — Google News RSS may be blocked`);
      }
    }

    let articles = [
      ...sourceResults.filter((r) => r.status === "fulfilled").flatMap((r) => r.value),
      ...topicArticles,
      ...supplementalArticles,
    ];

    // Track degraded sources for client-side banner
    const degradedSources = Object.entries(sourceHealth)
      .filter(([key, h]) => !h.ok && googleProxiedSources.includes(key))
      .map(([key]) => SOURCES[key]?.name || key);

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

        if (overlapRatio >= 0.35 && overlap >= 3) {
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

    // Detect running stories — cluster articles about the same specific story
    const STOP2 = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","is","are","was","were","has","have","had","not","its","it","with","from","by","as","this","that","says","said","say","new","up","down","out","just","also","now","after","how","why","what","who","more","been","could","would","about","into","over","than","them","they","their","these","other","first","last","most","some","make","like","will","back","take","people","trump","biden","administration","government","president","news","today","todays","latest","stories","updates","report","reports","according","amid","here","many","much","still","even","every","getting","going","know","look","well","show","shows","week","year","years","time","says","told","tells","world","state","states","country","reuters","associated","press"]);
    function storyWords(title) {
      return [...new Set(title.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/)
        .filter((w) => w.length > 3 && !STOP2.has(w)))];
    }

    // Cluster articles: 3+ shared keywords AND within 5 days = same story
    const storyClusters = [];
    const clustered2 = new Set();
    for (let i = 0; i < articles.length; i++) {
      if (clustered2.has(i)) continue;
      const aWords = new Set(storyWords(articles[i].title));
      if (aWords.size < 3) continue;
      const cluster = [i];
      for (let j = i + 1; j < articles.length; j++) {
        if (clustered2.has(j)) continue;
        const bWords = storyWords(articles[j].title);
        const overlap = bWords.filter((w) => aWords.has(w)).length;
        if (overlap >= 3) {
          cluster.push(j);
          clustered2.add(j);
        }
      }
      if (cluster.length >= 3) {
        const days = new Set(cluster.map((idx) => new Date(articles[idx].pubDate).toISOString().split("T")[0]));
        if (days.size >= 2) {
          // Build timeline — one per day, with links
          const timeline = [];
          const seenDays = new Set();
          for (const idx of cluster) {
            const day = new Date(articles[idx].pubDate).toISOString().split("T")[0];
            if (seenDays.has(day)) continue;
            seenDays.add(day);
            timeline.push({ date: day, title: articles[idx].title, source: articles[idx].source, link: articles[idx].link });
          }
          const label = [...aWords].slice(0, 3).join(" ");
          storyClusters.push({ label, count: cluster.length, days: days.size, timeline: timeline.slice(0, 5), indices: cluster });
        }
      }
    }

    // Attach top 3 running stories
    storyClusters.sort((a, b) => b.count - a.count);
    for (const story of storyClusters.slice(0, 3)) {
      for (const idx of story.indices) {
        if (!articles[idx].storyArc) {
          articles[idx].storyArc = {
            keyword: story.label,
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

    // Chronological — newest first.
    // The feed's promise is "the world, as it happened, in the order it happened."
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Source balance — prevent any single source from dominating a category.
    // This addresses the BBC skew (direct RSS = faster/more articles than Google News proxied sources).
    // Cap: no source gets more than 40% of any category's articles.
    if (!categoryFilter || categoryFilter === "all") {
      const catSourceCounts = {}; // "world|BBC" → count
      const catTotals = {};       // "world" → count
      articles = articles.filter((a) => {
        const key = `${a.category}|${a.source}`;
        catSourceCounts[key] = (catSourceCounts[key] || 0) + 1;
        catTotals[a.category] = (catTotals[a.category] || 0) + 1;
        // Allow first 10 from any source unconditionally, then cap at 40%
        if (catSourceCounts[key] <= 10) return true;
        return catSourceCounts[key] / catTotals[a.category] <= 0.4;
      });
    }

    articles = articles.slice(0, limit);

    // Scrape og:description for articles missing synopses (cached 2hr, batched)
    await enrichDescriptions(articles);

    const response = {
      ok: true,
      count: articles.length,
      articles,
      ...(degradedSources.length > 0 ? { degraded: degradedSources } : {}),
    };

    // Store in memory cache
    cache.data = response;
    cache.params = cacheKey;
    cache.ts = Date.now();

    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=1800");
    res.json(response);
  } catch (err) {
    console.error("[CleanFeed] Feed error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch feeds" });
  }
}
