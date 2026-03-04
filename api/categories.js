import { CATEGORIES } from "./_lib/shared.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600");
  res.json({ ok: true, categories: CATEGORIES });
}
