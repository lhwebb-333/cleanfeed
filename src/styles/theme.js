const shared = {
  fonts: {
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    serif: "'Newsreader', Georgia, 'Times New Roman', serif",
  },
  fontImport:
    "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap",
  radii: { sm: 3, md: 6, lg: 10 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  maxWidth: 720,
  transitions: { fast: "0.15s ease", normal: "0.25s ease" },
};

const dark = {
  ...shared,
  colors: {
    bg: "#0d0d0d",
    surface: "#141414",
    surfaceHover: "#1a1a1a",
    border: "#222",
    borderSubtle: "#1a1a1a",
    text: "#ddd",
    textStrong: "#eee",
    textMuted: "#aaa",
    textFaint: "#888",
    textGhost: "#666",
    error: "#ff4444",
    toggleBg: "#222",
  },
};

const light = {
  ...shared,
  colors: {
    bg: "#fafafa",
    surface: "#ffffff",
    surfaceHover: "#f0f0f0",
    border: "#ddd",
    borderSubtle: "#eee",
    text: "#2a2a2a",
    textStrong: "#111",
    textMuted: "#666",
    textFaint: "#888",
    textGhost: "#bbb",
    error: "#d32f2f",
    toggleBg: "#e4e4e4",
  },
};

export const themes = { dark, light };
// Default export for backwards compat during migration
export const theme = dark;
