// Server-rendered About page — crawlable by Google, zero JavaScript
// Mirrors the About modal content but lives at /about for SEO

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function handler(req, res) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>About Clean Feed — News without tracking, algorithms, or ads</title>
  <meta name="description" content="Clean Feed is a free, privacy-focused news aggregator. No tracking, no algorithm, no ads, no account. Chronological headlines from Reuters, AP, BBC, and NPR. The same feed for everyone.">
  <link rel="canonical" href="https://thecleanfeed.app/about">
  <meta property="og:type" content="website">
  <meta property="og:title" content="About Clean Feed — News without tracking, algorithms, or ads">
  <meta property="og:description" content="A free, privacy-focused news reader. No tracking, no algorithm, no account. Wire services in chronological order.">
  <meta property="og:url" content="https://thecleanfeed.app/about">
  <meta property="og:image" content="https://thecleanfeed.app/og-image.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 32px 20px 48px;
      background: #fff;
      color: #222;
      line-height: 1.7;
    }
    a { color: #222; }
    .masthead {
      font-family: monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.15em;
      margin-bottom: 2px;
    }
    .tagline {
      font-style: italic;
      color: #888;
      font-size: 14px;
      margin-bottom: 32px;
    }
    h2 {
      font-family: monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #999;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
      margin: 32px 0 14px;
    }
    p { font-size: 15px; margin-bottom: 14px; }
    .lead { font-size: 16px; line-height: 1.7; margin-bottom: 16px; }
    .source-list {
      list-style: none;
      padding: 0;
    }
    .source-list li {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .source-name { font-weight: 500; }
    .source-desc {
      font-family: monospace;
      font-size: 10px;
      color: #888;
      margin-left: 6px;
    }
    .box {
      padding: 16px;
      background: #f8f8f8;
      border: 1px solid #eee;
      border-radius: 6px;
      margin: 16px 0;
    }
    .box p { font-size: 13px; }
    .filter-label {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #555;
      margin-bottom: 2px;
    }
    .filter-desc {
      font-size: 12px;
      color: #777;
      line-height: 1.5;
      margin-bottom: 12px;
    }
    .cost-row {
      font-family: monospace;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      line-height: 2.2;
    }
    .cost-total {
      border-top: 1px solid #ddd;
      padding-top: 6px;
      margin-top: 4px;
      font-weight: 700;
    }
    .privacy-item { margin-bottom: 10px; }
    .privacy-label {
      font-family: monospace;
      font-size: 11px;
      font-weight: 700;
      color: #555;
    }
    .privacy-desc {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
    .footer {
      font-family: monospace;
      font-size: 9px;
      color: #aaa;
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #ddd;
    }
    .footer a { color: #888; }
    .cta {
      display: inline-block;
      font-family: monospace;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      padding: 10px 20px;
      background: #222;
      color: #fff;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 4px;
    }
    .nav-top {
      display: flex;
      gap: 6px;
      float: right;
      margin-top: -22px;
    }
    .nav-btn {
      font-family: monospace;
      font-size: 10px;
      padding: 4px 10px;
      background: none;
      border: 1px solid #ddd;
      border-radius: 3px;
      color: #888;
      text-decoration: none;
      cursor: pointer;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #111; color: #ddd; }
      a { color: #ddd; }
      h2 { color: #666; border-color: #333; }
      .source-list li { border-color: #222; }
      .source-desc { color: #777; }
      .box { background: #1a1a1a; border-color: #333; }
      .filter-label { color: #aaa; }
      .filter-desc { color: #888; }
      .cost-row { color: #ccc; }
      .cost-total { border-color: #333; }
      .privacy-label { color: #aaa; }
      .privacy-desc { color: #888; }
      .footer { border-color: #333; color: #555; }
      .footer a { color: #666; }
      .cta { background: #ddd; color: #111; }
      .nav-btn { border-color: #333; color: #666; }
    }
  </style>
</head>
<body>
  <p class="masthead">CLEAN FEED</p>
  <div class="nav-top">
    <a href="https://thecleanfeed.app" class="nav-btn">Live Feed</a>
    <a href="/api/reader" class="nav-btn">Reader Mode</a>
  </div>
  <p class="tagline">No algorithms. No rage. Just news.</p>

  <p class="lead">
    Somewhere along the way, reading the news became an act of
    self-harm. Every app, every feed, every notification &mdash; engineered
    to keep you angry, anxious, and scrolling.
  </p>
  <p>
    Clean Feed is what's left when you strip all of that away.
    Wire services. Chronological order. The same feed for everyone.
    No voice. No curation. No opinion about what you should care about.
  </p>
  <p><em>Just the world, as it happened, in the order it happened.</em></p>

  <h2>Why This Exists</h2>
  <p>
    Most news products are designed to keep you scrolling. They use
    algorithms, notifications, outrage, and engagement tricks to
    maximize your time on screen &mdash; because your attention is what
    they sell to advertisers.
  </p>
  <p>
    The news became a machine for producing anxiety in people
    who wanted to be informed. The algorithm learned that outrage
    keeps you scrolling. The business model learned that your
    attention is the product.
  </p>
  <p>
    We refused the premise. No ads. No algorithm. No account.
    What remains is just the news &mdash; and your freedom to stop reading it.
  </p>

  <h2>Sources</h2>
  <ul class="source-list">
    <li><span class="dot" style="background:#FF8C00"></span><span class="source-name">Reuters</span><span class="source-desc">International wire service</span></li>
    <li><span class="dot" style="background:#4A90D9"></span><span class="source-name">Associated Press</span><span class="source-desc">Independent news agency</span></li>
    <li><span class="dot" style="background:#C1272D"></span><span class="source-name">BBC News</span><span class="source-desc">British Broadcasting Corporation</span></li>
    <li><span class="dot" style="background:#5BBD72"></span><span class="source-name">NPR</span><span class="source-desc">National Public Radio</span></li>
  </ul>

  <p style="font-size:13px;color:#888;margin-top:14px;">
    Plus 17 specialty sources across tech, science, health, and financial coverage &mdash;
    including Ars Technica, MIT Technology Review, Nature, Phys.org, STAT News, KFF Health News,
    Bloomberg, FRED, SEC, BLS, U.S. Treasury, and the Federal Reserve.
  </p>

  <h2>What We Edit (and why)</h2>
  <div class="box">
    <p style="font-size:14px;margin-bottom:14px;">
      Clean Feed has no ranking algorithm. Every article appears in the order it was published.
      But we do apply three mechanical filters, and you should know exactly what they are:
    </p>
    <div class="filter-label">Opinion filter</div>
    <p class="filter-desc">
      We remove editorials, op-eds, commentary, podcasts, and newsletters.
      Clean Feed shows what happened, not what someone thinks about it.
    </p>
    <div class="filter-label">Duplicate removal</div>
    <p class="filter-desc">
      When the same story is reported by multiple sources, we group them
      and show the earliest version with links to all others.
    </p>
    <div class="filter-label">Category sorting</div>
    <p class="filter-desc">
      Each article is tagged (World, Sports, Tech, etc.) using keyword matching
      so you can filter by topic.
    </p>
    <div class="filter-label">Daily digest curation</div>
    <p class="filter-desc">
      The email digest ranks stories by source count &mdash; if 5 independent outlets
      cover the same event, it ranks higher than a story covered by 2. No editor
      chooses what goes in.
    </p>
    <p style="font-size:12px;color:#888;font-style:italic;margin-bottom:0;">
      That's it. No engagement optimization. No personalization. No boosting.
      No suppression. The order is always chronological. What you see is what
      everyone sees.
    </p>
  </div>

  <h2>Your Privacy</h2>
  <div class="privacy-item"><span class="privacy-label">No accounts</span><p class="privacy-desc">No sign-up, no login, no profile. You are anonymous.</p></div>
  <div class="privacy-item"><span class="privacy-label">No tracking</span><p class="privacy-desc">No advertising pixels, no fingerprinting, no analytics cookies.</p></div>
  <div class="privacy-item"><span class="privacy-label">No data sold</span><p class="privacy-desc">We have no data to sell. We don't collect personal information.</p></div>
  <div class="privacy-item"><span class="privacy-label">Location (weather)</span><p class="privacy-desc">If you allow location access, your coordinates are sent to the National Weather Service. Your location is stored only in your browser &mdash; never on our servers.</p></div>
  <div class="privacy-item"><span class="privacy-label">Local storage only</span><p class="privacy-desc">Your preferences (theme, filters, muted keywords) are saved in your browser and never leave your device.</p></div>
  <div class="privacy-item"><span class="privacy-label">Analytics</span><p class="privacy-desc">We count daily page views using a simple server-side counter. No cookies, no client-side tracking, no third-party services.</p></div>

  <h2>Features</h2>
  <p style="font-size:14px;">
    Live sports scores (NFL, NBA, MLB, NHL, EPL, F1, PGA) &middot;
    Real-time market data (S&amp;P 500, Dow, Nasdaq, VIX, Gold, Oil) &middot;
    Financial indicators with plain-English context &middot;
    Local weather with 3-day forecast &middot;
    Local news for all 50 US states &middot;
    Daily email digest &middot;
    This Day in History &middot;
    Dark and light mode &middot;
    E-ink reader mode &middot;
    Installable as a mobile app (PWA)
  </p>

  <h2>Transparency</h2>
  <p>
    Clean Feed has no investors, no board, and no one to answer to except you.
    Here's exactly what it costs to run:
  </p>
  <div class="cost-row"><span>Hosting (Vercel)</span><span style="color:#888">$0/mo</span></div>
  <div class="cost-row"><span>Domain</span><span style="color:#888">~$1/mo</span></div>
  <div class="cost-row"><span>APIs (weather, scores, markets)</span><span style="color:#888">$0/mo</span></div>
  <div class="cost-row"><span>Data collection / tracking</span><span style="color:#888">$0 forever</span></div>
  <div class="cost-row cost-total"><span>Total</span><span>~$1/mo</span></div>
  <p style="font-size:13px;color:#888;font-style:italic;margin-top:10px;">
    We chose free, open tools on purpose. Low costs mean we never need to
    compromise the product to pay the bills.
  </p>

  <h2>Reader Mode</h2>
  <p>
    A clean, text-only view optimized for E-ink devices, Kindle browsers,
    and distraction-free reading. Zero JavaScript, just articles.
    <a href="/api/reader" style="text-decoration:underline;text-underline-offset:2px;">Open Reader Mode</a>
  </p>

  <h2 style="border:none;margin-bottom:8px;">Read the news without the noise</h2>
  <a href="https://thecleanfeed.app" class="cta">Open Clean Feed</a>

  <p class="footer">
    <a href="https://thecleanfeed.app">Home</a> &middot;
    <a href="/api/reader">Reader Mode</a> &middot;
    <a href="mailto:cleanfeedapp@gmail.com?subject=Feedback">Contact</a>
    <br>All content belongs to its respective publishers. Sources last vetted March 2026.
  </p>
</body>
</html>`;

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=86400");
  res.send(html);
}
