export const SOURCES = [
  // Wire services
  { key: "reuters", name: "Reuters", color: "#FF8C00" },
  { key: "ap", name: "AP News", color: "#4A90D9" },
  { key: "bbc", name: "BBC", color: "#C1272D" },
  { key: "npr", name: "NPR", color: "#5BBD72" },
  // Center-rated editorial
  { key: "thehill", name: "The Hill", color: "#1E88E5" },
  { key: "pbs", name: "PBS", color: "#1976D2" },
  { key: "csm", name: "CSM", color: "#1565C0" },
  { key: "bloomberg", name: "Bloomberg", color: "#7B1FA2" },
  // International public broadcasters
  { key: "dw", name: "DW", color: "#0097A7" },
  { key: "france24", name: "France 24", color: "#2E7D32" },
];

export const LOCAL_COLOR = "#9b59b6";

export const SOURCE_COLOR_MAP = {
  Reuters: "#FF8C00",
  "AP News": "#4A90D9",
  BBC: "#C1272D",
  NPR: "#5BBD72",
  "Phys.org": "#4FC3F7",
  Nature: "#E53935",
  "KFF Health": "#AB47BC",
  "STAT News": "#00ACC1",
  "Ars Technica": "#FF7043",
  "MIT Tech Review": "#EC407A",
  Smithsonian: "#B8860B",
  "Atlas Obscura": "#C97E4A",
  CSM: "#1565C0",
  Bloomberg: "#7B1FA2",
  "The Hill": "#1E88E5",
  PBS: "#1976D2",
  DW: "#0097A7",
  "France 24": "#2E7D32",
  FRED: "#607D8B",
  SEC: "#607D8B",
  BLS: "#607D8B",
  Treasury: "#607D8B",
  Fed: "#607D8B",
};

// Expandable sub-sources for secondary categories
// All sub-source pills use the same accent color as category buttons
const SUB_COLOR = "#FF8C00";

export const CATEGORY_SUBSOURCES = {
  world: [
    { name: "The Hill", color: SUB_COLOR },
    { name: "PBS", color: SUB_COLOR },
    { name: "CSM", color: SUB_COLOR },
    { name: "DW", color: SUB_COLOR },
    { name: "France 24", color: SUB_COLOR, short: "FR24" },
  ],
  science: [
    { name: "Phys.org", color: SUB_COLOR },
    { name: "Nature", color: SUB_COLOR },
    { name: "Smithsonian", color: SUB_COLOR },
    { name: "Atlas Obscura", color: SUB_COLOR },
  ],
  health: [
    { name: "KFF Health", color: SUB_COLOR },
    { name: "STAT News", color: SUB_COLOR },
  ],
  tech: [
    { name: "Ars Technica", color: SUB_COLOR, short: "Ars" },
    { name: "MIT Tech Review", color: SUB_COLOR, short: "MIT" },
    { name: "Bloomberg", color: SUB_COLOR },
  ],
  financial: [
    { name: "Bloomberg", color: SUB_COLOR },
    { name: "The Hill", color: SUB_COLOR },
    { name: "FRED", color: SUB_COLOR },
    { name: "SEC", color: SUB_COLOR },
    { name: "BLS", color: SUB_COLOR },
    { name: "Treasury", color: SUB_COLOR },
    { name: "Fed", color: SUB_COLOR },
  ],
};

export const ALL_SUBSOURCE_NAMES = Object.values(CATEGORY_SUBSOURCES)
  .flat()
  .map((s) => s.name);

// Returns color for a source name, including dynamic "Local XX" sources
export function getSourceColor(name) {
  if (SOURCE_COLOR_MAP[name]) return SOURCE_COLOR_MAP[name];
  if (name.startsWith("Local ")) return LOCAL_COLOR;
  return "#888";
}

export const CATEGORIES = [
  { key: "world", label: "World" },
  { key: "sports", label: "Sports" },
  { key: "entertainment", label: "Entertainment" },
  { key: "financial", label: "Financial" },
  { key: "tech", label: "Tech" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
];
