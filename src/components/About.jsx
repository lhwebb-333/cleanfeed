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
          Somewhere along the way, reading the news became an act of
          self-harm. Every app, every feed, every notification — engineered
          to keep you angry, anxious, and scrolling.
        </p>

        <p
          style={{
            fontFamily: theme.fonts.serif,
            fontSize: 15,
            lineHeight: 1.6,
            color: theme.colors.text,
            marginBottom: 12,
          }}
        >
          Clean Feed is what's left when you strip all of that away.
          Wire services. Chronological order. The same feed for everyone.
          No voice. No curation. No opinion about what you should care about.
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
          Just the world, as it happened, in the order it happened.
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
            { name: "Reuters", url: "https://www.reuters.com/info/disclaimer", color: "#FF8C00", desc: "International wire service", ethics: "Trust Principles" },
            { name: "Associated Press", url: "https://www.ap.org/about/news-values-and-principles", color: "#4A90D9", desc: "Independent news agency", ethics: "News Values" },
            { name: "BBC News", url: "https://www.bbc.com/editorialguidelines", color: "#C1272D", desc: "British Broadcasting Corporation", ethics: "Editorial Guidelines" },
            { name: "NPR", url: "https://www.npr.org/ethics", color: "#5BBD72", desc: "National Public Radio", ethics: "Ethics Handbook" },
          ].map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 0",
                borderBottom: `1px solid ${theme.colors.border}`,
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
                <span style={{ marginLeft: 6 }}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: 9,
                      color: theme.colors.textMuted,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    {s.ethics}
                  </a>
                </span>
              </div>
            </div>
          ))}

          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginTop: 20,
              marginBottom: 12,
            }}
          >
            Specialty Sources
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 12,
              lineHeight: 1.5,
              color: theme.colors.textMuted,
              marginBottom: 12,
            }}
          >
            Topic-specific outlets and government data sources selected for factual, primary-source reporting.
          </p>
          {[
            { name: "Christian Science Monitor", color: "#1565C0", desc: "Nonprofit, secular, center-rated newsroom", cat: "World" },
            { name: "Bloomberg", color: "#7B1FA2", desc: "Data-driven financial & economic wire", cat: "Financial" },
            { name: "Ars Technica", color: "#FF7043", desc: "In-depth technology reporting", cat: "Tech" },
            { name: "MIT Tech Review", color: "#EC407A", desc: "Research-focused tech journalism", cat: "Tech" },
            { name: "Nature", color: "#E53935", desc: "Premier scientific journal", cat: "Science" },
            { name: "Phys.org", color: "#4FC3F7", desc: "University & lab press releases", cat: "Science" },
            { name: "KFF Health News", color: "#AB47BC", desc: "Nonpartisan health policy", cat: "Health" },
            { name: "STAT News", color: "#00ACC1", desc: "Pharma & biotech reporting", cat: "Health" },
            { name: "FRED", color: "#607D8B", desc: "Federal Reserve Economic Data", cat: "Financial" },
            { name: "BLS", color: "#607D8B", desc: "Bureau of Labor Statistics", cat: "Financial" },
            { name: "Treasury", color: "#607D8B", desc: "U.S. Treasury rates & fiscal data", cat: "Financial" },
            { name: "SEC", color: "#607D8B", desc: "Securities & Exchange Commission filings", cat: "Financial" },
            { name: "Federal Reserve", color: "#607D8B", desc: "FOMC statements & policy releases", cat: "Financial" },
          ].map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 0",
                borderBottom: `1px solid ${theme.colors.border}`,
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
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontFamily: theme.fonts.serif,
                    fontSize: 13,
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
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 9,
                  color: s.color,
                  opacity: 0.7,
                  flexShrink: 0,
                }}
              >
                {s.cat}
              </span>
            </div>
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
              marginBottom: 10,
            }}
          >
            Powered by RSS — an open standard that news organizations use to
            distribute their headlines. We fetch public feeds and display
            what's left in chronological order. No accounts required.
          </p>
        </div>

        <div style={{
          marginBottom: 20,
          padding: 16,
          background: theme.colors.bg,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
        }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            What We Edit (and why)
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
            Clean Feed has no ranking algorithm — no system that decides which stories
            you should see first or which deserve more attention. Every article appears
            in the order it was published. But we do apply three mechanical filters,
            and you should know exactly what they are:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: "Opinion filter",
                detail: "We remove editorials, op-eds, commentary, podcasts, and newsletters. Clean Feed shows what happened, not what someone thinks about it. This filter uses keyword matching — it's not perfect, but it errs on the side of removal.",
              },
              {
                label: "Duplicate removal",
                detail: "When the same story is reported by multiple sources, we group them and show the earliest version with links to all others. This prevents the same headline from appearing four times. You can click \"Compare All\" to read every version.",
              },
              {
                label: "Category sorting",
                detail: "Each article is tagged (World, Sports, Tech, etc.) using keyword matching so you can filter by topic. This is imperfect — a story about an oil company might land in the wrong bucket. We're improving it constantly, but we'd rather be transparent about the limitation than pretend it doesn't exist.",
              },
            ].map((item) => (
              <div key={item.label}>
                <span style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.colors.textMuted,
                  letterSpacing: "0.03em",
                }}>
                  {item.label}
                </span>
                <p style={{
                  fontFamily: theme.fonts.serif,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: theme.colors.textFaint,
                  margin: "2px 0 0",
                }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 12,
              lineHeight: 1.5,
              color: theme.colors.textFaint,
              marginTop: 12,
              fontStyle: "italic",
            }}
          >
            That's it. No engagement optimization. No personalization. No boosting.
            No suppression. The order is always chronological. What you see is what
            everyone sees.
          </p>
        </div>

        <div style={{
          marginBottom: 20,
          padding: 16,
          background: theme.colors.bg,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.radii.md,
        }}>
          <p
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: theme.colors.textFaint,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Your Privacy
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "No accounts", detail: "No sign-up, no login, no profile. You are anonymous." },
              { label: "No tracking", detail: "We do not track you across the web. No advertising pixels, no fingerprinting, no analytics cookies." },
              { label: "No data sold", detail: "We have no data to sell. We don't collect personal information." },
              { label: "Location (weather)", detail: "If you allow location access, your coordinates are sent to the National Weather Service API to fetch your local forecast. Your location is stored only in your browser's local storage — never on our servers, never shared with third parties. You can deny the prompt and weather simply won't appear." },
              { label: "Local storage only", detail: "Your preferences (theme, filters, muted keywords, selected state, weather location, F/C preference) are saved in your browser's local storage. This data never leaves your device." },
              { label: "Vercel Analytics", detail: "We use Vercel's privacy-focused analytics to count page views. This collects no personal data, uses no cookies, and cannot identify individual visitors." },
            ].map((item) => (
              <div key={item.label}>
                <span style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: theme.colors.textMuted,
                  letterSpacing: "0.03em",
                }}>
                  {item.label}
                </span>
                <p style={{
                  fontFamily: theme.fonts.serif,
                  fontSize: 12,
                  lineHeight: 1.5,
                  color: theme.colors.textFaint,
                  margin: "2px 0 0",
                }}>
                  {item.detail}
                </p>
              </div>
            ))}
          </div>
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
            Why This Exists
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
              marginBottom: 10,
            }}
          >
            Most news products are designed to keep you scrolling. They use
            algorithms, notifications, outrage, and engagement tricks to
            maximize your time on screen — because your attention is what
            they sell to advertisers.
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
              marginBottom: 10,
            }}
          >
            The news became a machine for producing anxiety in people
            who wanted to be informed. The algorithm learned that outrage
            keeps you scrolling. The business model learned that your
            attention is the product.
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
            }}
          >
            We refused the premise. No ads. No algorithm. No account.
            What remains is just the news — and your freedom to stop reading it.
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
            Reader Mode
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
              marginBottom: 8,
            }}
          >
            A clean, text-only view optimized for E-ink devices, Kindle browsers,
            and distraction-free reading. Zero JavaScript, just articles.{" "}
            <a
              href="/api/reader"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: theme.colors.textStrong,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Open Reader Mode
            </a>
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
            Install the App
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
            }}
          >
            Add Clean Feed to your home screen for instant access — no app store needed.
            On <strong>iPhone</strong>: tap the share button then "Add to Home Screen."
            On <strong>Android</strong>: tap the menu (⋮) then "Install app."
            On <strong>Desktop</strong>: look for the install icon in your address bar.
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
            Transparency
          </p>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 13,
              lineHeight: 1.6,
              color: theme.colors.textMuted,
              marginBottom: 10,
            }}
          >
            Clean Feed has no investors, no board, and no one to answer to except you.
            Here's exactly what it costs to run:
          </p>
          <div style={{
            fontFamily: theme.fonts.mono, fontSize: 11, lineHeight: 2,
            color: theme.colors.text,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Hosting (Vercel)</span><span style={{ color: theme.colors.textFaint }}>$0/mo</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Domain</span><span style={{ color: theme.colors.textFaint }}>~$1/mo</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>APIs (weather, scores, markets)</span><span style={{ color: theme.colors.textFaint }}>$0/mo</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Data collection / tracking</span><span style={{ color: theme.colors.textFaint }}>$0 forever</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between",
              borderTop: `1px solid ${theme.colors.border}`, paddingTop: 6, marginTop: 6,
            }}>
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 700, color: theme.colors.textStrong }}>~$1/mo</span>
            </div>
          </div>
          <p
            style={{
              fontFamily: theme.fonts.serif,
              fontSize: 12,
              lineHeight: 1.5,
              color: theme.colors.textFaint,
              marginTop: 10,
              fontStyle: "italic",
            }}
          >
            We chose free, open tools on purpose. Low costs mean we never need to
            compromise the product to pay the bills.
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
