import { useTheme } from "../hooks/useTheme";

export function About({ open, onClose }) {
  const { theme } = useTheme();

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: theme.colors.surface,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.lg,
          maxWidth: 480,
          width: "100%",
          padding: 32,
          maxHeight: "80vh",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: theme.colors.textStrong,
            }}
          >
            ABOUT CLEAN FEED
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: theme.colors.textMuted,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 15,
            lineHeight: 1.6,
            color: theme.colors.text,
            marginBottom: 20,
          }}
        >
          Clean Feed is a news reader that shows headlines from trusted wire
          services — chronologically sorted, with no algorithmic ranking, no
          opinions, and no engagement tricks.
        </p>

        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 15,
            lineHeight: 1.6,
            color: theme.colors.text,
            marginBottom: 24,
          }}
        >
          We don't host or republish any content. Every headline links directly
          to the original article on the publisher's website. We're just a
          cleaner front door.
        </p>

        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Sources
          </p>
          {[
            { name: "Reuters", url: "https://www.reuters.com", color: "#FF8C00", desc: "International wire service" },
            { name: "Associated Press", url: "https://apnews.com", color: "#4A90D9", desc: "Independent news agency" },
            { name: "BBC News", url: "https://www.bbc.com/news", color: "#C1272D", desc: "British Broadcasting Corporation" },
            { name: "NPR", url: "https://www.npr.org", color: "#5BBD72", desc: "National Public Radio" },
          ].map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${theme.colors.border}`,
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: s.color,
                  flexShrink: 0,
                }}
              />
              <div>
                <span
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontSize: 14,
                    fontWeight: 500,
                    color: theme.colors.textStrong,
                  }}
                >
                  {s.name}
                </span>
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: 10,
                    color: theme.colors.textFaint,
                    marginLeft: 8,
                  }}
                >
                  {s.desc}
                </span>
              </div>
            </a>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            How It Works
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
            }}
          >
            Powered by RSS — an open standard that news organizations use to
            distribute their headlines. We fetch public feeds, filter out
            opinion and editorial content, and display what's left in
            chronological order. No tracking, no cookies, no accounts required.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Local News
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
            }}
          >
            Local coverage is sourced from public RSS feeds offered by local
            newsrooms in each state. Our ethos is unbiased news, always — so if
            we can't find a neutral, fact-based local source for a state, we
            won't offer one. Coverage will grow as we vet new feeds, but we
            won't compromise the standard to fill the gap.
          </p>
        </div>

        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Our Mission
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
            }}
          >
            News should inform, not inflame. Clean Feed exists to give people a
            calm, unbiased window into what's happening — free from algorithms,
            outrage, and manipulation. We believe access to straight news is a
            public good.
          </p>
        </div>

        <div
          style={{
            padding: "16px",
            background: theme.colors.bg,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.md,
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            Support Clean Feed
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
              marginBottom: 12,
            }}
          >
            Clean Feed is free and always will be. If you find it useful,
            a small contribution helps cover hosting and development costs.
          </p>
          <a
            href="https://buymeacoffee.com/lhwebb"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              fontFamily: theme.fonts.mono,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              padding: "8px 16px",
              background: theme.colors.textStrong,
              color: theme.colors.bg,
              borderRadius: theme.radii.sm,
              textDecoration: "none",
              transition: theme.transitions.fast,
            }}
          >
            Buy us a coffee
          </a>
        </div>

        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 13,
            lineHeight: 1.6,
            color: theme.colors.textMuted,
            marginBottom: 20,
          }}
        >
          Know a good local source we're missing?{" "}
          <a
            href="mailto:cleanfeedapp@gmail.com?subject=Source suggestion for Clean Feed"
            style={{
              color: theme.colors.textStrong,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            Let us know
          </a>
          .
        </p>

        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 10,
            color: theme.colors.textGhost,
            letterSpacing: "0.03em",
            marginBottom: 4,
          }}
        >
          All content belongs to its respective publishers.
        </p>
        <p
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: 9,
            color: theme.colors.textGhost,
            letterSpacing: "0.03em",
          }}
        >
          Sources last vetted March 2026
        </p>
      </div>
    </div>
  );
}
