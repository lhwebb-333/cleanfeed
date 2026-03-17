import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";

const SOURCE_COLORS = {
  FRED: "#2E86AB",
  SEC: "#D4A017",
  BLS: "#228B22",
  Treasury: "#4169E1",
  Fed: "#8B0000",
};

function formatValue(value, unit) {
  if (value == null) return "—";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "K") return `${num > 0 ? "+" : ""}${num.toFixed(0)}K`;
  if (unit === "M") return `${num.toFixed(1)}M`;
  if (unit === "B") return `$${num.toFixed(1)}B`;
  if (unit === "bp") return `${num.toFixed(0)} bp`;
  return num.toFixed(2);
}

function deltaColor(delta, theme) {
  if (delta == null || delta === 0) return theme.colors.textFaint;
  return delta > 0 ? "#4CAF50" : "#EF5350";
}

export function FinancialCard({ item }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const color = SOURCE_COLORS[item.source] || item.color || "#888";
  const data = item.data || {};
  const hasNumbers = data.actual != null;

  return (
    <a
      href={item.link}
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
      {/* Top row: source + category + time */}
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
              color,
            }}
          >
            {item.source}
          </span>
          {item.indicator && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 9,
                color: theme.colors.textFaint,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              {item.indicator}
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
          {timeAgo(item.pubDate)}
        </span>
      </div>

      {/* Headline */}
      <h2
        style={{
          fontFamily: theme.fonts.serif,
          fontSize: 17,
          fontWeight: 500,
          lineHeight: 1.45,
          color: theme.colors.textStrong,
          marginBottom: hasNumbers ? 10 : 6,
          letterSpacing: "-0.01em",
        }}
      >
        {item.title}
      </h2>

      {/* Data row — only for items with actual numbers */}
      {hasNumbers && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 15,
              fontWeight: 700,
              color: theme.colors.textStrong,
              letterSpacing: "-0.02em",
            }}
          >
            {formatValue(data.actual, data.unit)}
          </span>
          {data.expected != null && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 11,
                color: theme.colors.textMuted,
              }}
            >
              exp {formatValue(data.expected, data.unit)}
            </span>
          )}
          {data.delta != null && data.delta !== 0 && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 11,
                fontWeight: 500,
                color: deltaColor(data.delta, theme),
              }}
            >
              {data.delta > 0 ? "+" : ""}{formatValue(data.delta, data.unit)}
            </span>
          )}
          {data.prior != null && (
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: 11,
                color: theme.colors.textGhost,
              }}
            >
              prev {formatValue(data.prior, data.unit)}
            </span>
          )}
        </div>
      )}

      {/* Narrative summary */}
      {item.description && (
        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 14,
            lineHeight: 1.55,
            color: theme.colors.textMuted,
            marginBottom: item.context ? 6 : 0,
          }}
        >
          {item.description}
        </p>
      )}

      {/* Source context line */}
      {item.context && (
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textFaint,
            letterSpacing: "0.02em",
          }}
        >
          {item.context}
        </p>
      )}
    </a>
  );
}
