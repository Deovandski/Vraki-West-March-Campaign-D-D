#!/usr/bin/env node
/* Translations of the Vraki West March site, written ahead of time and kept in i18n/<lang>/.
   A port of HusbandOutWorld's tools/i18n.py for this repo's Markdown pages. English stays the source.

   What gets translated
     docs      every Markdown page the site lists (site/js/content.js), split into segments by
               site/js/i18n.js: a heading, a paragraph, a list item or a table cell
     ui        the site's own text: __("…"), __.n(n, "…", "…") and N_("…") in site/js/*.js, plus the
               elements marked data-i18n / data-i18n-attr in index.html
     handouts  the printable props (Handouts/source/handouts.html); the Vraki-script lines stay in Vraki
   Each segment is stored under a short hash of its English, so unchanged English is never translated again.

   Store (i18n/<lang>/)
     meta.json                 language name, <html lang>, direction, locale, the AI-translation banner
     glossary.json             names and game terms, one spelling each (shared with HusbandOutWorld)
     ui.json                   the site's own text            {"<hash>": {"en": "…", "t": "…"}}
     <page path>.json          one file per Markdown page, e.g. "World Lore/06 - Races.md.json"
     Handouts/source/handouts.html.json

   Commands
     node tools/i18n.js status [--lang ja]          how much is translated, per language and part
     node tools/i18n.js todo --lang ja [--phase 1|2] [--part docs|ui|handouts] [--file "World Lore/06"]
                             [--max-words 4000] [--pairs] > work.json
                                                    only what still needs translating. --pairs prints a flat
                                                    {"<hash>": "<English>"} map instead of the work list
     node tools/i18n.js apply --lang ja work.json   saves the translations: a work file with "t" filled in,
                                                    or a flat {"<hash>": "<translation>"} map
     node tools/i18n.js todo --lang ja --out work.json   writes the work file and prints a numbered list;
                                                    translate into {"1": "…", "2": "…"} (⏎ = line break) and
     node tools/i18n.js apply --lang ja --work work.json ja.json
     node tools/i18n.js names --work work.json      the glossary spellings of the names in a work file
     node tools/i18n.js addnames new.json           adds {"ja": {"Name": "…"}, …} to the glossaries
     node tools/i18n.js prune                       drops translations whose English is gone
     node tools/i18n.js build [outDir]              writes site/i18n/<lang>.js (interface text and names),
                                                    site/i18n/<lang>.docs.js (pages and handouts) and
                                                    site/i18n/languages.js (what's offered, how complete)
     node tools/i18n.js report                      a Markdown summary for CI (never fails)

   Phases (issue #7): 1 = the site's own text, World Lore and Making an Adventurer; 2 = everything else. */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const STORE = path.join(ROOT, "i18n");
const I = require(path.join(ROOT, "site/js/i18n.js"));
const LANGS = ["zh", "ja", "pt", "es", "ar", "ko"];
const COVERAGE = 0.9; // a language is picked automatically from the browser only once this much is done
const HANDOUTS = "Handouts/source/handouts.html";
// Kept in English: the license is the legal text, and English is the version that counts.
const KEEP_ENGLISH = new Set(["LICENSE.md"]);

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n?/g, "\n");
const readJson = (p, d) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return d; } };
const writeJson = (p, o) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(o, null, 1) + "\n"); };
const words = (s) => {
  const t = String(s).replace(/\]\([^)]*\)/g, "]").replace(/<[^>]+>/g, " ");
  return (t.match(/[A-Za-z0-9'’]+/g) || []).length;
};

/* ---------------- what there is to translate ---------------- */
function pages() {
  const sb = { window: {}, console };
  vm.runInNewContext(read("site/js/content.js"), sb);
  return Object.keys(sb.window.VW.content.docs).filter((p) => !KEEP_ENGLISH.has(p) && fs.existsSync(path.join(ROOT, p)));
}
const PHASE1 = (p) => p === "ui" || /^World Lore\//.test(p) || p === "D&D Campaign/02 - Making an Adventurer.md";

// The site's own text: string literals passed to __(), __.n() and N_(), plus index.html's marked elements.
function uiStrings() {
  const out = new Set();
  const lit = /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/;
  const str = (s) => (s[0] === "'" ? JSON.parse('"' + s.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"') : JSON.parse(s));
  for (const f of fs.readdirSync(path.join(ROOT, "site/js")).filter((f) => /\.js$/.test(f)).sort()) {
    const src = read("site/js/" + f);
    for (const m of src.matchAll(new RegExp("(?<![\\w.$])(?:__|N_)\\(\\s*" + lit.source, "g"))) out.add(str(m[1]));
    for (const m of src.matchAll(new RegExp("(?<![\\w$])__\\.n\\([^,]+,\\s*" + lit.source + "\\s*,\\s*" + lit.source, "g"))) { out.add(str(m[1])); out.add(str(m[2])); }
  }
  const html = read("index.html");
  for (const m of html.matchAll(/<(\w+)\b([^>]*\sdata-i18n(?=[\s>=])[^>]*)>([\s\S]*?)<\/\1>/g)) out.add(m[3].trim().replace(/\s+/g, " "));
  for (const m of html.matchAll(/<\w+\b[^>]*\sdata-i18n-attr="([^"]+)"[^>]*>/g)) {
    m[1].split(/\s+/).forEach((a) => { const v = new RegExp("\\s" + a + '="([^"]*)"').exec(m[0]); if (v) out.add(v[1].replace(/&amp;/g, "&")); });
  }
  out.delete("");
  return [...out];
}

// Handout segments come from the page itself (rendered in Chromium by Handouts/source/render.js --segments),
// cached in i18n/.cache/handouts.json so the other commands don't need a browser.
function handoutStrings() {
  const cache = path.join(STORE, ".cache", "handouts.json");
  const c = readJson(cache, null);
  const src = fs.existsSync(path.join(ROOT, HANDOUTS)) ? fs.statSync(path.join(ROOT, HANDOUTS)).mtimeMs : 0;
  if (c && c.mtime === src) return c.segments;
  try {
    const { execFileSync } = require("child_process");
    const segs = JSON.parse(execFileSync(process.execPath, [path.join(ROOT, "Handouts/source/render.js"), "--segments"], { encoding: "utf8", maxBuffer: 1 << 26 }));
    writeJson(cache, { mtime: src, segments: segs });
    return segs;
  } catch (e) {
    if (c) return c.segments;
    process.stderr.write("(handouts skipped: run `npm i playwright` in Handouts/source to read them)\n");
    return [];
  }
}

// Every part: { id, file (store path under i18n/<lang>/), phase, segments: [english…] }
function inventory(opts) {
  const parts = [{ id: "ui", file: "ui.json", phase: 1, segments: uiStrings() }];
  pages().forEach((p) => parts.push({ id: p, file: p + ".json", phase: PHASE1(p) ? 1 : 2, segments: I.segments(read(p)) }));
  if (!opts || opts.handouts !== false) parts.push({ id: "handouts", file: HANDOUTS + ".json", phase: 2, segments: handoutStrings() });
  return parts;
}

const storePath = (lang, file) => path.join(STORE, lang, file);
function loadAll(lang) {
  const out = {};
  (function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const n of fs.readdirSync(dir)) {
      const f = path.join(dir, n);
      if (fs.statSync(f).isDirectory()) { if (n !== ".cache") walk(f); continue; }
      if (!/\.json$/.test(n) || /^(meta|glossary)\.json$/.test(n) && dir === path.join(STORE, lang)) continue;
      const o = readJson(f, {});
      Object.entries(o).forEach(([h, v]) => { if (v && v.t) out[h] = v.t; });
    }
  })(path.join(STORE, lang));
  return out;
}

/* ---------------- commands ---------------- */
function args() {
  const a = process.argv.slice(3), o = { _: [] };
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith("--")) { const k = a[i].slice(2); o[k] = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true; }
    else o._.push(a[i]);
  }
  return o;
}

function counts(lang, parts) {
  const done = loadAll(lang);
  return parts.map((p) => {
    const seen = new Set();
    let total = 0, ok = 0, segs = 0, segsOk = 0;
    p.segments.forEach((en) => {
      const h = I.hash(en);
      if (seen.has(h)) return;
      seen.add(h);
      const w = Math.max(1, words(en));
      total += w; segs++;
      if (done[h]) { ok += w; segsOk++; }
    });
    return { id: p.id, phase: p.phase, total, ok, segs, segsOk };
  });
}

function status(o) {
  const parts = inventory();
  (o.lang ? [o.lang] : LANGS).forEach((lang) => {
    const c = counts(lang, parts);
    const sum = (f) => c.filter(f).reduce((a, x) => [a[0] + x.ok, a[1] + x.total], [0, 0]);
    const pct = ([a, b]) => (b ? Math.floor((a / b) * 1000) / 10 : 100) + "% (" + a + "/" + b + " words)";
    console.log(`${lang}: ${pct(sum(() => true))}  ·  ui ${pct(sum((x) => x.id === "ui"))}  ·  phase 1 ${pct(sum((x) => x.phase === 1))}  ·  phase 2 ${pct(sum((x) => x.phase === 2))}`);
    if (o.lang || o.v) c.filter((x) => x.ok < x.total).forEach((x) => console.log(`   ${x.id}: ${x.segsOk}/${x.segs} segments, ${x.total - x.ok} words left`));
  });
}

function todo(o) {
  const lang = o.lang;
  if (!LANGS.includes(lang)) throw new Error("--lang must be one of " + LANGS.join(", "));
  const done = loadAll(lang);
  const max = o["max-words"] ? +o["max-words"] : Infinity;
  const items = [];
  const seen = new Set();
  let n = 0;
  for (const p of inventory({ handouts: !o.part || o.part === "handouts" })) {
    if (o.phase && p.phase !== +o.phase) continue;
    if (o.part && (o.part === "docs" ? p.id === "ui" || p.id === "handouts" : p.id !== o.part)) continue;
    if (o.file && !p.id.includes(o.file)) continue;
    for (const en of p.segments) {
      const h = I.hash(en);
      if (done[h] || seen.has(h)) continue;
      if (n >= max) break;
      seen.add(h);
      n += words(en);
      items.push({ part: p.id, h, en, t: "" });
    }
  }
  if (o.out) {
    // A work file plus a numbered list to read; translate into {"1": "…", "2": "…"} and apply with --work.
    writeJson(path.resolve(o.out), { lang, words: n, items });
    items.forEach((x, i) => console.log(`${i + 1}\t${x.en.replace(/\n/g, "⏎")}`));
  } else if (o.pairs) console.log(JSON.stringify(Object.fromEntries(items.map((x) => [x.h, x.en])), null, 0).replace(/","/g, '",\n"'));
  else console.log(JSON.stringify({ lang, words: n, items }, null, 1));
  process.stderr.write(`${items.length} segments, ${n} words\n`);
}

// Markup that must come through unchanged: link targets, code, HTML tags, placeholders, dice.
function marks(s) {
  const m = [];
  for (const x of s.matchAll(/\]\(([^)]*)\)/g)) m.push("link:" + x[1]);
  for (const x of s.matchAll(/`[^`]+`/g)) m.push("code:" + x[0]);
  for (const x of s.matchAll(/<\/?([a-z][\w-]*)/gi)) m.push("tag:" + x[1].toLowerCase());
  for (const x of s.matchAll(/\{(\w+)\}/g)) m.push("var:" + x[1]);
  for (const x of s.matchAll(/\b\d*d(?:4|6|8|10|12|20|100)(?:\s?[+−-]\s?\d+)?\b/g)) m.push("dice:" + x[0].replace(/\s/g, "").replace("−", "-"));
  return m.sort().join("|");
}

// Markdown only closes **bold** if the closing ** isn't squeezed between punctuation and a letter
// ("**サンビ:**軽罪" stays literal). Chinese, Japanese and Korean don't use spaces there, so add one where
// it's needed (and before an opening ** that follows a letter and starts with punctuation).
const PUNCT = /[\p{P}\p{S}]/u, SPACE = /\s/;
function fixEmphasis(t) {
  if (!/\*/.test(t)) return t;
  let out = "", open = false;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "*" && t[i + 1] === "*" && t[i - 1] !== "\\") {
      const prev = out.slice(-1), next = t[i + 2] || "";
      if (!open) {
        if (prev && !SPACE.test(prev) && !PUNCT.test(prev) && PUNCT.test(next) && next !== "*") out += " ";
        out += "**"; open = true;
      } else {
        out += "**"; open = false;
        if (PUNCT.test(prev) && prev !== "*" && next && !SPACE.test(next) && !PUNCT.test(next)) out += " ";
      }
      i++;
      continue;
    }
    out += t[i];
  }
  return out;
}

function apply(o) {
  const lang = o.lang || (readJson(o._[0], {}) || {}).lang;
  if (!LANGS.includes(lang)) throw new Error("--lang must be one of " + LANGS.join(", "));
  const data = readJson(o._[0], null);
  if (!data) throw new Error("Couldn't read " + o._[0]);
  const tr = {};
  if (o.work) {
    // Numbered translations ({"1": "…"}) for the items of a work file written by `todo --out`.
    const work = readJson(path.resolve(o.work), null);
    if (!work) throw new Error("Couldn't read " + o.work);
    const keys = Object.keys(data).filter((k) => /^\d+$/.test(k));
    if (keys.length !== work.items.length) process.stderr.write(`note: ${keys.length} translations for ${work.items.length} items\n`);
    keys.forEach((k) => { const it = work.items[+k - 1]; if (it && data[k]) tr[it.h] = String(data[k]).replace(/⏎/g, "\n"); });
  } else if (Array.isArray(data.items)) data.items.forEach((x) => { if (x.t) tr[x.h] = x.t; });
  else Object.entries(data).forEach(([h, v]) => { if (/^[0-9a-f]{12}$/.test(h) && v) tr[h] = typeof v === "string" ? v : v.t; });
  Object.keys(tr).forEach((h) => { tr[h] = fixEmphasis(tr[h]); });
  const parts = inventory({ handouts: true });
  let saved = 0, warned = 0;
  const found = new Set();
  parts.forEach((p) => {
    const file = storePath(lang, p.file);
    let store = null;
    p.segments.forEach((en) => {
      const h = I.hash(en);
      if (!tr[h]) return;
      found.add(h);
      store = store || readJson(file, {});
      if (!store[h] || store[h].t !== tr[h] || store[h].en !== en) { store[h] = { en, t: tr[h] }; saved++; }
      if (marks(en) !== marks(tr[h]) && !o.quiet) { warned++; process.stderr.write(`check ${h} (${p.id}): markup differs\n  en: ${en.slice(0, 160)}\n  t:  ${tr[h].slice(0, 160)}\n`); }
    });
    if (store) writeJson(file, Object.fromEntries(Object.entries(store).sort()));
  });
  const missing = Object.keys(tr).filter((h) => !found.has(h));
  console.log(`${lang}: saved ${saved} translations${warned ? ", " + warned + " to check" : ""}${missing.length ? ", " + missing.length + " hashes not found: " + missing.slice(0, 8).join(" ") : ""}.`);
}

function prune() {
  const parts = inventory();
  const live = Object.fromEntries(parts.map((p) => [p.file, new Set(p.segments.map(I.hash))]));
  let gone = 0;
  LANGS.forEach((lang) => {
    (function walk(dir) {
      if (!fs.existsSync(dir)) return;
      for (const n of fs.readdirSync(dir)) {
        const f = path.join(dir, n);
        if (fs.statSync(f).isDirectory()) { walk(f); continue; }
        const rel = path.relative(path.join(STORE, lang), f).split(path.sep).join("/");
        if (/^(meta|glossary)\.json$/.test(rel) || !/\.json$/.test(rel)) continue;
        const keep = live[rel];
        const o = readJson(f, {});
        const next = keep ? Object.fromEntries(Object.entries(o).filter(([h]) => keep.has(h))) : {};
        const dropped = Object.keys(o).length - Object.keys(next).length;
        if (!dropped) continue;
        gone += dropped;
        if (Object.keys(next).length) writeJson(f, next); else fs.unlinkSync(f);
      }
    })(path.join(STORE, lang));
  });
  console.log(`Dropped ${gone} translations whose English is gone.`);
}

// The glossary spellings of the names and terms that appear in a work file, for the languages that
// write names by sound (so a name is always spelled the same). Also lists capitalised words with no
// entry yet: add them with `addnames` the first time they're translated.
function names(o) {
  const work = readJson(path.resolve(o.work || o._[0]), null);
  if (!work) throw new Error("--work work.json");
  const text = work.items.map((x) => x.en).join("\n");
  const langs = (o.langs || "ja,zh,ko,ar").split(",");
  const maps = Object.fromEntries(langs.map((l) => [l, glossaryNames(l)]));
  const keys = Object.keys(maps[langs[0]]).filter((k) => k.length > 2 && new RegExp("(^|[^A-Za-z])" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![A-Za-z])").test(text));
  keys.sort((a, b) => b.length - a.length);
  keys.forEach((k) => console.log(k + ": " + langs.map((l) => l + " " + (maps[l][k] || "?")).join(" | ")));
  const known = new Set(Object.keys(maps[langs[0]]).flatMap((k) => k.split(/\s+/)));
  const common = new Set("The A An And Or Of In On At To For With From By As Is Are Be It Its If Each Every One Two Three Roll Use See Pick Add DM Player Players Level HP AC DC CR SP Day Days Circle Circles Night Morning Afternoon Graveyard Quest Quests Rank Ranks No Yes All Any This That These Those When What Who Why How Where Then Than Some Most More Less Not New Old Your You They He She We".split(" "));
  const cand = new Map();
  for (const m of text.matchAll(/\b[A-Z][a-z]+(?:[ -][A-Z][a-z]+)*\b/g)) {
    const w = m[0];
    if (common.has(w) || w.split(/[ -]/).every((x) => known.has(x) || common.has(x))) continue;
    cand.set(w, (cand.get(w) || 0) + 1);
  }
  if (cand.size) console.log("\nNo entry yet: " + [...cand.entries()].sort((a, b) => b[1] - a[1]).map(([w, n]) => w + (n > 1 ? "×" + n : "")).join(", "));
}

// Adds names to each language's glossary ("campaign"): {"ja": {"Name": "…"}, "zh": {…}}
function addnames(o) {
  const data = readJson(path.resolve(o._[0]), {});
  Object.entries(data).forEach(([lang, m]) => {
    const f = storePath(lang, "glossary.json");
    const g = readJson(f, {});
    g.campaign = Object.assign(g.campaign || {}, m);
    g.campaign = Object.fromEntries(Object.entries(g.campaign).sort((a, b) => a[0].localeCompare(b[0])));
    writeJson(f, g);
  });
  console.log("Added " + Object.values(data).reduce((a, m) => a + Object.keys(m).length, 0) + " glossary entries.");
}

function glossaryNames(lang) {
  const g = readJson(storePath(lang, "glossary.json"), {});
  const out = {};
  [g.terms, g.names, g.campaign].forEach((m) => Object.entries(m || {}).forEach(([k, v]) => { if (typeof v === "string" && !/->|\(|;/.test(v)) out[k] = v; }));
  (g.keep_as_is || []).forEach((k) => { out[k] = k; });
  return out;
}

function build(o) {
  const outDir = path.resolve(o._[0] || path.join(ROOT, "site/i18n"));
  fs.mkdirSync(outDir, { recursive: true });
  const parts = inventory();
  const langs = [{ code: "en", name: "English", english: "English", html: "en", dir: "ltr", coverage: 1 }];
  LANGS.forEach((lang) => {
    if (!fs.existsSync(storePath(lang, "meta.json"))) return;
    const meta = readJson(storePath(lang, "meta.json"), {});
    const done = loadAll(lang);
    const ui = {};
    parts[0].segments.forEach((en) => { const v = done[I.hash(en)]; if (v) ui[en] = v; });
    const docs = {};
    parts.slice(1).forEach((p) => p.segments.forEach((en) => { const h = I.hash(en); if (done[h]) docs[h] = done[h]; }));
    const c = counts(lang, parts);
    const tot = c.reduce((a, x) => [a[0] + x.ok, a[1] + x.total], [0, 0]);
    const coverage = tot[1] ? Math.round((tot[0] / tot[1]) * 1000) / 1000 : 0;
    const head = "/* Generated by tools/i18n.js build from i18n/" + lang + "/. Don't edit by hand. */\n";
    fs.writeFileSync(path.join(outDir, lang + ".js"), head + "window.VW_I18N = " + JSON.stringify({ lang, meta: Object.assign({}, meta, { _about: undefined }), ui, names: glossaryNames(lang) }) + ";\n");
    fs.writeFileSync(path.join(outDir, lang + ".docs.js"), head + "window.VW_I18N_DOCS = " + JSON.stringify(docs) + ";\n");
    const handouts = fs.existsSync(path.join(ROOT, "Handouts", lang, "images"));
    langs.push({ code: lang, name: meta.name, english: meta.english_name, html: meta.html_lang || lang, dir: meta.dir || "ltr", coverage, handouts });
  });
  fs.writeFileSync(path.join(outDir, "languages.js"), "/* Generated by tools/i18n.js build. The languages the site offers and how complete each is (0–1). */\n" +
    "window.VW_LANGS = " + JSON.stringify(langs) + ";\nwindow.VW_LANGS_MIN = " + COVERAGE + ";\n");
  console.log("Wrote site/i18n/ for " + langs.map((l) => l.code + (l.code === "en" ? "" : " " + Math.floor(l.coverage * 100) + "%")).join(", ") + ".");
}

function report() {
  const parts = inventory();
  const rows = LANGS.map((lang) => {
    const c = counts(lang, parts);
    const sum = (f) => c.filter(f).reduce((a, x) => [a[0] + x.ok, a[1] + x.total], [0, 0]);
    const pct = ([a, b]) => (b ? Math.floor((a / b) * 100) : 100) + "%";
    const left = c.reduce((a, x) => a + x.total - x.ok, 0);
    return `| ${lang} | ${pct(sum(() => true))} | ${pct(sum((x) => x.id === "ui"))} | ${pct(sum((x) => x.phase === 1))} | ${pct(sum((x) => x.phase === 2))} | ${left} |`;
  });
  console.log(["### Translations", "", "Untranslated text shows in English until the next translation batch.", "",
    "| Language | All | Site text | Phase 1 | Phase 2 | Words left |", "|---|---|---|---|---|---|", ...rows].join("\n"));
}

module.exports = { inventory, uiStrings, loadAll, counts, LANGS, COVERAGE, marks, fixEmphasis };
if (require.main === module) {
  const cmd = process.argv[2];
  const o = args();
  try {
    ({ status, todo, apply, prune, build, report, names, addnames }[cmd] || (() => { console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]); }))(o);
  } catch (e) { console.error(e.message); process.exit(cmd === "report" ? 0 : 1); }
}
