// Template-based neutral headline generator
// Rules: lead with data point, state actual value, compare to expectation
// NEVER use loaded verbs, NEVER attribute cause, NEVER predict

const BANNED_WORDS = new Set([
  // Magnitude spin
  "surge", "surges", "surged", "surging",
  "soar", "soars", "soared", "soaring",
  "skyrocket", "skyrockets", "skyrocketed", "skyrocketing",
  "plunge", "plunges", "plunged", "plunging",
  "plummet", "plummets", "plummeted", "plummeting",
  "tumble", "tumbles", "tumbled", "tumbling",
  "crater", "craters", "cratered", "cratering",
  "tank", "tanks", "tanked", "tanking",
  "nosedive", "nosedived",
  "explode", "explodes", "exploded", "exploding",
  "spike", "spikes", "spiked", "spiking",
  "collapse", "collapses", "collapsed", "collapsing",
  "moon", "mooned", "mooning",
  "dump", "dumps", "dumped", "dumping",
  "rip", "rips", "ripped", "ripping",
  "melt", "melts", "melted", "melting",
  "slam", "slams", "slammed", "slamming",
  "smash", "smashes", "smashed", "smashing",
  "rattle", "rattles", "rattled", "rattling",
  "roil", "roils", "roiled", "roiling",
  "rout", "routs", "routed", "routing",
  // Fear / editorial
  "panic", "fear", "fears", "euphoria",
  "doom", "shock", "shocks", "shocked", "shocking",
  "stun", "stuns", "stunned", "stunning",
  "carnage", "bloodbath", "freefall", "meltdown",
  "catastrophe", "catastrophic", "disaster", "disastrous",
  "crisis", "alarming", "troubling", "encouraging",
  "disappointing", "surprising", "remarkable",
  // Causation
  "due to", "because of", "driven by", "fueled by",
  "sparked by", "caused by", "thanks to", "amid",
  // Prediction
  "signaling", "suggesting", "pointing to",
  "raising fears", "stoking concerns", "sparking hopes",
  "raising hopes", "fueling speculation",
]);

const DIRECTION_WORDS = {
  up: "rose",
  down: "fell",
  flat: "was unchanged",
};

function direction(current, prior) {
  if (current > prior) return "up";
  if (current < prior) return "down";
  return "flat";
}

function formatValue(value, unit) {
  if (unit === "%") return `${value}%`;
  if (unit === "$") return `$${value}`;
  if (unit === "K") return `${value}K`;
  if (unit === "M") return `${value}M`;
  if (unit === "B") return `$${value}B`;
  if (unit === "$B") return `$${Number(value).toLocaleString()}B`;
  if (unit === "bp") return `${value} bp`;
  return String(value);
}

function vsExpected(actual, expected, unit) {
  if (expected == null) return "";
  const diff = actual - expected;
  if (Math.abs(diff) < 0.001) return ", in line with expectations";
  if (diff > 0) return `, above the ${formatValue(expected, unit)} expected`;
  return `, below the ${formatValue(expected, unit)} expected`;
}

// Template generators by indicator type
const TEMPLATES = {
  gdp: (data) => {
    const dir = DIRECTION_WORDS[direction(data.actual, data.prior)] || "was";
    return `GDP ${dir} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest quarter"}${vsExpected(data.actual, data.expected, data.unit)}`;
  },

  cpi: (data) => {
    const dir = DIRECTION_WORDS[direction(data.actual, data.prior)] || "was";
    return `CPI ${dir} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest month"}${vsExpected(data.actual, data.expected, data.unit)}`;
  },

  unemployment: (data) => {
    const dir = direction(data.actual, data.prior);
    if (dir === "flat") return `Unemployment rate unchanged at ${formatValue(data.actual, data.unit)}${vsExpected(data.actual, data.expected, data.unit)}`;
    const verb = dir === "up" ? "rose to" : "fell to";
    return `Unemployment rate ${verb} ${formatValue(data.actual, data.unit)} from ${formatValue(data.prior, data.unit)}${vsExpected(data.actual, data.expected, data.unit)}`;
  },

  fed_funds: (data) => {
    const dir = direction(data.actual, data.prior);
    if (dir === "flat") return `Federal funds rate unchanged at ${formatValue(data.actual, data.unit)}`;
    const verb = dir === "up" ? "raised to" : "lowered to";
    return `Federal funds rate ${verb} ${formatValue(data.actual, data.unit)} from ${formatValue(data.prior, data.unit)}`;
  },

  yield: (data) => {
    const dir = direction(data.actual, data.prior);
    const label = data.label || "10-Year Treasury yield";
    if (dir === "flat") return `${label} unchanged at ${formatValue(data.actual, data.unit)}`;
    const verb = dir === "up" ? "rose to" : "fell to";
    const delta = Math.abs(data.actual - data.prior).toFixed(2);
    return `${label} ${verb} ${formatValue(data.actual, data.unit)}, ${dir} ${delta} ${data.unit === "%" ? "pp" : data.unit} from prior`;
  },

  payroll: (data) => {
    const val = data.actual;
    return `Nonfarm payrolls ${val >= 0 ? "added" : "lost"} ${formatValue(Math.abs(val), data.unit)} jobs in ${data.period || "the latest month"}${vsExpected(data.actual, data.expected, data.unit)}`;
  },

  ppi: (data) => {
    const dir = DIRECTION_WORDS[direction(data.actual, data.prior)] || "was";
    return `PPI ${dir} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest month"}${vsExpected(data.actual, data.expected, data.unit)}`;
  },

  filing: (data) => {
    const form = data.formType || "8-K";
    return `${data.company} filed ${form}${data.description ? ": " + data.description : ""}`;
  },

  fed_statement: (data) => {
    // Fed statements pass through with banned word filtering only
    return sanitize(data.title || "Federal Reserve statement released");
  },

  generic: (data) => {
    if (data.actual != null && data.prior != null) {
      const dir = DIRECTION_WORDS[direction(data.actual, data.prior)] || "was";
      const label = data.label || data.indicator || "Indicator";
      return `${label} ${dir} ${formatValue(data.actual, data.unit)}${vsExpected(data.actual, data.expected, data.unit)}`;
    }
    return sanitize(data.title || data.label || "Financial data update");
  },
};

// Remove banned words from any text
export function sanitize(text) {
  if (!text) return text;
  let clean = text;
  for (const word of BANNED_WORDS) {
    // Match whole words only (case-insensitive)
    if (word.includes(" ")) {
      // Multi-word phrases: simple replace
      const regex = new RegExp(word, "gi");
      clean = clean.replace(regex, "");
    } else {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      clean = clean.replace(regex, "");
    }
  }
  // Clean up double spaces from removals
  return clean.replace(/\s{2,}/g, " ").replace(/\s([,.])/g, "$1").trim();
}

// Check if text contains banned words
export function hasBannedWords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (word.includes(" ")) {
      if (lower.includes(word)) return true;
    } else {
      const regex = new RegExp(`\\b${word}\\b`, "i");
      if (regex.test(lower)) return true;
    }
  }
  return false;
}

// Generate a neutral headline from structured data
export function generateHeadline(type, data) {
  const template = TEMPLATES[type] || TEMPLATES.generic;
  return template(data);
}

// Generate a 2-3 sentence narrative summary
// Slots: actual, prior, expected (if available), market reaction (if available)
const SUMMARY_TEMPLATES = {
  cpi: (data) => {
    const parts = [`CPI ${data.actual > data.prior ? "increased" : data.actual < data.prior ? "decreased" : "was unchanged at"} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest month"}, compared to ${formatValue(data.prior, data.unit)} the prior month.`];
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Consensus forecast was ${formatValue(data.expected, data.unit)} — actual came in ${vs} expectations.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  gdp: (data) => {
    const parts = [`Real GDP grew at ${formatValue(data.actual, data.unit)} annualized in ${data.period || "the latest quarter"}, compared to ${formatValue(data.prior, data.unit)} the prior quarter.`];
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual came in ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  unemployment: (data) => {
    const dir = data.actual > data.prior ? "rose to" : data.actual < data.prior ? "fell to" : "held at";
    const parts = [`Unemployment rate ${dir} ${formatValue(data.actual, data.unit)}, from ${formatValue(data.prior, data.unit)} the prior month.`];
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Economists expected ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  fed_funds: (data) => {
    const dir = data.actual > data.prior ? "raised to" : data.actual < data.prior ? "lowered to" : "held at";
    const parts = [`The Federal Reserve ${dir} the federal funds rate at ${formatValue(data.actual, data.unit)}.`];
    if (data.prior !== data.actual) parts.push(`Previous rate was ${formatValue(data.prior, data.unit)}.`);
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  yield: (data) => {
    const label = data.label || "10-Year Treasury yield";
    const dir = data.actual > data.prior ? "rose" : data.actual < data.prior ? "fell" : "was unchanged";
    const delta = Math.abs(data.actual - data.prior).toFixed(2);
    const parts = [`${label} ${dir} to ${formatValue(data.actual, data.unit)}, a move of ${delta} percentage points from the prior session's ${formatValue(data.prior, data.unit)}.`];
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  payroll: (data) => {
    const verb = data.actual >= 0 ? "added" : "lost";
    const parts = [`The economy ${verb} ${formatValue(Math.abs(data.actual), data.unit)} jobs in ${data.period || "the latest month"}, compared to ${formatValue(data.prior, data.unit)} the prior month.`];
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  ppi: (data) => {
    const parts = [`Producer prices ${data.actual > data.prior ? "increased" : data.actual < data.prior ? "decreased" : "were unchanged at"} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest month"}, compared to ${formatValue(data.prior, data.unit)} prior.`];
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  filing: (data) => {
    return `${data.company} filed Form ${data.formType || "8-K"} with the SEC.${data.description ? " " + data.description + "." : ""}`;
  },

  generic: (data) => {
    if (data.actual != null && data.prior != null) {
      const label = data.label || data.indicator || "Indicator";
      const dir = data.actual > data.prior ? "increased to" : data.actual < data.prior ? "decreased to" : "unchanged at";
      return `${label} ${dir} ${formatValue(data.actual, data.unit)}, from ${formatValue(data.prior, data.unit)} previously.`;
    }
    return "";
  },
};

export function generateSummary(type, data) {
  const template = SUMMARY_TEMPLATES[type] || SUMMARY_TEMPLATES.generic;
  return template(data);
}
