// State-level local news sources for CleanFeed
// MVP: Google News AP proxy per state + curated local outlets for top states
// Bias criteria: center-rated, high factual reporting, active RSS, no hard paywall

export const LOCAL_COLOR = "#9b59b6"; // Purple — distinct from Reuters/AP/BBC/NPR

export const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

// Resolve user input to state code
export function resolveState(input) {
  if (!input) return null;
  const trimmed = input.trim().toUpperCase();

  // Direct code match
  if (US_STATES[trimmed]) return trimmed;

  // Full name match
  const lower = input.trim().toLowerCase();
  for (const [code, name] of Object.entries(US_STATES)) {
    if (name.toLowerCase() === lower) return code;
  }

  // Partial match
  for (const [code, name] of Object.entries(US_STATES)) {
    if (name.toLowerCase().startsWith(lower)) return code;
  }

  return null;
}

// Google News AP proxy for any state — baseline coverage
function apStateProxy(stateName) {
  const encoded = encodeURIComponent(stateName);
  return `https://news.google.com/rss/search?q=when:24h+"${encoded}"+site:apnews.com&ceid=US:en&hl=en-US&gl=US`;
}

// Curated local sources by state (top states + notable outlets)
// Each source: { name, rss, bias: "center"|"center-left"|"center-right" }
// Center / least-biased only. All sources verified against MBFC, AllSides, or NewsGuard.
// States without curated sources still get AP state proxy coverage.
const CURATED_SOURCES = {
  CA: [{ name: "CalMatters", rss: "https://calmatters.org/feed/", bias: "center" }],
  TX: [
    { name: "Texas Tribune", rss: "https://www.texastribune.org/feeds/articles.rss", bias: "center" },
    { name: "Houston Public Media", rss: "https://www.houstonpublicmedia.org/feed/", bias: "center" },
  ],
  FL: [{ name: "WUSF", rss: "https://www.wusf.usf.edu/rss.xml", bias: "center" }],
  NY: [{ name: "City & State NY", rss: "https://www.cityandstateny.com/rss.xml", bias: "center" }],
  PA: [
    { name: "WHYY", rss: "https://whyy.org/feed/", bias: "center" },
    { name: "Spotlight PA", rss: "https://www.spotlightpa.org/feeds/full.xml", bias: "center" },
  ],
  IL: [{ name: "Capitol News Illinois", rss: "https://capitolnewsillinois.com/feed", bias: "center" }],
  OH: [{ name: "WOSU", rss: "https://news.wosu.org/rss.xml", bias: "center" }],
  GA: [{ name: "GPB News", rss: "https://www.gpb.org/news/feed", bias: "center" }],
  NC: [
    { name: "WUNC", rss: "https://www.wunc.org/rss.xml", bias: "center" },
    { name: "Carolina Public Press", rss: "https://carolinapublicpress.org/feed/", bias: "center" },
  ],
  MI: [{ name: "Bridge Michigan", rss: "https://bridgemi.com/feed/rss/", bias: "center" }],
  VA: [{ name: "WVTF", rss: "https://www.wvtf.org/rss.xml", bias: "center" }],
  WA: [{ name: "KUOW", rss: "https://www.kuow.org/rss.xml", bias: "center" }],
  CO: [
    { name: "Colorado Sun", rss: "https://coloradosun.com/feed/", bias: "center" },
    { name: "CPR News", rss: "https://www.cpr.org/feed/", bias: "center" },
  ],
  MN: [{ name: "MPR News", rss: "https://www.mprnews.org/rss/index", bias: "center" }],
  MA: [{ name: "GBH News", rss: "https://www.wgbh.org/news/feed", bias: "center" }],
  OR: [{ name: "OPB", rss: "https://www.opb.org/rss/", bias: "center" }],
  NJ: [{ name: "NJ Spotlight News", rss: "https://www.njspotlightnews.org/feed/", bias: "center" }],
  AZ: [{ name: "KJZZ", rss: "https://kjzz.org/rss.xml", bias: "center" }],
  WI: [
    { name: "Wisconsin Watch", rss: "https://wisconsinwatch.org/feed/", bias: "center" },
    { name: "WPR", rss: "https://www.wpr.org/rss.xml", bias: "center" },
  ],
  TN: [{ name: "WPLN Nashville", rss: "https://wpln.org/feed/", bias: "center" }],
};

// Build the full source config for a state
export function getStateFeeds(stateCode) {
  const stateName = US_STATES[stateCode];
  if (!stateName) return [];

  const feeds = [];

  // AP state proxy — always included as baseline
  feeds.push({
    name: `AP ${stateName}`,
    url: apStateProxy(stateName),
    category: "world",
    isProxy: true,
  });

  // Curated local sources
  const curated = CURATED_SOURCES[stateCode] || [];
  for (const source of curated) {
    feeds.push({
      name: source.name,
      url: source.rss,
      category: "world",
      bias: source.bias,
    });
  }

  return feeds;
}
