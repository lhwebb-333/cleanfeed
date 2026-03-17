// SEC EDGAR adapter
// No API key needed — requires User-Agent header with contact email
// Rate limit: 10 req/sec

import { getCached, setCache, recordError } from "./cache.js";
import { generateHeadline } from "./headlines.js";

const EDGAR_SEARCH = "https://efts.sec.gov/LATEST/search-index";
const EDGAR_FILINGS = "https://efts.sec.gov/LATEST/search";
const USER_AGENT = "CleanFeed/1.0 (contact@thecleanfeed.app)";

// 8-K item descriptions
const ITEM_TYPES = {
  "1.01": "Material Definitive Agreement",
  "1.02": "Termination of Material Agreement",
  "2.01": "Acquisition or Disposition of Assets",
  "2.02": "Results of Operations and Financial Condition",
  "2.03": "Creation of Financial Obligation",
  "2.05": "Costs of Exit or Disposal Activities",
  "2.06": "Material Impairments",
  "3.01": "Delisting Notice",
  "4.01": "Change in Accountant",
  "4.02": "Non-Reliance on Financial Statements",
  "5.01": "Change in Control",
  "5.02": "Departure/Appointment of Directors or Officers",
  "5.03": "Amendments to Articles of Incorporation",
  "5.07": "Shareholder Vote Submission",
  "7.01": "Regulation FD Disclosure",
  "8.01": "Other Events",
  "9.01": "Financial Statements and Exhibits",
};

export const secAdapter = {
  name: "SEC",
  key: "sec",
  color: "#607D8B",

  async fetch() {
    const cached = getCached("sec", "filings");
    if (cached) return cached;

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const startDate = yesterday.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];

      const url = `${EDGAR_FILINGS}?q=%228-K%22&dateRange=custom&startdt=${startDate}&enddt=${endDate}&forms=8-K`;
      const res = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });

      if (!res.ok) throw new Error(`SEC EDGAR: HTTP ${res.status}`);
      const json = await res.json();
      const hits = json.hits?.hits || [];

      const items = [];
      for (const hit of hits.slice(0, 30)) {
        const filing = hit._source || {};
        const company = filing.display_names?.[0] || filing.entity_name || "Unknown Company";
        const fileDate = filing.file_date || filing.date_filed;
        const formType = filing.form_type || "8-K";
        const filingUrl = filing.file_num
          ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&filenum=${filing.file_num}&type=8-K&dateb=&owner=include&count=10`
          : `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company)}&CIK=&type=8-K&dateb=&owner=include&count=10&search_text=&action=getcompany`;

        // Try to extract item type from description
        const items8k = filing.items || [];
        const itemDesc = items8k.map((i) => ITEM_TYPES[i] || i).filter(Boolean).join("; ");

        const data = {
          company,
          formType,
          description: itemDesc || null,
        };

        const title = generateHeadline("filing", data);
        const summary = itemDesc
          ? `${company} filed Form ${formType}: ${itemDesc}`
          : `${company} filed Form ${formType} with the SEC`;

        items.push({
          id: `sec-${filing.accession_no || `${company}-${fileDate}`}`,
          title,
          description: summary,
          link: filingUrl,
          pubDate: fileDate ? new Date(fileDate).toISOString() : new Date().toISOString(),
          source: "SEC",
          color: "#607D8B",
          category: "financial",
          type: "financial-data",
          dataSource: "sec",
          data: { company, formType, items: items8k },
          indicator: `${formType} Filing`,
          tags: ["filing", "sec", formType.toLowerCase().replace("-", "")],
          context: `SEC ${formType} filing`,
        });
      }

      setCache("sec", "filings", items);
      return items;
    } catch (err) {
      console.error("[Financial] SEC adapter error:", err.message);
      recordError("sec");
      return [];
    }
  },
};
