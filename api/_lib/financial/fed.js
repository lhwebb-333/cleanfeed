// Federal Reserve adapter
// RSS feeds for FOMC statements, rate decisions, Beige Book
// No API key needed

import Parser from "rss-parser";
import { getCached, setCache, recordError } from "./cache.js";
import { sanitize } from "./headlines.js";

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "CleanFeed/1.0 (RSS Reader)" },
});

const FED_FEEDS = [
  {
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    label: "Monetary Policy",
    tags: ["fomc", "rates", "monetary-policy"],
  },
  {
    url: "https://www.federalreserve.gov/feeds/press_bcreg.xml",
    label: "Banking Regulation",
    tags: ["regulation", "banking"],
  },
  {
    url: "https://www.federalreserve.gov/feeds/press_other.xml",
    label: "Other Releases",
    tags: ["fed", "release"],
  },
];

export const fedAdapter = {
  name: "Fed",
  key: "fed",
  color: "#8B0000",

  async fetch() {
    const cached = getCached("fed", "all");
    if (cached) return cached;

    try {
      const results = await Promise.allSettled(
        FED_FEEDS.map(async (feed) => {
          const parsed = await parser.parseURL(feed.url);
          return (parsed.items || []).slice(0, 15).map((item) => ({ item, feed }));
        })
      );

      const items = [];
      const seenLinks = new Set();

      for (const result of results) {
        if (result.status !== "fulfilled") continue;

        for (const { item, feed } of result.value) {
          if (!item.link || seenLinks.has(item.link)) continue;
          seenLinks.add(item.link);

          const title = sanitize(item.title || "Federal Reserve release");
          const description = sanitize(
            (item.contentSnippet || item.content || "").slice(0, 300)
          );

          items.push({
            id: `fed-${item.guid || item.link}`,
            title,
            description,
            link: item.link,
            pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
            source: "Fed",
            color: "#8B0000",
            category: "financial",
            type: "financial-data",
            dataSource: "fed",
            data: { feedLabel: feed.label },
            indicator: feed.label,
            tags: [...feed.tags],
            context: `Federal Reserve — ${feed.label}`,
          });
        }
      }

      // Sort newest first
      items.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

      setCache("fed", "all", items);
      return items;
    } catch (err) {
      console.error("[Financial] Fed adapter error:", err.message);
      recordError("fed");
      return [];
    }
  },
};
