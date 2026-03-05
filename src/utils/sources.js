export const SOURCES = [
  { key: "reuters", name: "Reuters", color: "#FF8C00" },
  { key: "ap", name: "AP News", color: "#4A90D9" },
  { key: "bbc", name: "BBC", color: "#C1272D" },
  { key: "npr", name: "NPR", color: "#5BBD72" },
];

export const LOCAL_COLOR = "#9b59b6";

export const SOURCE_COLOR_MAP = {
  Reuters: "#FF8C00",
  "AP News": "#4A90D9",
  BBC: "#C1272D",
  NPR: "#5BBD72",
};

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
