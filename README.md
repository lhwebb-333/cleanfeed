# Clean Feed

**News only. No opinions. No rage. No algorithms.**

A clean RSS news reader pulling from Reuters, AP, and BBC — chronologically sorted, opinion-filtered, zero engagement tricks.

## Architecture

```
cleanfeed/
├── public/                  # Static assets
│   └── index.html
├── server/
│   └── rss-proxy.js         # Backend RSS proxy (avoids CORS + rate limits)
├── src/
│   ├── components/
│   │   ├── App.jsx           # Root component
│   │   ├── FeedList.jsx      # Article list
│   │   ├── ArticleCard.jsx   # Single article
│   │   ├── SourceFilter.jsx  # Source toggle bar
│   │   └── Header.jsx        # App header + refresh
│   ├── hooks/
│   │   └── useFeed.js        # Feed fetching + polling logic
│   ├── utils/
│   │   ├── filters.js        # Opinion/editorial content filters
│   │   ├── sources.js        # RSS source config
│   │   └── time.js           # Time formatting helpers
│   └── styles/
│       └── theme.js          # Design tokens + theme config
├── package.json
├── .env.example
└── README.md
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Express.js RSS proxy
- **Styling**: CSS-in-JS (inline styles w/ theme tokens) or swap to Tailwind
- **Deployment**: Vercel, Railway, or any Node host

## Getting Started

```bash
npm install
cp .env.example .env

# Development (runs frontend + backend concurrently)
npm run dev

# Production build
npm run build
npm start
```

## Claude Code Instructions

When handing this to Claude Code, here are the priority tasks:

### Phase 1 — Core (MVP)
- [ ] Wire up Vite + React from this template
- [ ] Implement the Express RSS proxy (`server/rss-proxy.js`)
- [ ] Connect frontend to backend proxy instead of rss2json
- [ ] Add pull-to-refresh on mobile
- [ ] Add PWA support (service worker, manifest, offline cache)

### Phase 2 — Polish
- [ ] Add category tabs (World, Business, Tech, Science, Health)
- [ ] Push notifications via service worker
- [ ] Reading time estimates
- [ ] "Read later" queue (local storage)
- [ ] Dark/light theme toggle
- [ ] Skeleton loading states

### Phase 3 — Scale
- [ ] Redis caching layer for RSS feeds
- [ ] User accounts (optional) for saved preferences
- [ ] RSS feed health monitoring + fallbacks
- [ ] Rate limiting on proxy
- [ ] Analytics (privacy-respecting, no tracking)

### Phase 4 — Distribution
- [ ] React Native wrapper (Expo) for iOS/Android
- [ ] App Store / Play Store submission
- [ ] Landing page

## Design Principles

1. **Chronological only** — no engagement sorting, ever
2. **No opinions** — editorial/op-ed content is filtered out
3. **No ads** — no ad network, no sponsored content
4. **No tracking** — no analytics that identify users
5. **Fast** — target <1s load, <50KB JS bundle
6. **Accessible** — WCAG 2.1 AA compliant
