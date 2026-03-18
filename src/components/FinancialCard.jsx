import { useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { timeAgo } from "../utils/time";

const FINANCIAL_COLOR = "#607D8B";

function formatValue(value, unit) {
  if (value == null) return "\u2014";
  const num = typeof value === "number" ? value : parseFloat(value);
  if (isNaN(num)) return String(value);
  if (unit === "%") return `${num.toFixed(1)}%`;
  if (unit === "K") return `${num > 0 ? "+" : ""}${num.toFixed(0)}K`;
  if (unit === "M") return `${num.toFixed(1)}M`;
  if (unit === "B") return `$${num.toFixed(1)}B`;
  if (unit === "$B") return `$${num.toFixed(1)}B`;
  if (unit === "bp") return `${num.toFixed(0)} bp`;
  return num.toFixed(2);
}

function deltaColor(delta, theme) {
  if (delta == null || delta === 0) return theme.colors.textFaint;
  return delta > 0 ? "#4CAF50" : "#EF5350";
}

// Section label colors
const SECTION_COLORS = {
  number: "#607D8B",
  expectations: "#2196F3",
  benchmark: "#FF8C00",
  trend: "#9C27B0",
  why: "#4CAF50",
  reaction: "#EF5350",
  calendar: "#FF8C00",
};

export function FinancialCard({ item }) {
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const color = FINANCIAL_COLOR;
  const data = item.data || {};
  const hasNumbers = data.actual != null;
  const cardContext = item.cardContext || [];
  const hasContext = cardContext.length > 0;

  return (
    <div
      style={{
        display: "block",
        padding: "18px 16px 18px 20px",
        borderBottom: `1px solid ${theme.colors.border}`,
        borderLeft: `3px solid ${hovered ? color : color + "40"}`,
        transition: theme.transitions.normal,
        background: hovered ? theme.colors.surfaceHover : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top row: source + indicator + time */}
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

      {/* Headline — clickable to source */}
      <a
        href={item.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
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
      </a>

      {/* Data row */}
      {hasNumbers && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 16,
            marginBottom: 10,
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
            <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textMuted }}>
              exp {formatValue(data.expected, data.unit)}
            </span>
          )}
          {data.delta != null && data.delta !== 0 && (
            <span style={{
              fontFamily: theme.fonts.mono, fontSize: 11, fontWeight: 500,
              color: deltaColor(data.delta, theme),
            }}>
              {data.delta > 0 ? "+" : ""}{formatValue(data.delta, data.unit)}
            </span>
          )}
          {data.prior != null && (
            <span style={{ fontFamily: theme.fonts.mono, fontSize: 11, color: theme.colors.textGhost }}>
              prev {formatValue(data.prior, data.unit)}
            </span>
          )}
        </div>
      )}

      {/* Card context sections — always show first 2, expand for rest */}
      {hasContext && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {cardContext.slice(0, expanded ? undefined : 2).map((section, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{
                fontFamily: theme.fonts.mono, fontSize: 7, fontWeight: 700,
                color: SECTION_COLORS[section.type] || theme.colors.textFaint,
                letterSpacing: "0.04em", textTransform: "uppercase",
                flexShrink: 0, minWidth: 70, textAlign: "right",
              }}>
                {section.label}
              </span>
              <p style={{
                fontFamily: theme.fonts.serif, fontSize: 13, lineHeight: 1.5,
                color: i === 0 ? theme.colors.text : theme.colors.textMuted,
                margin: 0,
              }}>
                {section.text}
              </p>
            </div>
          ))}
          {cardContext.length > 2 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                fontFamily: theme.fonts.mono, fontSize: 8,
                color: theme.colors.textFaint, background: "none",
                border: "none", cursor: "pointer", padding: 0,
                textAlign: "left", marginLeft: 78,
                letterSpacing: "0.04em",
              }}
            >
              {expanded ? "LESS \u25B4" : `MORE CONTEXT \u25BE`}
            </button>
          )}
        </div>
      )}

      {/* Source link */}
      {item.context && !hasContext && (
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textFaint,
            letterSpacing: "0.02em",
            marginTop: 6,
          }}
        >
          {item.context}
        </p>
      )}
    </div>
  );
}
