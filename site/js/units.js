/* Units: shows distances in feet and miles or in meters and kilometers, and a picker to switch. Reusable component.
   No libraries. Text keeps feet and miles (D&D's units) as written; with "metric" on, every "30 ft", "10-ft radius",
   "1 mile", "a mile" or "1-inch" in the page's text is shown as "9 m", "3 m radius", "1.5 km", "2.5 cm", in the
   page's language, and switching back puts the original text back. It follows the D&D metric convention:
   5 ft = 1.5 m (× 0.3) and 1 mile = 1.5 km; inches are × 2.54. Numbers already in meters stay as they are.
   It knows how feet, miles and inches are written in English, Spanish, Portuguese, Japanese, Chinese, Korean
   and Arabic (add a language with Units.languages.xx = { … }, shaped like the ones below).

   Usage:
     <div class="unit-picker" data-unit-picker data-label="Distances" data-storage-key="my-site:units"
       data-options='[{"value":"imperial","label":"Feet"},{"value":"metric","label":"Meters"}]'></div>
     <script src="site/js/units.js"></script>   (plus site/css/units.css)
     <script>
       const units = Units.watch(document.getElementById("main"), {
         lang: "ja", locale: "ja-JP", units: Units.preferred("my-site:units", "metric") });
       Units.mountAll();                         // the pickers; picking one calls units.set() on every watcher
     </script>

   Units.convert(text, { lang, locale }) -> the text in metric (a plain function, no DOM needed).
   Units.watch(root, { lang, locale, units }) converts the text under root, and anything added to it later
     (it watches for changes), skipping <script>, <style>, <code>, <pre>, <textarea> and [data-units-skip].
     Returns { units, set(units), stop() }; units is "imperial" (as written) or "metric".
   Units.preferred(storageKey, fallback) -> the saved choice, or fallback.
   Units.mount(el) / Units.mountAll(scope) build the picker from its data attributes:
     data-options      JSON list of { value: "imperial" | "metric", label }
     data-value        the choice in use (default: the saved one, else the first option)
     data-label        the group's heading (default "Distances")
     data-storage-key  localStorage key to save the choice under (optional)
   Events: "unitpick" (bubbles, cancelable) on the picker, detail { units }. Unless it's cancelled, the choice
   is saved and every Units.watch() on the page switches to it.

   Theme the picker with CSS custom properties on .unit-picker: --unit-picker-ink, --unit-picker-line,
   --unit-picker-on, --unit-picker-on-ink, --unit-picker-radius. No motion, so nothing to reduce.
   Works several times on one page. Written for the Vraki West March site; the picker follows the keyboard
   handling of this repo's LanguagePicker (site/js/lang-picker.js). */
(function (root) {
  "use strict";

  // How each language writes the units. ft / mi / in: the words after a number (longest first);
  // dims: words used only after "24 × 12" (English "in"); out: how a metric amount is written ({n} is the number);
  // phrases: [regex, unit, amount, replacement with {q} for the converted amount]; words: [regex, replacement].
  const L = "(?![\\p{L}\\p{M}])";
  const languages = {
    en: { ft: "feet|foot|ft", mi: "miles|mile", in: "inches|inch", dims: "in", tail: L, out: { m: "{n} m", km: "{n} km", cm: "{n} cm" },
      phrases: [["\\ba mile\\b", "mi", 1, "{q}"]], words: [["\\bfor miles\\b", "for kilometers"]] },
    es: { ft: "pies|pie", mi: "millas|milla", in: "pulgadas|pulgada", tail: L, out: { m: "{n} m", km: "{n} km", cm: "{n} cm" },
      phrases: [["\\buna milla" + L, "mi", 1, "{q}"], ["\\bcada pie" + L, "ft", 1, "cada {q}"]], words: [["\\ba millas" + L, "a kilómetros"]] },
    pt: { ft: "pés|pé", mi: "milhas|milha", in: "polegadas|polegada", tail: L, out: { m: "{n} m", km: "{n} km", cm: "{n} cm" },
      phrases: [["\\buma milha" + L, "mi", 1, "{q}"], ["\\bcada pé" + L, "ft", 1, "cada {q}"]], words: [["\\ba milhas" + L, "a quilômetros"]] },
    ja: { ft: "フィート", mi: "マイル", in: "インチ", out: { m: "{n}メートル", km: "{n}キロメートル", cm: "{n}センチ" },
      words: [["何マイル", "何キロメートル"]] },
    zh: { ft: "英尺|尺(?!寸)", mi: "英里", in: "英寸", out: { m: "{n}米", km: "{n}公里", cm: "{n}厘米" },
      phrases: [["一英里", "mi", 1, "{q}"]], words: [["几英里", "几公里"]] },
    ko: { ft: "피트", mi: "마일", in: "인치", out: { m: "{n}미터", km: "{n}킬로미터", cm: "{n}센티미터" },
      words: [["몇 마일", "몇 킬로미터"]] },
    ar: { ft: "قدمًا|قدما|أقدام|قدم", mi: "ميلًا|ميلا|أميال|ميل", in: "بوصات|بوصة|إنشات|إنش", tail: L, out: { m: "{n} م", km: "{n} كم", cm: "{n} سم" },
      phrases: [["(?<![\\p{L}\\p{M}])قدم واحدة" + L, "ft", 1, "{q}"], ["(?<![\\p{L}\\p{M}])ميل واحد" + L, "mi", 1, "{q}"],
        ["(?<![\\p{L}\\p{M}])(بعد|حتى) ميل" + L, "mi", 1, "$1 {q}"], ["(?<![\\p{L}\\p{M}])قدمين" + L, "ft", 2, "{q}"],
        ["(?<![\\p{L}\\p{M}])ميلين" + L, "mi", 2, "{q}"], ["(?<![\\p{L}\\p{M}])(لكل) قدم" + L, "ft", 1, "$1 {q}"], ["(?<![\\p{L}\\p{M}])(بعرض) بوصة" + L, "in", 1, "$1 {q}"]],
      words: [["(?<![\\p{L}\\p{M}])أميال" + L, "كيلومترات"]] }
  };
  const TO = { ft: ["m", 0.3], mi: ["km", 1.5], in: ["cm", 2.54] };
  const NUM = "\\d+(?:[.,]\\d+)?";
  const cache = {};

  const pick = (lang) => languages[lang] || languages[String(lang || "en").split("-")[0].toLowerCase()] || languages.en;
  function compile(lang) {
    const k = lang + "";
    if (cache[k]) return cache[k];
    const d = pick(lang);
    const unit = (u) => "(?<" + u + ">" + d[u] + ")";
    const c = {
      d,
      // 30 ft · 10-ft · 5–6 ft · 24 × 12 in (the number can't follow a letter, digit, dot or comma)
      main: new RegExp("(?<![A-Za-z0-9.,])(" + NUM + ")(?:(\\s?(?:[–×]|-(?=\\d))\\s?)(" + NUM + "))?(?:\\s|\\u00a0|-)?(?:" +
        ["ft", "mi", "in"].filter((u) => d[u]).map(unit).join("|") + (d.dims ? "|(?<dims>" + d.dims + ")" : "") + ")" + (d.tail || ""), "gu"),
      phrases: (d.phrases || []).map(([re, u, n, rep]) => [new RegExp(re, "gu"), u, n, rep]),
      words: (d.words || []).map(([re, rep]) => [new RegExp(re, "gu"), rep]),
      test: new RegExp("(" + ["ft", "mi", "in", "dims"].filter((u) => d[u]).map((u) => d[u]).join("|") + ")", "u")
    };
    return (cache[k] = c);
  }
  // "1,5" or "1.5" is a decimal; "1,500" or "1.500" is a thousand.
  const num = (s) => (/^\d{1,3}([.,]\d{3})+$/.test(s) ? Number(s.replace(/[.,]/g, "")) : Number(s.replace(",", ".")));

  function convert(text, opts) {
    opts = opts || {};
    if (text == null) return text;
    const c = compile(opts.lang || "en");
    let s = String(text);
    if (!c.test.test(s)) return s;
    const fmt = new Intl.NumberFormat(opts.locale || opts.lang || "en", { maximumFractionDigits: 1, numberingSystem: "latn" });
    const amount = (n, u) => {
      const v = n * TO[u][1];
      return fmt.format(u === "in" && v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
    };
    const out = (u, q) => c.d.out[TO[u][0]].replace("{n}", q);
    c.phrases.forEach(([re, u, n, rep]) => {
      s = s.replace(re, (...m) => rep.replace(/\$(\d)/g, (x, i) => m[+i] || "").replace("{q}", out(u, amount(n, u))));
    });
    s = s.replace(c.main, (...m) => {
      const g = m[m.length - 1];
      const u = g.ft ? "ft" : g.mi ? "mi" : "in";
      if (g.dims && !/×/.test(m[2] || "")) return m[0];
      const q = amount(num(m[1]), u) + (m[3] ? m[2] + amount(num(m[3]), u) : "");
      return out(u, q);
    });
    c.words.forEach(([re, rep]) => { s = s.replace(re, rep); });
    return s;
  }

  /* ---------- watching a part of the page ---------- */
  const SKIP = "script, style, code, pre, textarea, [data-units-skip], [contenteditable]";
  const watchers = new Set();

  function watch(rootEl, opts) {
    opts = Object.assign({ lang: (document.documentElement.lang || "en"), units: "imperial" }, opts || {});
    const seen = new WeakMap(); // text node -> { src, out }
    const one = (node) => {
      const p = node.parentElement;
      if (!p || p.closest(SKIP)) return;
      const rec = seen.get(node);
      const src = rec && node.nodeValue === rec.out ? rec.src : node.nodeValue;
      const want = ctl.units === "metric" ? convert(src, opts) : src;
      if (want !== node.nodeValue) node.nodeValue = want;
      if (want !== src) seen.set(node, { src, out: want }); else seen.delete(node);
    };
    const all = (el) => {
      if (el.nodeType === 3) return one(el);
      if (el.nodeType !== 1 && el.nodeType !== 11) return;
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = w.nextNode(); n; n = w.nextNode()) one(n);
    };
    const mo = new MutationObserver((list) => list.forEach((r) => {
      if (r.type === "characterData") one(r.target);
      else r.addedNodes.forEach(all);
    }));
    const ctl = {
      units: opts.units === "metric" ? "metric" : "imperial",
      set(u) { ctl.units = u === "metric" ? "metric" : "imperial"; all(rootEl); },
      stop() { mo.disconnect(); watchers.delete(ctl); }
    };
    watchers.add(ctl);
    if (ctl.units === "metric") all(rootEl);
    mo.observe(rootEl, { childList: true, subtree: true, characterData: true });
    return ctl;
  }

  function preferred(key, fallback) {
    let v = null;
    if (key) { try { v = localStorage.getItem(key); } catch (e) { /* storage blocked */ } }
    return v === "metric" || v === "imperial" ? v : fallback || "imperial";
  }

  /* ---------- the picker ---------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  let count = 0;
  const pickers = new Set();

  function mount(el) {
    const o = el.dataset;
    let options;
    try { options = JSON.parse(o.options || "[]"); } catch (e) { options = []; }
    if (!options.length) options = [{ value: "imperial", label: "Feet and miles" }, { value: "metric", label: "Meters and kilometers" }];
    const id = "unit-picker-" + (++count);
    let value = o.value || preferred(o.storageKey, options[0].value);
    el.classList.add("unit-picker");
    el.innerHTML = `<p class="unit-picker__label" id="${id}">${esc(o.label || "Distances")}</p>
      <div class="unit-picker__list" role="radiogroup" aria-labelledby="${id}">${options.map((x) =>
        `<button type="button" role="radio" class="unit-picker__opt" data-value="${esc(x.value)}">${esc(x.label)}</button>`).join("")}</div>`;
    const opts$ = () => [...el.querySelectorAll(".unit-picker__opt")];
    const mark = (v) => {
      value = v;
      opts$().forEach((b) => { const on = b.dataset.value === v; b.setAttribute("aria-checked", String(on)); b.tabIndex = on ? 0 : -1; });
    };
    mark(value);
    function choose(v) {
      if (v === value) return;
      if (!el.dispatchEvent(new CustomEvent("unitpick", { bubbles: true, cancelable: true, detail: { units: v } }))) return;
      if (o.storageKey) { try { localStorage.setItem(o.storageKey, v); } catch (e) { /* this visit only */ } }
      pickers.forEach((p) => p.mark(v));
      watchers.forEach((w) => w.set(v));
    }
    el.addEventListener("click", (e) => {
      const b = e.target.closest(".unit-picker__opt");
      if (b && el.contains(b)) choose(b.dataset.value);
    });
    el.addEventListener("keydown", (e) => {
      const list = opts$();
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      let n = null;
      if (step) n = list[(i + step + list.length) % list.length];
      if (e.key === "Home") n = list[0];
      if (e.key === "End") n = list[list.length - 1];
      if (n) { e.preventDefault(); n.focus(); choose(n.dataset.value); }
    });
    const api = { mark, choose, get value() { return value; } };
    pickers.add(api);
    el.unitPicker = api;
    return api;
  }
  const mountAll = (scope) => (scope || document).querySelectorAll("[data-unit-picker]").forEach((el) => mount(el));

  root.Units = { convert, watch, preferred, mount, mountAll, languages };
  if (typeof module !== "undefined" && module.exports) module.exports = root.Units;
})(typeof window !== "undefined" ? window : globalThis);
