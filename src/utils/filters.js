const OPINION_KEYWORDS = [
  "opinion",
  "editorial",
  "commentary",
  "column",
  "op-ed",
  "oped",
  "analysis:",
  "perspective",
  "letters to",
  "review:",
  "podcast",
  "newsletter",
  "quiz",
  "crossword",
  "horoscope",
  "cartoon",
  "satire",
];

/**
 * Returns true if the article appears to be opinion/editorial content.
 * Used as a client-side safety net — server already filters these.
 */
export function isOpinion(title = "", description = "") {
  const text = `${title} ${description}`.toLowerCase();
  return OPINION_KEYWORDS.some((keyword) => text.includes(keyword));
}

/**
 * Strip HTML tags from a string
 */
export function stripHtml(html = "") {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}
