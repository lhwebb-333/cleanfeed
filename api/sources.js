import { SOURCES } from "./_lib/shared.js";

export default function handler(req, res) {
  const sources = Object.entries(SOURCES).map(([key, s]) => ({
    key,
    name: s.name,
    color: s.color,
  }));
  res.setHeader("Cache-Control", "s-maxage=3600");
  res.json({ ok: true, sources });
}
