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

// Factual benchmarks — not opinion, these are established reference points
// Used to give normal readers context on whether a number is high, low, or typical
function cpiBenchmark(actual) {
  // Fed's stated inflation target is 2% annual. MoM ~0.17% = on-target pace.
  if (actual <= 0) return "Prices fell month-over-month — deflation.";
  if (actual <= 0.1) return "Monthly pace below the Fed's 2% annual inflation target.";
  if (actual <= 0.2) return "Monthly pace roughly in line with the Fed's 2% annual inflation target.";
  if (actual <= 0.4) return "Monthly pace above the Fed's 2% annual target — annualizes to roughly " + (actual * 12).toFixed(0) + "%.";
  return "Monthly pace well above the Fed's 2% target — annualizes to roughly " + (actual * 12).toFixed(0) + "%.";
}

function unemploymentBenchmark(actual) {
  // Historical U.S. average ~5.7%. Below 4% is historically tight. Above 6% is elevated.
  if (actual < 3.5) return "This is near historic lows — the U.S. average since 1948 is 5.7%.";
  if (actual < 4.0) return "Below the long-term U.S. average of 5.7%. The labor market is tight by historical standards.";
  if (actual < 5.0) return "Below the long-term U.S. average of 5.7%.";
  if (actual < 6.0) return "Near the long-term U.S. average of 5.7%.";
  if (actual < 8.0) return "Above the long-term U.S. average of 5.7%. Elevated by historical standards.";
  return "Well above the long-term U.S. average of 5.7%.";
}

function fedFundsBenchmark(actual) {
  // Historical average ~4.6%. Near zero = emergency stimulus. Above 5% = restrictive.
  if (actual < 0.5) return "Near zero — the lowest the Fed can set rates. This is emergency-level stimulus.";
  if (actual < 2.0) return "Below the long-term average of ~4.6%. The Fed considers this accommodative.";
  if (actual < 3.5) return "Below the long-term average of ~4.6%.";
  if (actual < 5.0) return "Near the long-term average of ~4.6%.";
  return "Above the long-term average of ~4.6%. The Fed considers this restrictive — intended to slow borrowing and spending.";
}

function gdpBenchmark(actual) {
  // U.S. long-run average ~2-3% annual growth. Negative = contraction.
  if (actual < -1) return "The economy contracted. Two consecutive negative quarters is the common shorthand for recession.";
  if (actual < 0) return "The economy contracted slightly. Long-run U.S. average growth is 2-3% annually.";
  if (actual < 1) return "Growth is positive but below the long-run U.S. average of 2-3% annually.";
  if (actual < 3) return "Growth is within the normal long-run U.S. range of 2-3% annually.";
  return "Growth is above the long-run U.S. average of 2-3% annually.";
}

function payrollBenchmark(actual) {
  // 150K+/month generally keeps up with population growth. 200K+ is strong. Negative = job losses.
  if (actual < -100) return "Significant job losses. The economy needs roughly 100-150K new jobs per month to keep up with population growth.";
  if (actual < 0) return "The economy lost jobs. Roughly 100-150K new jobs per month are needed to keep up with population growth.";
  if (actual < 100) return "Below the ~100-150K per month needed to keep pace with population growth.";
  if (actual < 200) return "Roughly in line with the ~100-150K per month needed to keep pace with population growth.";
  if (actual < 350) return "Above the pace needed to keep up with population growth (~100-150K/month).";
  return "Well above the pace needed for population growth (~100-150K/month). Unusually strong.";
}

function yieldBenchmark(actual, label) {
  const is10y = label && label.includes("10-Year");
  const is2y = label && label.includes("2-Year");
  if (is10y) {
    if (actual < 2) return "The 10-year yield is low by historical standards — the long-run average is around 4.25%.";
    if (actual < 3.5) return "Below the long-run average of ~4.25% for the 10-year Treasury.";
    if (actual < 5) return "Near the long-run average of ~4.25%. The 10-year yield influences mortgage rates and borrowing costs.";
    return "Above the long-run average of ~4.25%. Higher yields mean higher borrowing costs for mortgages, car loans, and business investment.";
  }
  if (is2y) {
    // 2Y is more sensitive to Fed policy expectations
    return "The 2-year yield closely tracks where markets expect the Fed to set interest rates over the next two years.";
  }
  return "";
}

function ppiBenchmark(actual) {
  if (actual <= 0) return "Producer prices fell — input costs are declining for businesses.";
  if (actual <= 0.2) return "Producer price growth is modest. PPI measures costs before they reach consumers.";
  if (actual <= 0.4) return "Producer prices are rising. PPI often leads consumer inflation (CPI) by 1-3 months.";
  return "Producer prices are rising quickly. PPI often leads consumer inflation (CPI) by 1-3 months.";
}

// Generate a 2-3 sentence narrative summary
// Lead with the fact, then benchmark context so a normal person knows if this is good/bad/normal
const SUMMARY_TEMPLATES = {
  cpi: (data) => {
    const dir = data.actual > data.prior ? "increased" : data.actual < data.prior ? "decreased" : "was unchanged at";
    const parts = [`Consumer prices ${dir} ${formatValue(data.actual, data.unit)} month-over-month in ${data.period || "the latest month"}, compared to ${formatValue(data.prior, data.unit)} the prior month.`];
    parts.push(cpiBenchmark(data.actual));
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Economists expected ${formatValue(data.expected, data.unit)} — actual came in ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  gdp: (data) => {
    const parts = [`GDP grew at ${formatValue(data.actual, data.unit)} annualized in ${data.period || "the latest quarter"}, compared to ${formatValue(data.prior, data.unit)} the prior quarter.`];
    parts.push(gdpBenchmark(data.actual));
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual came in ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  unemployment: (data) => {
    const dir = data.actual > data.prior ? "rose to" : data.actual < data.prior ? "fell to" : "held at";
    const parts = [`The unemployment rate ${dir} ${formatValue(data.actual, data.unit)}, from ${formatValue(data.prior, data.unit)} the prior month.`];
    parts.push(unemploymentBenchmark(data.actual));
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Economists expected ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  fed_funds: (data) => {
    const dir = data.actual > data.prior ? "raised" : data.actual < data.prior ? "lowered" : "held";
    const parts = [`The Federal Reserve ${dir} the federal funds rate ${dir === "held" ? "at" : "to"} ${formatValue(data.actual, data.unit)}.`];
    parts.push(fedFundsBenchmark(data.actual));
    if (data.prior !== data.actual) parts.push(`Previous rate was ${formatValue(data.prior, data.unit)}.`);
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  yield: (data) => {
    const label = data.label || "10-Year Treasury yield";
    const dir = data.actual > data.prior ? "rose" : data.actual < data.prior ? "fell" : "was unchanged";
    const delta = Math.abs(data.actual - data.prior).toFixed(2);
    const parts = [`The ${label} ${dir} to ${formatValue(data.actual, data.unit)}, a change of ${delta} percentage points from ${formatValue(data.prior, data.unit)}.`];
    const bench = yieldBenchmark(data.actual, label);
    if (bench) parts.push(bench);
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  payroll: (data) => {
    const verb = data.actual >= 0 ? "added" : "lost";
    const parts = [`The economy ${verb} ${formatValue(Math.abs(data.actual), data.unit)} jobs in ${data.period || "the latest month"}, compared to ${formatValue(Math.abs(data.prior), data.unit)} the prior month.`];
    parts.push(payrollBenchmark(data.actual));
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  ppi: (data) => {
    const dir = data.actual > data.prior ? "increased" : data.actual < data.prior ? "decreased" : "were unchanged at";
    const parts = [`Producer prices ${dir} ${formatValue(data.actual, data.unit)} in ${data.period || "the latest month"}, compared to ${formatValue(data.prior, data.unit)} prior.`];
    parts.push(ppiBenchmark(data.actual));
    if (data.expected != null) {
      const vs = data.actual > data.expected ? "above" : data.actual < data.expected ? "below" : "in line with";
      parts.push(`Forecast was ${formatValue(data.expected, data.unit)} — actual ${vs}.`);
    }
    if (data.marketReaction) parts.push(data.marketReaction);
    return parts.join(" ");
  },

  filing: (data) => {
    const parts = [`${data.company} filed Form ${data.formType || "8-K"} with the SEC.`];
    if (data.description) parts.push(data.description + ".");
    // Give normie context on what 8-K means
    if (data.formType === "8-K") parts.push("An 8-K is filed when a company has a major event investors should know about.");
    return parts.join(" ");
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

// "Why it matters" — plain English impact for each indicator type
const WHY_IT_MATTERS = {
  cpi: "CPI measures the price of everyday goods — groceries, gas, rent, clothing. When it rises faster than wages, your purchasing power shrinks.",
  ppi: "PPI measures costs for producers before they reach consumers. Rising PPI often leads to rising consumer prices within 1-3 months.",
  unemployment: "The unemployment rate reflects how many people are actively looking for work but can't find it. It's the most-watched indicator of labor market health.",
  fed_funds: "The federal funds rate is the Fed's primary tool for controlling the economy. It directly influences mortgage rates, car loans, credit cards, and savings account yields.",
  gdp: "GDP measures the total value of goods and services produced. It's the broadest measure of whether the economy is growing or shrinking.",
  yield: "Treasury yields reflect what the government pays to borrow money. The 10-year yield heavily influences mortgage rates and is watched as a signal of economic expectations.",
  payroll: "Nonfarm payrolls measure how many jobs the economy added or lost. It's the single most important monthly indicator of economic health.",
  filing: null,
};

// Generate structured card context — sections that the frontend renders as distinct blocks
export function generateCardContext(type, data) {
  const sections = [];

  // 1. THE NUMBER — what happened
  if (data.actual != null) {
    const dir = direction(data.actual, data.prior);
    const dirWord = dir === "up" ? "rose" : dir === "down" ? "fell" : "unchanged";
    sections.push({
      type: "number",
      label: "The Number",
      text: `${data.label || data.indicator || "Value"} ${dirWord} to ${formatValue(data.actual, data.unit)} from ${formatValue(data.prior, data.unit)}${data.period ? ` in ${data.period}` : ""}.`,
    });
  }

  // 2. EXPECTATIONS — vs consensus
  if (data.expected != null) {
    const diff = data.actual - data.expected;
    const vs = Math.abs(diff) < 0.001 ? "in line with" : diff > 0 ? "above" : "below";
    sections.push({
      type: "expectations",
      label: "vs. Expectations",
      text: `Economists expected ${formatValue(data.expected, data.unit)}. Actual came in ${vs} expectations${Math.abs(diff) > 0.001 ? ` by ${formatValue(Math.abs(diff), data.unit)}` : ""}.`,
    });
  }

  // 3. BENCHMARK — where this sits historically
  const benchmarkFn = { cpi: cpiBenchmark, unemployment: unemploymentBenchmark, fed_funds: fedFundsBenchmark, gdp: gdpBenchmark, payroll: payrollBenchmark, ppi: ppiBenchmark };
  const bench = benchmarkFn[type];
  if (bench) {
    sections.push({
      type: "benchmark",
      label: "Historical Context",
      text: bench(data.actual),
    });
  }
  if (type === "yield") {
    const yb = yieldBenchmark(data.actual, data.label);
    if (yb) sections.push({ type: "benchmark", label: "Historical Context", text: yb });
  }

  // 4. TREND — streak / YoY from extra context
  if (data.streak) {
    sections.push({ type: "trend", label: "Trend", text: data.streak });
  }
  if (data.yoy) {
    sections.push({ type: "trend", label: "Year-over-Year", text: data.yoy });
  }
  if (data.historicalRange) {
    sections.push({ type: "trend", label: "Range", text: data.historicalRange });
  }

  // 5. WHY IT MATTERS — plain English
  const why = WHY_IT_MATTERS[type];
  if (why) {
    sections.push({ type: "why", label: "Why It Matters", text: why });
  }

  // 6. MARKET REACTION
  if (data.marketReaction) {
    sections.push({ type: "reaction", label: "Market Reaction", text: data.marketReaction });
  }

  // 7. CALENDAR — FOMC proximity
  if (data.calendar) {
    sections.push({ type: "calendar", label: "Calendar", text: data.calendar });
  }

  return sections;
}
