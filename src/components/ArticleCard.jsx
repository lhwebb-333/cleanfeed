import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";
import { getSourceColor } from "../utils/sources";

export function ArticleCard({ article }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
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
            }}
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
          {article.multiSource && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#FF8C00",
                padding: "1px 5px",
                border: "1px solid rgba(255,140,0,0.3)",
                borderRadius: 3,
                background: "rgba(255,140,0,0.08)",
              }}
              title={`Covered by ${article.coveredBy?.join(", ")}`}
            >
              Also: {article.coveredBy?.filter(s => s !== article.source).join(", ")}
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

      {article.description && (
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
    </a>
  );
}
