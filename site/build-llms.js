#!/usr/bin/env node
/* Writes the files AI tools and search engines read, from the same page list the site's menus use
   (site/js/content.js). The site itself is one page filled in by JavaScript, so a reader that doesn't
   run scripts (most AI tools) sees nothing there; these files point it to the Markdown instead.
     llms.txt       an index of every page, linked to its raw .md file (format: https://llmstxt.org/)
     llms-full.txt  every page in one file, links made absolute
     sitemap.xml    the home page, the two files above and every page, for search engines
   Same idea as the Deovandski site's scripts/llms.mjs.

   Usage:  node site/build-llms.js [outDir]       (outDir defaults to the repo folder)
   The Pages workflow runs it before gathering the site. Set SITE_URL to publish somewhere else. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// DM pages ("Running the game", "Stat blocks") are public files, but the site hides them in Player
// mode. true: list them in their own "DM only (spoilers)" section, last. false: leave them out.
const INCLUDE_DM = true;

const root = path.resolve(__dirname, "..");
const out = path.resolve(process.argv[2] || root);
const SITE = (process.env.SITE_URL || "https://deovandski.github.io/Vraki-West-March-Campaign-D-D").replace(/\/+$/, "");
const REPO = "https://github.com/Deovandski/Vraki-West-March-Campaign-D-D";

// Folder and file names have spaces and "&" ("D&D Campaign/…"), so every link is percent-encoded.
// Parentheses too: "(Bandit Offer)" would otherwise end a Markdown link early.
const enc = (p) => p.split("/").map((s) => encodeURIComponent(s).replace(/\(/g, "%28").replace(/\)/g, "%29")).join("/");
const url = (p) => SITE + "/" + enc(p);

// Read the page list from content.js, the one the menus use, so the two never drift apart.
const sandbox = { window: {}, console };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "js", "content.js"), "utf8"), sandbox);
const { groups, folders } = sandbox.window.VW.content;

const read = (p) => fs.readFileSync(path.join(root, p), "utf8").replace(/\r\n?/g, "\n");
const exists = (p) => fs.existsSync(path.join(root, p));

// Each page once. A page in "Start here" that also has a home in another group is listed there instead.
const homeOf = {};
groups.forEach((g) => g.docs.forEach(([p]) => { if (g.id !== "start") homeOf[p] = homeOf[p] || g.id; }));
const sections = groups
  .filter((g) => INCLUDE_DM || g.role !== "dm")
  .map((g) => ({ ...g, docs: g.docs.filter(([p]) => exists(p) && (homeOf[p] || g.id) === g.id) }))
  .filter((g) => g.docs.length)
  .sort((a, b) => (a.role === "dm") - (b.role === "dm")); // DM sections last

const strip = (s) => s
  .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
  .replace(/\[\s*\]\([^)]*\)/g, "")
  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/\*([^*]+)\*/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .replace(/\s+/g, " ")
  .trim();

const shorten = (t) => (t.length > 170 ? t.slice(0, 167).replace(/\s+\S*$/, "") + "…" : t);

// One-line description for llms.txt. In order of preference:
//   an adventurer sheet: its class line and its hook;
//   the page's introduction (text between the title and the first section heading);
//   otherwise the page's section headings ("Covers: …").
function blurb(md) {
  const title = (/^#\s+(.*)$/m.exec(md) || [])[1] || "";
  const paras = (text) => text.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
  const prose = (p) => !/^(#|!\[|\[!\[|\||---|```|- |\* |\d+\. )/.test(p) && !/^\*\*[^*]+\*\*:?\s/.test(p);
  if (/ — Level \d/.test(title)) { // adventurer sheet
    const hook = /^\*\*Hook:\*\*\s*(.*)$/m.exec(md);
    const note = paras(md).find((p) => p.startsWith(">"));
    const extra = hook ? hook[1] : note ? note.replace(/^>\s?/gm, "") : "";
    return shorten(strip(title.split(" — ").slice(1).join(" — ")) + (extra ? ". " + strip(extra) : ""));
  }
  const intro = paras(md.replace(/^#\s+.*$/m, "").split(/^##[ \t]/m)[0]).find(prose);
  if (intro && strip(intro).length >= 25) return shorten(strip(intro.replace(/^>\s?/gm, "")));
  const heads = [...md.matchAll(/^##[ \t]+(\S.*)$/gm)].map((m) => strip(m[1])).filter(Boolean);
  if (heads.length >= 3) return shorten("Covers: " + heads.slice(0, 8).join(", ") + (heads.length > 8 ? ", …" : ""));
  const any = paras(md).find((p) => prose(p) && strip(p).length >= 25);
  return any ? shorten(strip(any)) : "";
}

const intro = [
  "# Vraki West March",
  "",
  "> An open-table (West Marches style) D&D 5e campaign set in the world of the #HusbandOutWorld light novel series",
  "> by Deovandski Skibinski Junior. Players come and go, every party starts and ends at a Forway embassy, and",
  "> travel is counted in circles on the map (each circle is 1, 2 or 3 days; the DM chooses).",
  "",
  `The website (${SITE}/) is a single page that JavaScript fills in from the Markdown files listed below,`,
  "so read those files directly. Each link is the page's raw Markdown.",
  "",
  `Source: ${REPO}. License: CC-BY-NC-SA-4.0, © Deovandski Skibinski Junior. Art by Mitsukiven & Feiourm.`,
  `Much of the text was written with AI assistance under Deovandski's direction; see ${url("AI-DISCLOSURE.md")}.`,
  "Spoiler warning: the lore and DM pages reveal secrets of the world, including some from unreleased story notes.",
  ""
];

const heading = (g) => (g.role === "dm" ? `DM only (spoilers): ${g.title.toLowerCase()}` : g.title);

/* ---------------- llms.txt ---------------- */
const index = [
  ...intro,
  "## Full text",
  "",
  `- [Every page in one file](${SITE}/llms-full.txt): all the pages below, in this order${INCLUDE_DM ? ", DM pages last" : ""}`,
  ""
];
sections.forEach((g) => {
  index.push(`## ${heading(g)}`, "");
  if (g.role === "dm") index.push("For the DM: these pages spoil surprises for players.", "");
  g.docs.forEach(([p, title]) => {
    const b = blurb(read(p));
    index.push(`- [${title}](${url(p)})${b ? ": " + b : ""}`);
  });
  index.push("");
});
index.push(
  "## Related",
  "",
  "- [#HusbandOutWorld](https://www.husbandoutworld.com/llms.txt): the light novel series this campaign is set in",
  "- [#HusbandOutWorld on GitHub](https://github.com/Deovandski/HusbandOutWorld): the novels, the full world lore and every illustration",
  "- [Vraki](https://deovandski.github.io/vraki-windows/): the world's script, which began as a 2017 Windows app",
  ""
);

/* ---------------- llms-full.txt ---------------- */
// Relative links inside a page point next to that page; in one big file they must be absolute.
// Links to a folder go to that folder's main page, as on the site.
function absolutize(md, p) {
  const dir = path.posix.dirname(p);
  return md.replace(/\]\(([^)\s]+)\)/g, (m, target) => {
    if (/^(https?:|mailto:)/i.test(target)) return m;
    if (target.startsWith("#")) return "](" + url(p) + target + ")";
    const [file, frag] = target.split("#");
    let decoded = file;
    try { decoded = decodeURIComponent(file); } catch (e) { /* keep as written */ }
    let joined = path.posix.normalize(path.posix.join(dir === "." ? "" : dir, decoded)).replace(/\/$/, "");
    if (folders[joined]) joined = folders[joined];
    return "](" + url(joined) + (frag ? "#" + frag : "") + ")";
  });
}
const full = [...intro];
sections.forEach((g) => {
  full.push("", "=".repeat(72), `# ${heading(g)}`, "=".repeat(72), "");
  g.docs.forEach(([p]) => {
    full.push("", "-".repeat(72), `Source: ${url(p)}`, "-".repeat(72), "", absolutize(read(p).trim(), p), "");
  });
});

/* ---------------- sitemap.xml ---------------- */
const xml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pages = [SITE + "/", SITE + "/llms.txt", SITE + "/llms-full.txt", ...sections.flatMap((g) => g.docs.map(([p]) => url(p)))];
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...pages.map((u) => `  <url><loc>${xml(u)}</loc></url>`),
  "</urlset>",
  ""
].join("\n");

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "llms.txt"), index.join("\n"));
fs.writeFileSync(path.join(out, "llms-full.txt"), full.join("\n").replace(/\n{3,}/g, "\n\n") + "\n");
fs.writeFileSync(path.join(out, "sitemap.xml"), sitemap);

// Pages in the repo that no menu lists would be missing from the site and from these files.
const listed = new Set(groups.flatMap((g) => g.docs.map(([p]) => p)));
const ignore = /^(CLAUDE\.md|.*LICENSE-.*\.md|node_modules\/.*)$/;
const unlisted = [];
(function walk(dir) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (name.startsWith(".") || name === "node_modules" || name === "_site") continue;
    const rel = dir ? dir + "/" + name : name;
    if (fs.statSync(path.join(root, rel)).isDirectory()) walk(rel);
    else if (/\.md$/i.test(name) && !listed.has(rel) && !ignore.test(rel)) unlisted.push(rel);
  }
})("");

const count = sections.reduce((n, g) => n + g.docs.length, 0);
console.log(`Wrote llms.txt, llms-full.txt and sitemap.xml to ${path.relative(root, out) || "."}/ (${count} pages, ` +
  `${Math.round(fs.statSync(path.join(out, "llms-full.txt")).size / 1024)} KB of full text).`);
if (unlisted.length) console.log("Not in site/js/content.js, so not on the site or in llms.txt:\n  " + unlisted.join("\n  "));
