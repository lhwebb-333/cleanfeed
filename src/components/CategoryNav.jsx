import { CATEGORIES } from "../utils/sources";
import { useTheme } from "../hooks/useTheme";

export function CategoryNav({
  enabledCategories,
  toggleCategory,
  enableAll,
  disableAll,
  categoryCounts,
  horizontal,
}) {
  const { theme } = useTheme();
  const allOn = enabledCategories.size === CATEGORIES.length;

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
        }}
      >
        {CATEGORIES.map((cat) => {
          const on = enabledCategories.has(cat.key);
          const count = categoryCounts[cat.key] || 0;
          return (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
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
              {cat.label} {count > 0 && <span style={{ opacity: 0.5 }}>{count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

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
        return (
          <button
            key={cat.key}
            onClick={() => toggleCategory(cat.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
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
          </button>
        );
      })}
    </nav>
  );
}
