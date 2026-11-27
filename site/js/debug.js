/* "Stats for nerds" (debug/index.html, issue #34): writes the terminal's lines, fills in every value, then starts
   the typing (site/js/terminal-screen.js). Build facts come from stats.json, written by tools/stats.js when the
   site is deployed; the rest is what this browser tells the page. Nothing is saved or sent anywhere: the only
   requests are stats.json itself (once, plus three timed HEAD requests for "Ping"). A browser that doesn't share
   something shows "n/a". After the typing ends, a few values keep updating (clock, uptime, frame rate, JS heap,
   viewport, online status).
   The terminal stays in English (translate="no", machine output); the page title, description and "Back to the
   site" are translated. Adapted from Deovandski-repo-template's src/pages/debug.astro + src/scripts/debug.ts.

   To add a line: add [label, key] to a section in SECTIONS, then set(key, text) where the value is known
   (fromStats for build facts, fromBrowser / fromNetwork / live for the browser's). */
(function () {
  "use strict";
  const I = (window.VW && window.VW.i18n) || null;
  const __ = I ? I.__ : (s) => s;
  const root = document.documentElement;
  const term = document.querySelector(".debug-terminal");
  const nav = navigator;
  const NA = "n/a";
  const KEYS = { state: "vraki-west-march:v1", lang: "vraki-west-march:lang", theme: "vraki-west-march:theme", units: "vraki-west-march:units" };

  /* ---------------- the page around the terminal (translated) ---------------- */
  const lang = I ? I.lang : "en";
  document.title = __("Stats for nerds") + " | Vraki West March";
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.content = __("Build, device, network and translation details for this site, typed out like an old computer terminal.");
  document.querySelectorAll(".debug-title").forEach((el) => { el.textContent = __("Stats for nerds"); });
  document.querySelectorAll(".debug-back").forEach((el) => { el.textContent = __("Back to the site"); });
  document.querySelectorAll("[data-back]").forEach((a) => { a.href = "../" + (lang !== "en" ? "?lang=" + lang : ""); });
  if (term) term.dataset.label = __("Stats for nerds");

  /* ---------------- the lines ---------------- */
  const SECTIONS = [
    ["CODE", [["Repository", "repo"], ["Visibility", "visibility"], ["Build", "build"], ["Built at", "builtAt"], ["Branch", "branch"],
      ["Commit", "commit"], ["Committed", "commitDate"], ["Pull request", "pr"], ["Workflow run", "run"], ["Tools", "tools"]]],
    ["SITE", [["Address", "siteUrl"], ["This page", "path"], ["Pages", "pages"], ["Deployed", "deployed"], ["Biggest types", "types"],
      ["Page language", "pageLang"], ["Ready langs", "readyLangs"], ["Settings keys", "storeKey"], ["Saved settings", "saved"],
      ["Offline worker", "sw"], ["Saved copies", "caches"], ["App mode", "display"]]],
    ["CAMPAIGN", [["Menu", "menu"], ["Rules pages", "rulesPages"], ["Lore pages", "lorePages"], ["DM pages", "dmPages"],
      ["Adventurers", "adventurers"], ["Stat blocks", "statBlocks"], ["Quests", "quests"], ["Handouts", "handouts"], ["Maps", "maps"],
      ["Glossary names", "glossary"], ["Distances", "distances"]]],
    ["RUNTIME", [["Browser", "browser"], ["Platform", "platform"], ["CPU threads", "cpu"], ["Device memory", "deviceMemory"],
      ["JS heap", "heap"], ["Storage", "storage"], ["Cookies", "cookies"], ["Local storage", "local"], ["Session storage", "session"],
      ["Screen", "screen"], ["Viewport", "viewport"], ["Pixel ratio", "dpr"], ["Colour scheme", "scheme"], ["Motion", "motion"],
      ["Input", "input"], ["GPU", "gpu"], ["WebGPU", "webgpu"], ["Battery", "battery"], ["Time zone", "tz"],
      ["Languages", "langs"], ["Local time", "clock"], ["Uptime", "uptime"], ["Frame rate", "fps"], ["User agent", "ua"]]],
    ["NETWORK", [["Status", "online"], ["Connection", "connection"], ["Downlink", "downlink"], ["Round trip", "rtt"], ["Data saver", "saveData"],
      ["Protocol", "protocol"], ["Served from", "servedFrom"], ["Server", "server"], ["CDN node", "cdn"], ["Cache", "cdnCache"],
      ["Ping", "ping"], ["Secure context", "secure"], ["Isolated", "isolated"]]],
    ["PERFORMANCE", [["DNS", "dns"], ["Connect", "connect"], ["TLS", "tls"], ["First byte", "ttfb"], ["Download", "download"],
      ["DOM ready", "domReady"], ["Load", "load"], ["First paint", "fcp"], ["Largest paint", "lcp"], ["Layout shift", "cls"],
      ["Page transfer", "transfer"], ["Resources", "resources"], ["DOM nodes", "nodes"]]]
  ];
  const heading = (title) => "== " + title + " " + "=".repeat(Math.max(3, 26 - title.length)); // every heading the same width
  const line = (cls, text) => { const d = document.createElement("div"); d.className = cls; if (text != null) d.textContent = text; return d; };
  function row(label, key) {
    const r = line("term-row"); r.dataset.row = key;
    const v = document.createElement("span"); v.className = "term-v"; v.dataset.v = key; v.textContent = "...";
    const ks = document.createElement("span"); ks.className = "term-k"; ks.textContent = label;
    r.append(ks, v);
    return r;
  }
  if (term) {
    term.append(line("term-hi", "VRAKI WEST MARCH DIAGNOSTICS"));
    const mem = line("term-dim");
    mem.innerHTML = 'Memory test <span data-v="memtest">...</span> OK · <span data-v="now">...</span>';
    term.append(mem, line("term-dim", "Click or press any key to skip the typing."));
    SECTIONS.forEach(([title, rows]) => {
      term.append(line("term-gap"), line("term-h", heading(title)));
      rows.forEach(([label, key]) => term.append(row(label, key)));
    });
    term.append(line("term-gap"), line("term-h", heading("LANGUAGES")));
    const sum = line("term-dim", "..."); sum.dataset.v = "i18nSummary"; term.append(sum);
    const marker = document.createElement("div"); marker.dataset.langsList = ""; marker.hidden = true; term.append(marker);
    term.append(line("term-gap"), line("term-hi", "READY."));
  }

  /* ---------------- formatting ---------------- */
  const bytes = (n) => {
    if (n == null || !isFinite(n)) return NA;
    const u = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return n.toFixed(i && n < 10 ? 1 : 0) + " " + u[i];
  };
  const ms = (n) => (n == null || !isFinite(n) || n < 0 ? NA : Math.round(n) + " ms");
  const when = (iso) => (iso ? new Date(iso).toLocaleString("en-CA", { hour12: false }).replace(",", "") : NA);
  const yesNo = (b) => (b ? "yes" : "no");
  const bar = (pct, width = 12) => { const full = Math.round((pct / 100) * width); return "[" + "█".repeat(full) + "░".repeat(width - full) + "]"; };
  // Put text (or a link) in a value.
  function set(key, text, href) {
    const el = term && term.querySelector('[data-v="' + key + '"]');
    if (!el) return;
    if (href) {
      const a = document.createElement("a");
      a.href = href; a.rel = "noopener"; a.textContent = text;
      el.replaceChildren(a);
    } else el.textContent = text == null || text === "" ? NA : String(text);
  }
  const timeout = (p, t = 1500) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), t))]);
  const getItem = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ---------------- code, site, campaign, languages (stats.json) ---------------- */
  async function fromStats() {
    const res = await timeout(fetch("../stats.json", { cache: "no-cache" }));
    const stats = res && res.ok ? await res.json().catch(() => null) : null;
    if (!stats) {
      const miss = "stats.json not found (written when the site is deployed; run node tools/stats.js)";
      ["repo", "visibility", "build", "builtAt", "branch", "commit", "commitDate", "pr", "run", "tools", "siteUrl", "pages", "deployed", "types",
        "menu", "rulesPages", "lorePages", "dmPages", "adventurers", "statBlocks", "quests", "handouts", "maps", "glossary", "i18nSummary"].forEach((k) => set(k, k === "repo" ? miss : NA));
      return;
    }
    const code = stats.code, site = stats.site, i18n = stats.i18n, c = stats.campaign;
    if (code.repo) set("repo", code.repo, code.repoUrl); else set("repo", NA);
    set("visibility", code.public === null ? "local build" : code.public ? "public" : "private (hidden)");
    set("build", code.run ? "#" + code.run + " · " + code.builtBy : code.builtBy, code.runUrl);
    set("builtAt", when(code.builtAt));
    set("branch", code.branch || NA);
    set("commit", code.commit ? (code.commit.slice(0, 7) + " " + (code.commitSubject || "")).trim() : NA, code.commitUrl);
    set("commitDate", when(code.commitDate));
    set("pr", code.pr ? "#" + code.pr : NA, code.prUrl);
    set("run", code.run ? "#" + code.run : code.builtBy, code.runUrl);
    set("tools", Object.entries(code.tools || {}).filter(([, v]) => v).map(([k, v]) => k + " " + String(v).replace(/^v/, "")).join(" · "));

    set("siteUrl", site.url || NA, site.url);
    set("pages", site.pages + " × " + site.languages + " languages");
    set("deployed", site.files + " files · " + bytes(site.bytes));
    set("types", Object.entries(site.byType || {}).slice(0, 4).map(([ext, t]) => ext + " " + bytes(t.bytes)).join(" · "));
    if (site.serviceWorker) term.dataset.swVersion = site.serviceWorker;

    if (c) {
      set("menu", (c.menu || []).map((g) => g.title + " " + g.pages).join(" · "));
      set("rulesPages", c.rulesPages);
      set("lorePages", c.lorePages);
      set("dmPages", c.dmPages);
      set("adventurers", c.adventurers + " pre-made");
      const sb = c.statBlocks || {};
      set("statBlocks", (sb.beasts + sb.fauna + sb.people) + " (" + sb.beasts + " beasts · " + sb.fauna + " fauna · " + sb.people + " people)");
      set("quests", Object.values(c.quests || {}).reduce((a, b) => a + b, 0) + " (" + Object.entries(c.quests || {}).map(([r, n]) => r + " " + n).join(" · ") + ")");
      set("handouts", c.handouts + " × " + site.languages + " languages");
      set("maps", c.maps + " files");
      set("glossary", Object.entries(c.glossary || {}).map(([l, n]) => l + " " + n).join(" · "));
    }

    const e = i18n.english;
    set("i18nSummary", "English: " + e.pages + " pages · " + e.segments + " segments · " + e.words.toLocaleString("en") + " words · a page is ready at " + Math.round(i18n.coverage * 100) + "%");
    const marker = term.querySelector("[data-langs-list]");
    i18n.languages.forEach((l) => {
      const r = line("term-row");
      const k = document.createElement("span"); k.className = "term-k"; k.textContent = l.code + " " + l.english.replace(/\s*\(.*\)$/, "");
      const v = document.createElement("span"); v.className = "term-v";
      const b = document.createElement("span"); b.className = "term-bar";
      b.textContent = bar(l.percent) + " " + l.percent.toFixed(1).padStart(5) + "%";
      v.append(b, " " + l.segments + "/" + e.segments + " seg · ready " + l.pagesReady + "/" + e.pages);
      if (l.percent < 50) b.classList.add("term-dim");
      if (l.code === lang) { r.classList.add("term-hi"); v.append(" ← this page"); }
      r.append(k, v);
      marker.before(r);
    });
  }

  /* ---------------- this page and the browser ---------------- */
  function webgl() {
    try {
      const gl = document.createElement("canvas").getContext("webgl");
      if (!gl) return NA;
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch (e) { return NA; }
  }
  function storageSummary(get) {
    try {
      const s = get();
      if (!s) return NA;
      let size = 0;
      const keys = [];
      for (let i = 0; i < s.length; i++) { const k = s.key(i); keys.push(k); size += k.length + (s.getItem(k) || "").length; }
      return keys.length ? keys.length + " key" + (keys.length > 1 ? "s" : "") + " · " + bytes(size * 2) + " · " + keys.join(", ") : "none";
    } catch (e) { return NA; }
  }
  function browserName() {
    const b = nav.userAgentData && nav.userAgentData.brands && nav.userAgentData.brands.filter((x) => !/not.?a.?brand/i.test(x.brand));
    if (b && b.length) return b.map((x) => x.brand + " " + x.version).join(" · ");
    const m = navigator.userAgent.match(/(Firefox|Edg|OPR|SamsungBrowser|Chrome|Version)\/([\d.]+)/);
    if (!m) return NA;
    const name = m[1] === "Version" ? "Safari" : m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1];
    return name + " " + m[2];
  }

  async function fromBrowser() {
    const mq = (q) => matchMedia(q).matches;
    set("path", location.pathname);
    set("pageLang", root.lang + (root.dir === "rtl" ? " (right to left)" : ""));
    const ready = (window.VW_LANGS || []).filter((l) => l.code === "en" || l.coverage >= (window.VW_LANGS_MIN || 0.9)).map((l) => l.code);
    set("readyLangs", ready.length ? ready.join(" ") : "en");
    set("storeKey", Object.values(KEYS).join(" · "));
    const state = getItem(KEYS.state);
    set("saved", "lang " + (getItem(KEYS.lang) || "-") + " · theme " + (getItem(KEYS.theme) || "system") + " · units " + (getItem(KEYS.units) || "default") +
      " · " + KEYS.state.split(":")[1] + " " + (state ? bytes(state.length * 2) : "none"));
    set("display", mq("(display-mode: standalone)") || nav.standalone ? "installed app" : "browser tab");
    // Distances: the saved choice, else the language's default (i18n/<lang>/meta.json "units").
    const units = getItem(KEYS.units) || (I && I.meta && I.meta.units === "metric" ? "metric" : "imperial");
    set("distances", (units === "metric" ? "meters and kilometers" : "feet and miles") + (getItem(KEYS.units) ? " (chosen in Settings)" : " (this language's default)"));

    set("browser", browserName());
    set("platform", ((nav.userAgentData && nav.userAgentData.platform) || navigator.platform || NA) + (nav.userAgentData && nav.userAgentData.mobile ? " (mobile)" : ""));
    set("ua", navigator.userAgent);
    set("cpu", navigator.hardwareConcurrency ? navigator.hardwareConcurrency + " logical cores" : NA);
    set("deviceMemory", nav.deviceMemory ? "≥ " + nav.deviceMemory + " GB (rounded by the browser)" : NA);
    const cookies = document.cookie ? document.cookie.split(";").map((c) => c.split("=")[0].trim()) : [];
    set("cookies", (navigator.cookieEnabled ? "enabled" : "blocked") + " · " + (cookies.length ? cookies.join(", ") : "none set by this site"));
    set("local", storageSummary(() => localStorage));
    set("session", storageSummary(() => sessionStorage));
    set("screen", screen.width + "×" + screen.height + " · " + screen.colorDepth + "-bit colour" + (screen.orientation ? " · " + screen.orientation.type : ""));
    set("dpr", devicePixelRatio + "×");
    set("scheme", (mq("(prefers-color-scheme: dark)") ? "dark" : "light") + (mq("(prefers-contrast: more)") ? " · more contrast" : "") + " · site theme " + (root.getAttribute("data-theme") || "system"));
    set("motion", mq("(prefers-reduced-motion: reduce)") ? "reduced" : "full");
    set("input", (mq("(pointer: coarse)") ? "touch" : mq("(pointer: fine)") ? "mouse" : NA) + (navigator.maxTouchPoints ? " · " + navigator.maxTouchPoints + " touch points" : ""));
    set("gpu", webgl());
    set("webgpu", yesNo(!!nav.gpu));
    const tz = Intl.DateTimeFormat().resolvedOptions(), off = -new Date().getTimezoneOffset();
    set("tz", tz.timeZone + " (UTC" + (off >= 0 ? "+" : "") + off / 60 + ") · " + tz.locale);
    set("langs", (navigator.languages || [navigator.language]).join(", "));
    set("secure", yesNo(isSecureContext));
    set("isolated", yesNo(window.crossOriginIsolated));

    const c = nav.connection;
    set("connection", c ? [c.type, c.effectiveType].filter(Boolean).join(" · ") || NA : NA);
    set("downlink", c && c.downlink != null ? c.downlink + " Mbps (estimate)" : NA);
    set("rtt", c && c.rtt != null ? c.rtt + " ms (estimate)" : NA);
    set("saveData", c && c.saveData != null ? yesNo(c.saveData) : NA);

    const est = navigator.storage && navigator.storage.estimate ? await timeout(navigator.storage.estimate()) : null;
    const persisted = navigator.storage && navigator.storage.persisted ? await timeout(navigator.storage.persisted()) : null;
    set("storage", est ? bytes(est.usage) + " used of " + bytes(est.quota) + (persisted != null ? " · persistent: " + yesNo(persisted) : "") : NA);

    if (!("serviceWorker" in navigator)) set("sw", "not supported");
    else {
      const reg = await timeout(navigator.serviceWorker.getRegistration("../"));
      const version = term.dataset.swVersion;
      set("sw", reg ? (navigator.serviceWorker.controller ? "active, controlling this page" : "installed, not controlling this page yet") + (version ? " · " + version : "") + " · scope " + new URL(reg.scope).pathname : "none yet (it installs on the first visit to the site)");
    }
    if ("caches" in window) {
      const names = (await timeout(caches.keys())) || [];
      const counts = await Promise.all(names.map(async (n) => { const k = await timeout(caches.open(n).then((c) => c.keys())); return k ? k.length : 0; }));
      set("caches", names.length ? names.map((n, i) => n + ": " + counts[i] + " files").join(" · ") : "none");
    } else set("caches", NA);

    const bat = nav.getBattery ? await timeout(nav.getBattery()) : null;
    set("battery", bat ? Math.round(bat.level * 100) + "% · " + (bat.charging ? "charging" : "on battery") : NA);
  }

  /* ---------------- network and performance ---------------- */
  async function fromNetwork() {
    const nt = performance.getEntriesByType("navigation")[0];
    if (nt) {
      set("protocol", nt.nextHopProtocol || "unknown (the server didn't say)");
      set("servedFrom", nt.workerStart > 0 && nt.transferSize === 0 ? "offline worker (saved copy)" : nt.transferSize === 0 ? "browser cache" : "network");
      set("dns", ms(nt.domainLookupEnd - nt.domainLookupStart));
      set("connect", ms(nt.connectEnd - nt.connectStart));
      set("tls", nt.secureConnectionStart > 0 ? ms(nt.connectEnd - nt.secureConnectionStart) : "none (not https)");
      set("ttfb", ms(nt.responseStart - nt.startTime));
      set("download", ms(nt.responseEnd - nt.responseStart));
      set("domReady", ms(nt.domContentLoadedEventEnd - nt.startTime));
      set("load", nt.loadEventEnd ? ms(nt.loadEventEnd - nt.startTime) : NA);
      set("transfer", bytes(nt.transferSize) + " over the wire · " + bytes(nt.decodedBodySize) + " HTML");
    } else ["protocol", "servedFrom", "dns", "connect", "tls", "ttfb", "download", "domReady", "load", "transfer"].forEach((k) => set(k, NA));
    const res = performance.getEntriesByType("resource");
    set("resources", res.length + " files · " + bytes(res.reduce((n, r) => n + (r.transferSize || 0), 0)) + " over the wire");
    set("nodes", document.getElementsByTagName("*").length + " elements");
    // Largest paint and layout shift arrive as buffered observer entries; take what's there now.
    const observed = (type) => {
      let got = [];
      try { const o = new PerformanceObserver(() => {}); o.observe({ type, buffered: true }); got = o.takeRecords(); o.disconnect(); } catch (e) { /* not supported */ }
      return got;
    };
    const fcp = performance.getEntriesByName("first-contentful-paint")[0] || observed("paint").find((e) => e.name === "first-contentful-paint");
    set("fcp", fcp ? ms(fcp.startTime) : "not reported by this browser");
    const lcp = observed("largest-contentful-paint").pop();
    set("lcp", lcp ? ms(lcp.startTime) : "not reported by this browser");
    const shifts = observed("layout-shift");
    const types = PerformanceObserver.supportedEntryTypes || [];
    set("cls", shifts.length || types.includes("layout-shift") ? shifts.filter((s) => !s.hadRecentInput).reduce((n, s) => n + s.value, 0).toFixed(3) : NA);

    // Ping: three HEAD requests for stats.json, straight to the server (no-store skips every cache).
    const times = [];
    let headers = null;
    for (let i = 0; i < 3; i++) {
      const t0 = performance.now();
      const r = await timeout(fetch("../stats.json?ping=" + Date.now(), { method: "HEAD", cache: "no-store" }), 3000);
      if (!r) break;
      times.push(performance.now() - t0);
      headers = headers || r.headers;
    }
    set("ping", times.length ? "min " + ms(Math.min(...times)) + " · avg " + ms(times.reduce((a, b) => a + b, 0) / times.length) + " (" + times.length + " HEAD requests)" : NA);
    const h = (k) => (headers && headers.get(k)) || null;
    set("server", h("server") || NA);
    set("cdn", h("x-served-by") || h("via") || "none");
    set("cdnCache", [h("x-cache"), h("cache-control"), h("age") ? "age " + h("age") + "s" : null].filter(Boolean).join(" · ") || "no cache headers");
  }

  /* ---------------- live values ---------------- */
  let frames = 0, fps = 0;
  const countFrames = () => { frames++; requestAnimationFrame(countFrames); };
  function live() {
    const heap = performance.memory;
    set("heap", heap ? bytes(heap.usedJSHeapSize) + " used · " + bytes(heap.totalJSHeapSize) + " allocated · " + bytes(heap.jsHeapSizeLimit) + " limit" : NA);
    set("viewport", innerWidth + "×" + innerHeight);
    set("clock", new Date().toLocaleString("en-CA", { hour12: false }).replace(",", ""));
    const s = Math.floor(performance.now() / 1000);
    set("uptime", Math.floor(s / 60) + "m " + String(s % 60).padStart(2, "0") + "s on this page");
    set("fps", fps ? fps + " fps" : "counting…");
    set("online", navigator.onLine ? "online" : "offline");
  }

  async function main() {
    if (!term) return;
    set("now", when(new Date().toISOString()));
    set("memtest", nav.deviceMemory ? nav.deviceMemory * 1024 * 1024 + "K" : "640K");
    live();
    requestAnimationFrame(countFrames);
    setTimeout(() => { fps = frames; frames = 0; }, 1000);
    await Promise.all([fromStats(), fromBrowser(), timeout(fromNetwork(), 2500)]);
    await new Promise((r) => setTimeout(r, Math.max(0, 1050 - performance.now()))); // a first frame-rate count
    live();
    term.addEventListener("terminal:done", () => {
      setInterval(() => { fps = frames; frames = 0; live(); }, 1000);
    }, { once: true });
    if (window.TerminalScreen) window.TerminalScreen.mount(term);
    term.dispatchEvent(new CustomEvent("terminal:start"));
  }

  if (document.readyState === "complete") main();
  else window.addEventListener("load", () => setTimeout(main), { once: true }); // after load ends, so "Load" has its time
})();
