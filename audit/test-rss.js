const Parser = require("rss-parser");
const p = new Parser({ timeout: 10000 });

async function main() {
  const f = await p.parseURL("https://news.google.com/rss/search?q=when:2d+allinurl:apnews.com&ceid=US:en&hl=en-US&gl=US");
  console.log("Items:", f.items.length);
  for (const i of f.items.slice(0, 5)) {
    const title = (i.title || "").replace(/ - AP News$/, "").trim();
    const snippet = (i.contentSnippet || "").trim();
    const strippedSnippet = snippet.replace(/\s*AP News\s*$/, "").trim();
    console.log("TITLE:   " + title.slice(0, 55));
    console.log("SNIPPET: " + snippet.slice(0, 55));
    console.log("STRIPPED: " + strippedSnippet.slice(0, 55));
    console.log("EXACT MATCH: " + (strippedSnippet === title));
    console.log("");
  }
}
main().catch(e => console.log("Error:", e.message));
