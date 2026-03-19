import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";
import { getSourceColor } from "../utils/sources";

const SOURCE_INFO = {
  "Reuters": "International wire service, founded 1851. Part of Thomson Reuters. Governed by the Thomson Reuters Trust Principles.",
  "AP News": "Independent, non-profit wire service, founded 1846. Cooperative owned by its member newspapers and broadcasters.",
  "BBC": "British Broadcasting Corporation. Public service broadcaster funded by UK license fees. Editorially independent from government.",
  "NPR": "National Public Radio. Non-profit media organization funded by member stations, grants, and listeners.",
  "Phys.org": "Science news aggregator publishing press releases from universities and research institutions.",
  "Nature": "Premier peer-reviewed scientific journal, published since 1869. Part of Springer Nature.",
  "KFF Health": "Kaiser Family Foundation Health News. Non-profit, non-partisan health policy journalism.",
  "STAT News": "Health and medicine newsroom covering pharma, biotech, and health policy.",
  "Ars Technica": "Technology publication known for in-depth, technically accurate reporting. Founded 1998.",
  "MIT Tech Review": "Published by MIT since 1899. Covers emerging technologies and their impact.",
  "FRED": "Federal Reserve Economic Data. Official data from the St. Louis Federal Reserve Bank.",
  "BLS": "Bureau of Labor Statistics. U.S. government agency tracking employment, prices, and productivity.",
  "Treasury": "U.S. Department of the Treasury. Official fiscal data and interest rate information.",
  "SEC": "Securities and Exchange Commission. U.S. government agency overseeing markets and protecting investors.",
  "Fed": "Federal Reserve System. U.S. central bank responsible for monetary policy.",
  "Smithsonian": "Smithsonian Magazine. Published by the Smithsonian Institution. Covers history, science, culture, and innovation.",
  "Atlas Obscura": "The definitive guide to the world's hidden wonders. Covers curious places, unexpected history, and gastronomy.",
  "CSM": "The Christian Science Monitor. Nonprofit, secular newsroom founded 1908. Consistently rated center on media bias charts. Known for context-heavy, adjective-neutral reporting.",
  "Bloomberg": "Bloomberg News. Data-driven financial and economic wire service. Prioritizes speed and raw data over narrative.",
};

function descriptionDuplicatesTitle(title = "", desc = "") {
  const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  const normDesc = desc.toLowerCase().replace(/[^a-z0-9]/g, "");
  // Description is just the title (possibly with source name appended)
  if (normDesc.startsWith(normTitle) && normDesc.length < normTitle.length + 30) return true;
  // Description is substantially the same as the title
  if (normTitle.length > 20 && normDesc.startsWith(normTitle.slice(0, normTitle.length - 5))) return true;
  return false;
}

export function ArticleCard({ article }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [arcOpen, setArcOpen] = useState(false);
  const color = getSourceColor(article.source) || article.color || "#888";

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        padding: "18px 16px 18px 20px",
        borderBottom: `1px solid ${theme.colors.border}`,
        borderLeft: `3px solid ${hovered ? color : color + "40"}`,
        textDecoration: "none",
        color: "inherit",
        transition: theme.transitions.normal,
        background: hovered ? theme.colors.surfaceHover : "transparent",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: color,
              cursor: SOURCE_INFO[article.source] ? "help" : "default",
              position: "relative",
            }}
            title={SOURCE_INFO[article.source] || ""}
          >
            {article.source}
          </span>
          {article.category && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                color: theme.colors.textFaint,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {article.category}
            </span>
          )}
          {article.serendipity && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 7,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#B8860B",
                padding: "1px 5px",
                border: "1px solid rgba(184,134,11,0.3)",
                borderRadius: 3,
                background: "rgba(184,134,11,0.08)",
              }}
            >
              DISCOVER
            </span>
          )}
          {article.multiSource && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#FF8C00",
              }}
            >
              {article.sourceCount}+ sources
            </span>
          )}
        </div>
        <span
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textMuted,
            letterSpacing: "0.03em",
          }}
        >
          {timeAgo(article.pubDate)}
        </span>
      </div>

      <h2
        style={{
          fontFamily: theme.fonts.serif,
          fontSize: 17,
          fontWeight: 500,
          lineHeight: 1.45,
          color: theme.colors.textStrong,
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}
      >
        {article.title}
      </h2>

      {article.description && !descriptionDuplicatesTitle(article.title, article.description) && (
        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 14,
            lineHeight: 1.55,
            color: theme.colors.textMuted,
          }}
        >
          {article.description}
          {article.description.length >= 240 ? "\u2026" : ""}
        </p>
      )}

      {article.sourceLinks?.length > 1 && (
        <div
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
          style={{
            display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center",
          }}
        >
          {article.sourceLinks.length >= 3 && (
            <button
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                // Open one at a time with delays to avoid popup blocker
                article.sourceLinks.forEach((sl, i) => {
                  setTimeout(() => window.open(sl.link, "_blank"), i * 300);
                });
              }}
              style={{
                fontFamily: theme.fonts.mono, fontSize: 7, fontWeight: 700,
                padding: "2px 6px", borderRadius: 3, cursor: "pointer",
                background: "rgba(255,140,0,0.08)", border: "1px solid rgba(255,140,0,0.3)",
                color: "#FF8C00", letterSpacing: "0.04em",
              }}
            >
              COMPARE ALL
            </button>
          )}
          {article.sourceLinks.map((sl) => (
            <a
              key={sl.source}
              href={sl.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 8,
                color: getSourceColor(sl.source),
                padding: "2px 6px",
                border: `1px solid ${getSourceColor(sl.source)}40`,
                borderRadius: 3,
                textDecoration: "none",
                letterSpacing: "0.03em",
              }}
            >
              {sl.source} →
            </a>
          ))}
        </div>
      )}
      {/* Running story arc */}
      {article.storyArc && (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} style={{ marginTop: 6 }}>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setArcOpen(!arcOpen); }}
            style={{
              fontFamily: theme.fonts.mono, fontSize: 7, fontWeight: 700,
              color: "#9C27B0", background: "rgba(156,39,176,0.06)",
              border: "1px solid rgba(156,39,176,0.2)", borderRadius: 3,
              padding: "2px 6px", cursor: "pointer", letterSpacing: "0.04em",
            }}
          >
            RUNNING STORY · {article.storyArc.dayCount} days · {article.storyArc.articleCount} articles {arcOpen ? "▴" : "▾"}
          </button>
          {arcOpen && (
            <div style={{
              marginTop: 6, paddingLeft: 8,
              borderLeft: `2px solid rgba(156,39,176,0.2)`,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {article.storyArc.timeline.map((t, i) => (
                <a key={i} href={t.link} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontFamily: theme.fonts.mono, fontSize: 9,
                    display: "flex", gap: 8, alignItems: "baseline",
                    textDecoration: "none", color: "inherit",
                  }}>
                  <span style={{ color: theme.colors.textGhost, flexShrink: 0 }}>{t.date}</span>
                  <span style={{ color: theme.colors.textMuted, borderBottom: `1px solid ${theme.colors.border}` }}>{t.title.slice(0, 60)}{t.title.length > 60 ? "..." : ""}</span>
                  <span style={{ color: theme.colors.textGhost, fontSize: 8 }}>{t.source}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </a>
  );
}
