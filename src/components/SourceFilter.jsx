import { SOURCES, getSourceColor, ALL_SUBSOURCE_NAMES } from "../utils/sources";
import { useTheme } from "../hooks/useTheme";

const SUB_SET = new Set(ALL_SUBSOURCE_NAMES);

export function SourceFilter({
  enabledSources,
  toggleSource,
  enableAllSources,
  disableAllSources,
  sourceCounts,
  selectedState,
  sidebar,
}) {
  const { theme } = useTheme();
  const localName = selectedState ? `Local ${selectedState}` : null;
  const primarySources = SOURCES.filter((s) => !SUB_SET.has(s.name));
  const allSources = localName
    ? [...primarySources, { key: "local", name: localName, color: getSourceColor(localName) }]
    : primarySources;
  const allOn = enabledSources.size >= allSources.length;

  if (sidebar) {
    return (
      <div style={{
        padding: `${theme.spacing.md}px 12px 0`,
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}>
          <p style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            fontWeight: 700,
            color: theme.colors.textFaint,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}>
            Sources
          </p>
          <button
            onClick={allOn ? disableAllSources : enableAllSources}
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {allSources.map((s) => {
            const on = enabledSources.has(s.name);
            return (
              <button
                key={s.key}
                onClick={() => toggleSource(s.name)}
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 9,
                  fontWeight: 600,
                  padding: "3px 8px",
                  border: on
                    ? `1px solid ${s.color}50`
                    : `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.sm,
                  cursor: "pointer",
                  letterSpacing: "0.03em",
                  transition: theme.transitions.fast,
                  background: on ? s.color + "15" : "transparent",
                  color: on ? s.color : theme.colors.textFaint,
                  opacity: on ? 1 : 0.5,
                  whiteSpace: "nowrap",
                }}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Mobile horizontal scroll
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: `6px ${theme.spacing.lg}px`,
        maxWidth: 960,
        margin: "0 auto",
        overflowX: "auto",
        flexWrap: "nowrap",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
      className="source-filter-row"
    >
      <button
        onClick={allOn ? disableAllSources : enableAllSources}
        style={{
          fontFamily: theme.fonts.mono,
          fontSize: 9,
          padding: "3px 8px",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.sm,
          cursor: "pointer",
          letterSpacing: "0.06em",
          background: "transparent",
          color: theme.colors.textFaint,
          flexShrink: 0,
        }}
      >
        {allOn ? "NONE" : "ALL"}
      </button>
      {allSources.map((s) => {
        const on = enabledSources.has(s.name);
        const count = sourceCounts[s.name] || 0;
        return (
          <button
            key={s.key}
            onClick={() => toggleSource(s.name)}
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 600,
              padding: "3px 8px",
              border: on
                ? `1px solid ${s.color}50`
                : `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.sm,
              cursor: "pointer",
              letterSpacing: "0.03em",
              transition: theme.transitions.fast,
              background: on ? s.color + "15" : "transparent",
              color: on ? s.color : theme.colors.textFaint,
              opacity: on ? 1 : 0.5,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {s.name}
            {count > 0 && (
              <span style={{ marginLeft: 4, opacity: 0.5, fontSize: 8 }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
