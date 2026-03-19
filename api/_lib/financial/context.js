// Context engine — computes factual context from historical data
// Everything here is derived from numbers. Zero opinion.

// Compute year-over-year change
// observations: array of { date, value } sorted newest-first
export function computeYoY(observations, latestValue) {
  if (!observations || observations.length < 12) return null;

  const latestDate = new Date(observations[0].date);
  const targetMonth = latestDate.getMonth();
  const targetYear = latestDate.getFullYear() - 1;

  // Find the observation from ~12 months ago
  for (const obs of observations) {
    const d = new Date(obs.date);
    if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
      const yoyValue = parseFloat(obs.value);
      if (isNaN(yoyValue) || yoyValue === 0) return null;
      const pctChange = ((latestValue - yoyValue) / Math.abs(yoyValue)) * 100;
      return {
        priorYearValue: yoyValue,
        pctChange: +pctChange.toFixed(1),
        period: `${d.toLocaleString("en-US", { month: "long" })} ${targetYear}`,
      };
    }
  }
  return null;
}

// Compute streak: consecutive periods in same direction
// values: array of numbers sorted newest-first (at least 2)
export function computeStreak(values) {
  if (!values || values.length < 2) return null;

  // Direction of latest change
  const latestDir = values[0] > values[1] ? "up" : values[0] < values[1] ? "down" : "flat";
  if (latestDir === "flat") return null;

  let streak = 1;
  for (let i = 1; i < values.length - 1; i++) {
    const dir = values[i] > values[i + 1] ? "up" : values[i] < values[i + 1] ? "down" : "flat";
    if (dir === latestDir) streak++;
    else break;
  }

  if (streak < 2) return null;

  const word = latestDir === "up" ? "increase" : "decrease";
  const ordinal = streak === 2 ? "Second" : streak === 3 ? "Third" : streak === 4 ? "Fourth" : streak === 5 ? "Fifth" : `${streak}th`;
  return {
    count: streak,
    direction: latestDir,
    description: `${ordinal} consecutive monthly ${word}.`,
  };
}

// Compute historical range context: "Highest since X" or "X-month high"
// observations: array of { date, value } sorted newest-first
export function computeHistoricalRange(observations, latestValue, isIndexToPercent) {
  if (!observations || observations.length < 6) return null;

  // Skip index-level comparisons when we're converting to % (CPI/PPI)
  // because the raw values always trend upward — "highest since" is meaningless
  if (isIndexToPercent) return null;

  const latest = latestValue;
  let lastHigherDate = null;
  let lastLowerDate = null;

  // Walk backward through history to find when value was last at this level
  for (let i = 1; i < observations.length; i++) {
    const val = parseFloat(observations[i].value);
    if (isNaN(val)) continue;

    if (val >= latest && !lastHigherDate) {
      lastHigherDate = new Date(observations[i].date);
    }
    if (val <= latest && !lastLowerDate) {
      lastLowerDate = new Date(observations[i].date);
    }

    if (lastHigherDate && lastLowerDate) break;
  }

  const now = new Date(observations[0].date);

  // If no prior value was higher, this is the highest in our window
  if (!lastHigherDate && observations.length >= 12) {
    const months = observations.length;
    return { type: "high", description: `Highest level in at least ${months} months.` };
  }

  // If no prior value was lower, this is the lowest in our window
  if (!lastLowerDate && observations.length >= 12) {
    const months = observations.length;
    return { type: "low", description: `Lowest level in at least ${months} months.` };
  }

  // If last higher was a while ago, note it
  if (lastHigherDate) {
    const monthsAgo = (now.getFullYear() - lastHigherDate.getFullYear()) * 12 +
      (now.getMonth() - lastHigherDate.getMonth());
    if (monthsAgo >= 6) {
      const monthName = lastHigherDate.toLocaleString("en-US", { month: "long", year: "numeric" });
      return { type: "high", description: `Highest since ${monthName}.` };
    }
  }

  if (lastLowerDate) {
    const monthsAgo = (now.getFullYear() - lastLowerDate.getFullYear()) * 12 +
      (now.getMonth() - lastLowerDate.getMonth());
    if (monthsAgo >= 6) {
      const monthName = lastLowerDate.toLocaleString("en-US", { month: "long", year: "numeric" });
      return { type: "low", description: `Lowest since ${monthName}.` };
    }
  }

  return null;
}

// Cross-reference context: what other indicators say alongside this release
// indicators: map of indicator key to { value, unit } from the current fetch
export function crossReference(type, indicators) {
  const parts = [];

  if (type === "cpi" || type === "ppi") {
    if (indicators.fed_funds) {
      parts.push(`Fed funds rate currently at ${indicators.fed_funds.value}%.`);
    }
  }

  if (type === "unemployment" || type === "payroll") {
    if (indicators.fed_funds) {
      parts.push(`Fed funds rate currently at ${indicators.fed_funds.value}%.`);
    }
  }

  if (type === "fed_funds") {
    if (indicators.cpi_yoy) {
      parts.push(`Year-over-year CPI at ${indicators.cpi_yoy}%.`);
    }
    if (indicators.unemployment) {
      parts.push(`Unemployment at ${indicators.unemployment.value}%.`);
    }
  }

  return parts.join(" ");
}

// FOMC meeting dates — update annually
// Source: https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm
const FOMC_DATES_BY_YEAR = {
  2026: [
    "2026-01-27", "2026-01-28",
    "2026-03-17", "2026-03-18",
    "2026-05-05", "2026-05-06",
    "2026-06-16", "2026-06-17",
    "2026-07-28", "2026-07-29",
    "2026-09-15", "2026-09-16",
    "2026-10-27", "2026-10-28",
    "2026-12-08", "2026-12-09",
  ],
  // TODO: Add 2027 dates when released by the Fed
};

function getFOMCDates() {
  const year = new Date().getFullYear();
  return FOMC_DATES_BY_YEAR[year] || [];
}

export function calendarContext(releaseDate) {
  const release = new Date(releaseDate);
  const parts = [];
  const fomcDates = getFOMCDates();

  // Check if an FOMC meeting is within 14 days
  for (let i = 0; i < fomcDates.length; i += 2) {
    const meetingStart = new Date(fomcDates[i]);
    const daysUntil = Math.floor((meetingStart - release) / (1000 * 60 * 60 * 24));
    if (daysUntil > 0 && daysUntil <= 14) {
      const dateStr = meetingStart.toLocaleString("en-US", { month: "long", day: "numeric" });
      parts.push(`Next FOMC meeting ${dateStr}.`);
      break;
    }
    if (daysUntil >= -1 && daysUntil <= 0) {
      parts.push(`Released during FOMC meeting.`);
      break;
    }
  }

  return parts.join(" ");
}
