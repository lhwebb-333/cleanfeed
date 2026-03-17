export const SOURCES = [
  { key: "reuters", name: "Reuters", color: "#FF8C00" },
  { key: "ap", name: "AP News", color: "#4A90D9" },
  { key: "bbc", name: "BBC", color: "#C1272D" },
  { key: "npr", name: "NPR", color: "#5BBD72" },
  { key: "fred", name: "FRED", color: "#2E86AB" },
  { key: "sec", name: "SEC", color: "#D4A017" },
  { key: "bls", name: "BLS", color: "#228B22" },
  { key: "treasury", name: "Treasury", color: "#4169E1" },
  { key: "fed", name: "Fed", color: "#8B0000" },
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
  FRED: "#2E86AB",
  SEC: "#D4A017",
  BLS: "#228B22",
  Treasury: "#4169E1",
  Fed: "#8B0000",
};

// Expandable sub-sources for secondary categories
export const CATEGORY_SUBSOURCES = {
  science: [
    { name: "Phys.org", color: "#4FC3F7" },
    { name: "Nature", color: "#E53935" },
  ],
  health: [
    { name: "KFF Health", color: "#AB47BC" },
    { name: "STAT News", color: "#00ACC1" },
  ],
  tech: [
    { name: "Ars Technica", color: "#FF7043", short: "Ars" },
    { name: "MIT Tech Review", color: "#EC407A", short: "MIT" },
  ],
  financial: [
    { name: "FRED", color: "#2E86AB" },
    { name: "SEC", color: "#D4A017" },
    { name: "BLS", color: "#228B22" },
    { name: "Treasury", color: "#4169E1" },
    { name: "Fed", color: "#8B0000" },
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
  { key: "financial", label: "Financial" },
  { key: "tech", label: "Tech" },
  { key: "sports", label: "Sports" },
  { key: "science", label: "Science" },
  { key: "health", label: "Health" },
];
