import { useState } from "react";
import { CATEGORIES, CATEGORY_SUBSOURCES } from "../utils/sources";
import { useTheme } from "../hooks/useTheme";

export function CategoryNav({
  enabledCategories,
  toggleCategory,
  enableAll,
  disableAll,
  categoryCounts,
  disabledSubSources,
  toggleSubSource,
  horizontal,
}) {
  const { theme } = useTheme();
  const allOn = enabledCategories.size === CATEGORIES.length;
  const [expandedCat, setExpandedCat] = useState(null);

  const handleCatClick = (key) => {
    toggleCategory(key);
  };

  const handleExpandClick = (e, key) => {
    e.stopPropagation();
    setExpandedCat(expandedCat === key ? null : key);
  };

  const renderSubPills = (catKey) => {
    const subs = CATEGORY_SUBSOURCES[catKey];
    if (!subs || expandedCat !== catKey) return null;

    return subs.map((sub) => {
      const on = !disabledSubSources?.has(sub.name);
      return (
        <button
          key={sub.name}
          onClick={(e) => {
            e.stopPropagation();
            toggleSubSource?.(sub.name);
          }}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            padding: "3px 8px",
            border: on
              ? `1px solid ${sub.color}50`
              : `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.sm,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: theme.transitions.fast,
            background: on ? sub.color + "18" : "transparent",
            color: on ? sub.color : theme.colors.textFaint,
            opacity: on ? 1 : 0.4,
          }}
        >
          {sub.name}
        </button>
      );
    });
  };

  if (horizontal) {
    return (
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: `0 ${theme.spacing.lg}px ${theme.spacing.md}px`,
          overflowX: "auto",
          maxWidth: 960,
          margin: "0 auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          alignItems: "center",
        }}
      >
        {CATEGORIES.map((cat) => {
          const on = enabledCategories.has(cat.key);
          const count = categoryCounts[cat.key] || 0;
          const hasSubs = !!CATEGORY_SUBSOURCES[cat.key];
          const isExpanded = expandedCat === cat.key;

          return (
            <div
              key={cat.key}
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                flexShrink: 0,
              }}
            >
              <button
                onClick={() => handleCatClick(cat.key)}
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 11,
                  padding: "5px 12px",
                  border: on
                    ? "1px solid rgba(255,140,0,0.3)"
                    : `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.sm,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: theme.transitions.fast,
                  background: on ? "rgba(255,140,0,0.1)" : "transparent",
                  color: on ? theme.colors.textStrong : theme.colors.textFaint,
                  opacity: on ? 1 : 0.5,
                }}
              >
                {cat.label}
                {count > 0 && (
                  <span style={{ marginLeft: 4, opacity: 0.5 }}>{count}</span>
                )}
              </button>
              {hasSubs && (
                <button
                  onClick={(e) => handleExpandClick(e, cat.key)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 6px",
                    fontSize: 9,
                    opacity: isExpanded ? 0.8 : 0.4,
                    display: "inline-block",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: theme.transitions.fast,
                    color: on ? theme.colors.textStrong : theme.colors.textFaint,
                  }}
                >
                  ▸
                </button>
              )}
              {renderSubPills(cat.key)}
            </div>
          );
        })}
      </div>
    );
  }

  // Sidebar (desktop) layout
  return (
    <nav
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        minWidth: 160,
        paddingTop: theme.spacing.md,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 12px",
          marginBottom: 12,
        }}
      >
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            fontWeight: 700,
            color: theme.colors.textFaint,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Filter Feed
        </p>
        <button
          onClick={allOn ? disableAll : enableAll}
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            color: theme.colors.textFaint,
            background: "none",
            border: "none",
            cursor: "pointer",
            letterSpacing: "0.05em",
            opacity: 0.7,
          }}
        >
          {allOn ? "NONE" : "ALL"}
        </button>
      </div>

      {CATEGORIES.map((cat) => {
        const on = enabledCategories.has(cat.key);
        const count = categoryCounts[cat.key] || 0;
        const hasSubs = !!CATEGORY_SUBSOURCES[cat.key];
        const isExpanded = expandedCat === cat.key;

        return (
          <div key={cat.key}>
            <button
              onClick={() => handleCatClick(cat.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                fontFamily: theme.fonts.serif,
                fontSize: 14,
                padding: "9px 12px",
                border: "none",
                borderRadius: theme.radii.sm,
                cursor: "pointer",
                textAlign: "left",
                transition: theme.transitions.fast,
                background: "transparent",
                color: on ? theme.colors.textStrong : theme.colors.textFaint,
                opacity: on ? 1 : 0.45,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: on ? "#FF8C00" : "transparent",
                  border: on ? "none" : `1.5px solid ${theme.colors.textFaint}`,
                  flexShrink: 0,
                  transition: theme.transitions.fast,
                }}
              />
              <span style={{ flex: 1 }}>{cat.label}</span>
              {count > 0 && (
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 10,
                    color: theme.colors.textFaint,
                    opacity: on ? 0.7 : 0.4,
                  }}
                >
                  {count}
                </span>
              )}
              {hasSubs && (
                <span
                  onClick={(e) => handleExpandClick(e, cat.key)}
                  style={{
                    fontSize: 9,
                    opacity: isExpanded ? 0.8 : 0.4,
                    display: "inline-block",
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                    transition: theme.transitions.fast,
                    cursor: "pointer",
                    padding: "2px 4px",
                  }}
                >
                  ▸
                </span>
              )}
            </button>

            {/* Sub-source pills — slide in below the category */}
            {hasSubs && (
              <div
                style={{
                  display: "flex",
                  display: "flex",
                  gap: 4,
                  paddingLeft: 12,
                  paddingRight: 12,
                  overflow: "hidden",
                  maxHeight: isExpanded ? 40 : 0,
                  opacity: isExpanded ? 1 : 0,
                  transition: "max-height 0.2s ease, opacity 0.15s ease",
                  marginBottom: isExpanded ? 4 : 0,
                }}
              >
                {CATEGORY_SUBSOURCES[cat.key].map((sub) => {
                  const subOn = !disabledSubSources?.has(sub.name);
                  return (
                    <button
                      key={sub.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSubSource?.(sub.name);
                      }}
                      style={{
                        fontFamily: theme.fonts.mono,
                        fontSize: 9,
                        padding: "3px 7px",
                        border: subOn
                          ? `1px solid ${sub.color}50`
                          : `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: theme.transitions.fast,
                        background: subOn ? sub.color + "18" : "transparent",
                        color: subOn ? sub.color : theme.colors.textFaint,
                        opacity: subOn ? 1 : 0.4,
                      }}
                    >
                      {sub.short || sub.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
