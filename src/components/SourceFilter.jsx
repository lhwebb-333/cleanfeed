import { SOURCES, getSourceColor } from "../utils/sources";
import { useTheme } from "../hooks/useTheme";

export function SourceFilter({
  enabledSources,
  toggleSource,
  enableAllSources,
  disableAllSources,
  sourceCounts,
  selectedState,
}) {
  const { theme } = useTheme();
  const localName = selectedState ? `Local ${selectedState}` : null;
  const allSources = localName
    ? [...SOURCES, { key: "local", name: localName, color: getSourceColor(localName) }]
    : SOURCES;
  const allOn = enabledSources.size >= allSources.length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: `${theme.spacing.md}px ${theme.spacing.lg}px`,
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
          padding: "5px 10px",
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.sm,
          cursor: "pointer",
          letterSpacing: "0.06em",
          background: "transparent",
          color: theme.colors.textFaint,
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
              fontSize: 11,
              fontWeight: 600,
              padding: "5px 14px",
              border: on
                ? `1px solid ${s.color}50`
                : `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.sm,
              cursor: "pointer",
              letterSpacing: "0.04em",
              transition: theme.transitions.fast,
              background: on ? s.color + "15" : "transparent",
              color: on ? s.color : theme.colors.textFaint,
              opacity: on ? 1 : 0.5,
              whiteSpace: "nowrap",
            }}
          >
            {s.name}
            {count > 0 && (
              <span style={{ marginLeft: 6, opacity: 0.5, fontSize: 9 }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
