/* Vraki West March site: translations (Chinese, Japanese, Portuguese, Spanish, Arabic, Korean).
   Everything is translated ahead of time and kept in i18n/<lang>/ (see i18n/README.md); nothing is
   translated on the fly. English stays the source. Works in the browser (window.VW.i18n) and in Node
   (module.exports), so the build, the tools and the site all split text the same way.

   In the browser (the site's scripts call t() as __() and N() as N_(), so tools/i18n.js can find the text):
     __("Roll anything")                   the site's own text, from i18n/<lang>/ui.json
     __("{n} on this trip", { n: 3 })      with placeholders
     __.n(3, "{n} day", "{n} days")        singular or plural, picked from the English
     N_("Quiet")                           marks text for translation where it's defined (a list of labels);
                                           translate it with __(label) where it's shown
     tx(english)                           a piece of the Markdown (a heading, paragraph, list item or table
                                           cell), from the page translations; English if there's none yet
     term("Bagarisa")                      a name or game term, from i18n/<lang>/glossary.json
     translateMd(md)                       a whole Markdown page, segment by segment
   The language and its text come from site/i18n/<lang>.js, which index.html loads before this file
   (written by site/build-i18n.js). The page translations (site/i18n/<lang>.docs.js) load the first
   time a page needs them: await loadDocs().

   Segments: a heading, a paragraph, a list item or a table cell, kept as its Markdown source (links and
   bold included). Each is stored under a short hash of its English, so English that doesn't change is
   never translated twice. Text with no words (numbers, dice, AC 14) isn't a segment. */
(function (root) {
  "use strict";

  /* ---------------- hashing ---------------- */
  // Whitespace and quote style don't change a segment's meaning, so they don't change its hash.
  const norm = (s) => String(s == null ? "" : s).replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
  // cyrb53: a fast 53-bit hash that needs no crypto, so the browser and Node agree. 12 hex digits.
  function hash(str) {
    const s = norm(str);
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761);
      h2 = Math.imul(h2 ^ c, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return ((h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0")).slice(0, 12);
  }

  /* ---------------- splitting Markdown into segments ---------------- */
  const HEAD = /^(#{1,6})(\s+)(.*?)(\s*)$/;
  const LIST = /^(\s*)([-*+]|\d+[.)])(\s+)(.*)$/;
  const HR = /^\s*([-*_])(\s*\1){2,}\s*$/;
  const TSEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  const FENCE = /^\s*(```|~~~)/;
  const isRow = (l) => /^\s*\|/.test(l);
  const isQuote = (l) => /^\s*>/.test(l);
  const blockStart = (l) => !l.trim() || HEAD.test(l) || LIST.test(l) || isRow(l) || isQuote(l) || FENCE.test(l) || HR.test(l);

  // Does this need translating? Not if all it has is numbers, dice and stat abbreviations.
  const NOWORDS = /\b(\d*d\d+(\s*[+−-]\s*\d+)?|AC|HP|DC|CR|SP|XP|PB|STR|DEX|CON|INT|WIS|CHA|gp|sp|cp|ft|lb|kh\d+|kl\d+|A\.G\.|B\.G\.)\b/g;
  function hasWords(s) {
    const t = String(s).replace(/\]\([^)]*\)/g, "]").replace(/<[^>]+>/g, " ").replace(/https?:\/\/\S+/g, " ").replace(NOWORDS, " ");
    return /\p{L}/u.test(t);
  }

  // A table row's cells, split on | that isn't escaped or inside `code`.
  function cells(line) {
    const s = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    const out = [];
    let cur = "", code = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === "`") code = !code;
      if (c === "|" && !code && s[i - 1] !== "\\") { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map((x) => x.trim());
  }

  // Markdown -> a list of parts: { raw } lines kept as they are, { seg } pieces to translate,
  // { row } table rows (each cell a piece) and { quote } blockquotes (parsed again inside).
  function parse(md) {
    const lines = String(md || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    const seg = (pre, en, post, cont, kind) => {
      if (hasWords(en)) out.push({ pre, en, post: post || "", cont: cont || "", kind });
      else out.push({ raw: pre + en.split("\n").join("\n" + (cont || "")) + (post || "") });
    };
    let i = 0;
    while (i < lines.length) {
      const l = lines[i];
      let m;
      if (FENCE.test(l)) {
        const f = l.trim().slice(0, 3);
        out.push({ raw: l }); i++;
        while (i < lines.length && !lines[i].trim().startsWith(f)) out.push({ raw: lines[i++] });
        if (i < lines.length) out.push({ raw: lines[i++] });
        continue;
      }
      if (!l.trim() || HR.test(l) || (isRow(l) && TSEP.test(l))) { out.push({ raw: l }); i++; continue; }
      if ((m = HEAD.exec(l))) { seg(m[1] + m[2], m[3], m[4], "", "h"); i++; continue; }
      if (isQuote(l)) {
        const inner = [];
        while (i < lines.length && isQuote(lines[i])) inner.push(lines[i++].replace(/^\s*>\s?/, ""));
        out.push({ quote: parse(inner.join("\n")) });
        continue;
      }
      if (isRow(l)) {
        const lead = /^\s*/.exec(l)[0];
        out.push({ lead, row: cells(l).map((c) => (hasWords(c) ? { en: c } : { raw: c })) });
        i++; continue;
      }
      if ((m = LIST.exec(l))) {
        let en = m[4];
        i++;
        // Lazy continuation lines (not indented, not a new block) belong to the item.
        while (i < lines.length && lines[i].trim() && !blockStart(lines[i]) && !/^\s/.test(lines[i])) en += "\n" + lines[i++];
        seg(m[1] + m[2] + m[3], en, "", "", "li");
        continue;
      }
      // A paragraph: lines up to a blank line or the next block. Indented paragraphs keep their indent.
      const ind = /^\s*/.exec(l)[0];
      const buf = [l.slice(ind.length)];
      i++;
      while (i < lines.length && lines[i].trim() && !blockStart(lines[i])) buf.push(lines[i++].replace(/^\s+/, ""));
      seg(ind, buf.join("\n"), "", ind, "p");
    }
    return out;
  }

  // Every segment's English, in page order.
  function segments(md) {
    const out = [];
    (function walk(parts) {
      parts.forEach((p) => {
        if (p.quote) walk(p.quote);
        else if (p.row) p.row.forEach((c) => { if (c.en != null) out.push(c.en); });
        else if (p.en != null) out.push(p.en);
      });
    })(parse(md));
    return out;
  }

  const oneLine = (s) => String(s).replace(/\s*\n\s*/g, " ");
  // Rebuilds the page with each segment swapped for lookup(english) (or left in English).
  function rebuild(parts, lookup) {
    const out = [];
    parts.forEach((p) => {
      if (p.raw != null) out.push(p.raw);
      else if (p.quote) rebuild(p.quote, lookup).split("\n").forEach((x) => out.push(x ? "> " + x : ">"));
      else if (p.row) out.push(p.lead + "| " + p.row.map((c) => (c.en != null ? oneLine(lookup(c.en) || c.en).replace(/(?<!\\)\|/g, "\\|") : c.raw)).join(" | ") + " |");
      else {
        let t = lookup(p.en) || p.en;
        if (p.kind === "h") t = oneLine(t);
        const ls = t.split("\n");
        const cont = p.kind === "li" ? " ".repeat(p.pre.length) : p.cont;
        ls.forEach((x, k) => out.push((k ? cont : p.pre) + x + (k === ls.length - 1 ? p.post : "")));
      }
    });
    return out.join("\n");
  }
  const translateWith = (md, lookup) => rebuild(parse(md), lookup);

  /* ---------------- the browser side ---------------- */
  const pack = (root.VW_I18N && typeof root.VW_I18N === "object") ? root.VW_I18N : null;
  const lang = pack ? pack.lang : "en";
  const ui = (pack && pack.ui) || {};
  const names = (pack && pack.names) || {};
  let docs = null;          // hash -> translated Markdown, once loaded
  let docsPromise = null;

  function fill(s, vars) {
    if (!vars) return s;
    return s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  }
  function t(en, vars) { return fill(ui[en] || en, vars); }
  t.n = (n, one, many, vars) => t(n === 1 ? one : many, Object.assign({ n }, vars || {}));
  const N = (s) => s;
  function term(s) {
    if (s == null) return s;
    const k = String(s);
    return names[k] || names[k.trim()] || k;
  }
  function tx(en) {
    if (en == null || lang === "en") return en;
    const key = String(en);
    if (docs) { const v = docs[hash(key)]; if (v) return v; }
    return names[key.trim()] || key;
  }
  function loadDocs() {
    if (lang === "en") return Promise.resolve(null);
    if (docs) return Promise.resolve(docs);
    if (!docsPromise) {
      docsPromise = new Promise((resolve) => {
        if (root.VW_I18N_DOCS) return resolve(root.VW_I18N_DOCS);
        if (typeof document === "undefined") return resolve({});
        const s = document.createElement("script");
        s.src = "site/i18n/" + lang + ".docs.js";
        s.onload = () => resolve(root.VW_I18N_DOCS || {});
        s.onerror = () => resolve({});
        document.head.appendChild(s);
      }).then((d) => { docs = d || {}; return docs; });
    }
    return docsPromise;
  }
  const translateMd = (md) => (lang === "en" || !docs ? md : translateWith(md, (en) => docs[hash(en)]));

  // Static text in index.html: data-i18n on an element translates its text;
  // data-i18n-attr="aria-label title placeholder" translates those attributes.
  function applyStatic(scope) {
    if (lang === "en" || typeof document === "undefined") return;
    (scope || document).querySelectorAll("[data-i18n]").forEach((el) => {
      if (el.children.length) el.innerHTML = t(el.innerHTML.trim().replace(/\s+/g, " "));
      else el.textContent = t(el.textContent.trim().replace(/\s+/g, " "));
    });
    (scope || document).querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(/\s+/).forEach((a) => { if (el.hasAttribute(a)) el.setAttribute(a, t(el.getAttribute(a))); });
    });
  }

  const api = {
    norm, hash, hasWords, parse, segments, translateWith, cells,
    lang, pack, t, N, term, tx, loadDocs, translateMd, applyStatic,
    __: t, N_: N, // the names the site's scripts use (tools/i18n.js finds the text by them)
    get docsLoaded() { return !!docs; },
    meta: (pack && pack.meta) || { name: "English", html_lang: "en", dir: "ltr" },
    locale: (pack && pack.meta && pack.meta.locale) || "en-US"
  };
  root.VW = root.VW || {};
  root.VW.i18n = api;
  root.VW.t = t;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
