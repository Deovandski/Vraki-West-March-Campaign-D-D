/* Vraki West March site: layout, menus, page routing, Markdown pages, search, dice tray, save menu. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, encPath } = VW.util;
  const store = VW.store;
  const C = VW.content;
  const I18N = VW.i18n;
  const { __ } = I18N;
  const REPO = "https://github.com/Deovandski/Vraki-West-March-Campaign-D-D";

  const main = () => document.getElementById("main");
  const routes = {};          // tool pages registered by tools.js, travel.js, dm.js
  let current = null;         // { route, params }

  /* ================= routing ================= */
  function parseHash() {
    const h = decodeURIComponent((location.hash || "#/").slice(1));
    const [pathPart, query] = h.split("?");
    const params = new URLSearchParams(query || "");
    const parts = pathPart.replace(/^\/+/, "").split("/");
    if (!parts[0]) return { name: "home", params };
    if (parts[0] === "doc") return { name: "doc", path: parts.slice(1).join("/"), params };
    if (parts[0] === "t") return { name: "tool", tool: parts[1], params };
    if (parts[0] === "search") return { name: "search", params };
    return { name: "home", params };
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  const docHash = (path, heading) => "#/doc/" + encPath(path) + (heading ? "?h=" + encodeURIComponent(heading) : "");

  async function render(keepScroll) {
    const r = parseHash();
    closeNav();
    const m = main();
    const y = window.scrollY;
    let html = "";
    current = r;
    document.querySelectorAll(".sidenav a").forEach((a) => a.removeAttribute("aria-current"));
    if (r.name === "home") { renderHome(m); }
    else if (r.name === "doc") { await renderDoc(m, r.path, r.params.get("h")); }
    else if (r.name === "search") { await renderSearch(m, r.params.get("q") || ""); }
    else if (r.name === "tool") {
      const route = routes[r.tool];
      if (!route) { m.innerHTML = notFound(); }
      else if (route.role === "dm" && store.state.role !== "dm") { m.innerHTML = dmGate(route.title); }
      else {
        current.route = route;
        document.title = __(route.title) + " | Vraki West March";
        m.innerHTML = '<div class="loading">' + __("Loading…") + '</div>';
        await route.render(m, r.params);
      }
    }
    markCurrent();
    if (keepScroll) window.scrollTo(0, y);
    else if (!(r.name === "doc" && r.params.get("h"))) window.scrollTo(0, 0);
    void html;
  }

  // Re-draws the current tool, keeping focus and scroll (used after button clicks).
  async function rerender() {
    if (!current || !current.route) return;
    const a = document.activeElement;
    const focusId = a && (a.id || a.getAttribute("data-focus"));
    const sel = a && "selectionStart" in a ? [a.selectionStart, a.selectionEnd] : null;
    const y = window.scrollY;
    await current.route.render(main(), current.params);
    window.scrollTo(0, y);
    if (focusId) {
      const el = document.getElementById(focusId) || main().querySelector('[data-focus="' + CSS.escape(focusId) + '"]');
      if (el) { el.focus({ preventScroll: true }); if (sel && "setSelectionRange" in el) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) {} }
    }
  }

  const notFound = () => `<div class="page"><h1>${__("Page not found")}</h1><p>${__("That link doesn't match a page here.")} <a href="#/">${__("Go to the start page")}</a>.</p></div>`;
  const dmGate = (what) => `<div class="page gate"><h1>${__("{page} is for the DM", { page: esc(__(what)) })}</h1>
    <p>${__("This page can spoil surprises. If you're running the game, switch to DM mode.")}</p>
    <p><button class="btn primary" data-action="role" data-role="dm">${__("Switch to DM mode")}</button> <a class="btn" href="#/">${__("Back to the start page")}</a></p></div>`;

  /* ================= navigation ================= */
  function renderNav() {
    const role = store.state.role;
    const nav = document.getElementById("sidenav");
    const toolLinks = Object.entries(routes)
      .filter(([, r]) => r.nav && (r.role === "player" || role === "dm"))
      .filter(([, r]) => !(role === "dm" && r.playerOnly))
      .sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    const dmTools = toolLinks.filter(([, r]) => r.role === "dm");
    const sharedTools = toolLinks.filter(([, r]) => r.role !== "dm");
    const link = ([id, r]) => `<li><a href="#/t/${id}" data-tool="${id}">${esc(__(r.nav))}</a></li>`;
    let html = '<div class="nav-inner">';
    if (role === "dm") html += `<section><h2>${__("At the table")}</h2><ul>${dmTools.map(link).join("")}${sharedTools.map(link).join("")}</ul></section>`;
    else html += `<section><h2>${__("Tools")}</h2><ul>${sharedTools.map(link).join("")}</ul></section>`;
    const order = role === "dm" ? ["dm", "stats", "rules", "pregens", "lore", "more", "start"] : ["start", "rules", "pregens", "lore", "more"];
    order.forEach((gid) => {
      const g = C.groups.find((x) => x.id === gid);
      if (!g || (g.role === "dm" && role !== "dm")) return;
      const open = gid === "lore" || gid === "pregens" ? "" : " open";
      html += `<details class="navgroup"${open}><summary>${esc(__(g.title))}</summary><ul>` +
        g.docs.map(([p, t]) => `<li><a href="${docHash(p)}" data-doc="${esc(p)}">${esc(__(t))}</a></li>`).join("") +
        (gid === "more" ? `<li><a href="#/t/handouts" data-tool="handouts">${__("Handout gallery")}</a></li>` : "") +
        "</ul></details>";
    });
    html += `<p class="nav-foot"><button class="link nav-theme" data-action="settings">${__("Settings")}</button><br class="nav-theme">
      <a href="${REPO}" target="_blank" rel="noopener">${__("The repo on GitHub")}</a><br>
      <a href="https://deovandski.github.io/vraki-windows/" target="_blank" rel="noopener">${__("Vraki, where the script started")}</a></p></div>`;
    nav.innerHTML = html;
    markCurrent();
    document.querySelectorAll('[data-action="role"]').forEach((b) => b.setAttribute("aria-checked", String(b.dataset.role === role)));
    document.body.dataset.role = role;
  }

  function markCurrent() {
    const r = parseHash();
    document.querySelectorAll(".sidenav a").forEach((a) => {
      const on = (r.name === "doc" && a.dataset.doc === r.path) || (r.name === "tool" && a.dataset.tool === r.tool) || (r.name === "home" && a.getAttribute("href") === "#/");
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  function toggleNav(force) {
    const open = force != null ? force : !document.body.classList.contains("nav-open");
    document.body.classList.toggle("nav-open", open);
    document.querySelector(".menu-btn").setAttribute("aria-expanded", String(open));
  }
  const closeNav = () => toggleNav(false);

  function setRole(role) {
    store.state.role = role === "dm" ? "dm" : "player";
    store.save();
    renderNav();
    render(true);
  }

  /* ================= home ================= */
  function renderHome(m) {
    document.title = "Vraki West March";
    const role = store.state.role;
    m.innerHTML = `
      <div class="home">
        <section class="hero">
          <div class="hero-text">
            <p class="script" aria-hidden="true">vraki west march</p>
            <h1>${__("Grab a quest. Sign in blood. Come back alive.")}</h1>
            <p class="lede">${__("An open-table D&amp;D 5e campaign in the world of #HusbandOutWorld. Players come and go, every party starts and ends at a Forway embassy, and whatever one party finds stays found for everyone.")}</p>
          </div>
          <div class="doors">
            <a class="badge-door ${role === "player" ? "is-on" : ""}" href="#/t/start-player" data-action="role" data-role="player" data-then="#/t/start-player">
              <span class="gem tl pearl"></span><span class="gem tr pearl"></span><span class="gem bl pearl"></span><span class="gem br pearl"></span>
              <span class="door-kicker">${__("I'm playing")}</span>
              <span class="door-title">${__("Player")}</span>
              <span class="door-text">${__("Make an adventurer, read the rules and lore, roll dice, count your balls and your debts.")}</span>
            </a>
            <a class="badge-door ${role === "dm" ? "is-on" : ""}" href="#/t/start-dm" data-action="role" data-role="dm" data-then="#/t/start-dm">
              <span class="gem tl sapphire"></span><span class="gem tr sapphire"></span><span class="gem bl sapphire"></span><span class="gem br sapphire"></span>
              <span class="door-kicker">${__("I'm running it")}</span>
              <span class="door-title">${__("DM")}</span>
              <span class="door-text">${__("Plan trips circle by circle, roll events, run fights, track the party, the Castle Mood and every faction.")}</span>
            </a>
          </div>
        </section>
        <section class="home-grid">
          <div>
            <h2>${__("New here?")}</h2>
            <p class="home-101">${__("Pick Player or DM above for a step-by-step guide, or:")}</p>
            <ol class="steps">
              <li>${__('<a href="{url}">Read the world at a glance</a> (five minutes).', { url: docHash("World Lore/01 - The World at a Glance.md") })}</li>
              <li>${__('<a href="{make}">Make an adventurer</a>, or pick one of the <a href="{pregens}">nine pre-made ones</a>.', { make: docHash("D&D Campaign/02 - Making an Adventurer.md"), pregens: docHash("D&D Campaign/Adventurers/README.md") })}</li>
              <li>${__('Pick a quest from the <a href="{board}">quest board</a> and post a <a href="#/t/handouts">Party Wanted</a> sign-up.', { board: docHash("D&D Campaign/06 - Quest Board.md") })}</li>
            </ol>
          </div>
          <div>
            <h2>${__("Travel without math")}</h2>
            <p>${__("The travel map has circles drawn along its routes. Count the circles to where you're going. Each circle is 1, 2 or 3 days, and the DM picks which.")} <a href="#/t/map">${__("Open the travel map")}</a> · <a href="${docHash("D&D Campaign/01 - Travel by Circles.md")}">${__("Travel by circles")}</a></p>
          </div>
          <div>
            <h2>${__("Your progress stays here")}</h2>
            <p>${__("Trackers and planners save in this browser as you type. Use the save button at the top to download a file you can load on another device.")}</p>
          </div>
        </section>
        <p class="spoiler">${__("Spoiler warning: the lore pages and the DM pages reveal secrets of the world, including some from unreleased story notes.")}</p>
        <footer class="site-foot">
          <p>${__('World, lore and characters © Deovandski Skibinski Junior. Art by Mitsukiven &amp; Feiourm. <em>A Husband Out of This World</em> and #HusbandOutWorld are trademarks of Deovandski Skibinski Junior. Licensed CC-BY-NC-SA-4.0. Monetized videos and posts about it are welcome; other commercial use needs approval (<a href="https://www.linkedin.com/in/deovandski/" target="_blank" rel="noopener">LinkedIn</a> or <a href="mailto:Deovandski@outlook.com">Deovandski@outlook.com</a>). Site text and code are AI-assisted; see the <a href="{url}">AI disclosure</a>.', { url: docHash("AI-DISCLOSURE.md") })}</p>
          <p>${__("Vraki is also the name of the world's script, which began as a 2017 app.")} <a href="https://deovandski.github.io/vraki-windows/" target="_blank" rel="noopener">${__("See where Vraki started")}</a>.</p>
        </footer>
      </div>`;
  }

  /* ================= Markdown pages ================= */
  function resolve(base, rel) {
    const stack = base.split("/").slice(0, -1);
    rel.split("/").forEach((seg) => {
      if (!seg || seg === ".") return;
      if (seg === "..") stack.pop(); else stack.push(seg);
    });
    return stack.join("/");
  }

  async function renderDoc(m, path, heading) {
    const meta = C.docs[path] || { path, title: path.split("/").pop().replace(/\.md$/, ""), role: "player" };
    if (meta.role === "dm" && store.state.role !== "dm") { m.innerHTML = dmGate(meta.title); return; }
    m.innerHTML = '<div class="loading">' + __("Loading…") + '</div>';
    let md, en;
    try { en = await C.getDoc(path); md = await C.getDocL(path); }
    catch (e) {
      m.innerHTML = `<div class="page"><h1>${__("Couldn't load this page")}</h1><p>${esc(e.message)}</p>${location.protocol === "file:" ? `<p>${__("You opened the site straight from a file. Pages load best when the site is served: open it on GitHub Pages, or run <code>python -m http.server</code> in the repo folder and visit <code>http://localhost:8000</code>.")}</p>` : ""}</div>`;
      return;
    }
    document.title = __(meta.title) + " | Vraki West March";
    const html = window.marked.parse(md, { gfm: true });
    const kept = I18N.lang !== "en" && C.keptEnglish(path) ? `<p class="kept-en" lang="${I18N.meta.html_lang}" dir="${I18N.meta.dir}">${__("This page stays in English: it's the license's legal text, and the English version is the one that counts.")}</p>` : "";
    m.innerHTML = `<div class="doc-wrap">
      <article class="page doc" data-path="${esc(path)}"${md === en && I18N.lang !== "en" ? ' lang="en" dir="ltr"' : ""}>${kept}${html}
        <p class="doc-foot"><a href="${REPO}/blob/main/${encPath(path)}" target="_blank" rel="noopener">${__("View or edit this page on GitHub")}</a>${C.usingSnapshot ? " · " + __("Showing the copy bundled with the site.") : ""}</p>
      </article>
      <aside class="toc" aria-label="${__("On this page")}"></aside></div>`;
    enhanceDoc(m.querySelector("article"), path, md === en ? null : en);
    buildToc(m);
    if (heading) {
      const t = document.getElementById(heading);
      if (t) { t.scrollIntoView(); t.classList.add("flash"); }
    }
  }

  // Heading ids come from the English headings, so links to a section (#…, ?h=…) work in every language.
  function englishHeadings(en) {
    if (!en) return null;
    const d = document.createElement("template"); // inert: its pictures don't load (their paths aren't fixed up yet)
    d.innerHTML = window.marked.parse(en, { gfm: true });
    return [...d.content.querySelectorAll("h1,h2,h3,h4")].map((h) => h.textContent);
  }

  function enhanceDoc(root, path, en) {
    const seen = {};
    const heads = englishHeadings(en);
    root.querySelectorAll("h1,h2,h3,h4").forEach((h, k) => {
      let id = VW.parse.slug(heads && heads[k] != null ? heads[k] : h.textContent) || "section";
      if (seen[id]) id += "-" + seen[id]++; else seen[id] = 1;
      h.id = id;
    });
    root.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (/^(https?:|mailto:)/i.test(href)) { a.target = "_blank"; a.rel = "noopener"; return; }
      if (href.startsWith("#")) { a.setAttribute("href", docHash(path, href.slice(1))); return; }
      let [target, frag] = href.split("#");
      try { target = decodeURIComponent(target); } catch (e) {}
      const full = resolve(path, target).replace(/\/$/, "");
      if (/\.md$/i.test(full)) a.setAttribute("href", docHash(full, frag));
      else if (C.folders[full]) a.setAttribute("href", docHash(C.folders[full]));
      else if (full === "Handouts") a.setAttribute("href", "#/t/handouts");
      else if (full === "Handouts/images") a.setAttribute("href", "#/t/handouts");
      else { a.setAttribute("href", encPath(full)); if (/\.(pdf|jpg|png)$/i.test(full)) a.target = "_blank"; }
    });
    root.querySelectorAll("img[src]").forEach((img) => {
      const src = img.getAttribute("src");
      if (!/^https?:/i.test(src)) img.setAttribute("src", encPath(resolve(path, decodeURIComponent(src))));
      img.loading = "lazy";
      // The travel map becomes the zoomable map viewer.
      if (VW.routes && /Maps\/web\/west-march-map/.test(decodeURIComponent(img.getAttribute("src"))) && window.MapViewer) {
        const M = VW.routes.MAP;
        const fig = document.createElement("figure");
        fig.className = "map-viewer";
        Object.assign(fig.dataset, { mapViewer: "", src: encPath(M.src), hires: encPath(M.hires), full: encPath(M.full), label: img.alt || M.label, text: JSON.stringify(VW.routes.viewerText()) });
        (img.closest("a") || img).replaceWith(fig);
        window.MapViewer.mount(fig);
      }
    });
    root.querySelectorAll("table").forEach((t) => {
      const w = document.createElement("div");
      w.className = "table-wrap";
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
    linkDice(root);
  }

  // Turns "2d6+3", "d20", "1d4+2" in text into roll buttons.
  const DICE_RE = /\b(\d*d(?:4|6|8|10|12|20|100)(?:\s?[+−-]\s?\d+)?)\b/g;
  function linkDice(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement.closest("a,code,button,.dice-link,h1,h2") ? NodeFilter.FILTER_REJECT : DICE_RE.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP)
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      DICE_RE.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0, m;
      const text = n.nodeValue;
      while ((m = DICE_RE.exec(text))) {
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dice-link";
        b.dataset.action = "roll";
        b.dataset.expr = m[1].replace(/−/g, "-").replace(/\s/g, "");
        b.title = __("Roll {dice}", { dice: m[1] });
        b.textContent = m[1];
        frag.appendChild(b);
        last = m.index + m[0].length;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
  }

  function buildToc(m) {
    const toc = m.querySelector(".toc");
    const hs = [...m.querySelectorAll("article h2, article h3")];
    if (hs.length < 3) { toc.remove(); m.querySelector(".doc-wrap").classList.add("no-toc"); return; }
    const path = m.querySelector("article").dataset.path;
    toc.innerHTML = "<h2>" + __("On this page") + "</h2><ul>" + hs.map((h) => `<li class="${h.tagName.toLowerCase()}"><a href="${docHash(path, h.id)}">${esc(h.textContent)}</a></li>`).join("") + "</ul>";
  }

  /* ================= search ================= */
  let index = null;
  async function buildIndex() {
    if (index) return index;
    const out = [];
    await Promise.all(C.allPaths().map(async (p) => {
      let md, en;
      try { en = await C.getDoc(p); md = await C.getDocL(p); } catch (e) { return; }
      const meta = C.docs[p];
      const enHeads = md === en ? null : (en.match(/^#{1,4}\s+.*$/gm) || []).map((l) => l.replace(/^#{1,4}\s+/, ""));
      let hk = 0;
      let heading = __(meta.title), slug = "";
      const seen = {};
      let buf = [];
      const flush = () => { if (buf.length) out.push({ path: p, doc: __(meta.title), role: meta.role, heading, slug, text: VW.parse.stripMd(buf.join(" ")).replace(/[#|>]/g, " ").replace(/\s+/g, " ") }); buf = []; };
      md.split("\n").forEach((l) => {
        const h = /^(#{1,4})\s+(.*)$/.exec(l);
        if (h) {
          flush();
          heading = VW.parse.stripMd(h[2]);
          const enHead = enHeads && enHeads[hk] != null ? VW.parse.stripMd(enHeads[hk]) : heading;
          hk++;
          let id = VW.parse.slug(enHead) || "section";
          if (seen[id]) id += "-" + seen[id]++; else seen[id] = 1;
          slug = h[1].length === 1 ? "" : id;
        } else buf.push(l);
      });
      flush();
    }));
    index = out;
    return index;
  }

  async function renderSearch(m, q) {
    document.title = __("Search") + " | Vraki West March";
    document.getElementById("q").value = q;
    m.innerHTML = `<div class="page"><h1>${__("Search")}</h1><div class="loading">${__("Searching…")}</div></div>`;
    const idx = await buildIndex();
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const role = store.state.role;
    let hidden = 0;
    const hits = [];
    if (words.length) idx.forEach((e) => {
      const hay = (e.heading + " " + e.text).toLowerCase();
      if (!words.every((w) => hay.includes(w))) return;
      if (e.role === "dm" && role !== "dm") { hidden++; return; }
      let score = 0;
      words.forEach((w) => { if (e.heading.toLowerCase().includes(w)) score += 5; if (e.doc.toLowerCase().includes(w)) score += 2; score += Math.min(3, hay.split(w).length - 1); });
      hits.push({ e, score });
    });
    hits.sort((a, b) => b.score - a.score);
    const snippet = (t) => {
      const low = t.toLowerCase();
      const i = Math.max(0, low.indexOf(words[0]) - 70);
      let s = (i > 0 ? "…" : "") + t.slice(i, i + 220) + (t.length > i + 220 ? "…" : "");
      s = esc(s);
      words.forEach((w) => { s = s.replace(new RegExp("(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "<mark>$1</mark>"); });
      return s;
    };
    m.innerHTML = `<div class="page search-page"><h1>${__("Search")}</h1>
      ${!words.length ? `<p>${__("Type a word in the search box, like Bagarisa, revival or Sanbi.")}</p>` :
        `<p class="muted">${hits.length ? __.n(hits.length, "{n} result for “{q}”", "{n} results for “{q}”", { q: esc(q) }) : __("Nothing matches “{q}”. Try a shorter word or a different spelling.", { q: esc(q) })}${hidden ? " " + __.n(hidden, "{n} more in DM pages; switch to DM mode to see them.", "{n} more in DM pages; switch to DM mode to see them.") : ""}</p>`}
      <ol class="results">${hits.slice(0, 60).map(({ e }) => `<li><a href="${docHash(e.path, e.slug)}"><span class="r-doc">${esc(e.doc)}</span><span class="r-head">${esc(e.heading)}</span></a><p>${snippet(e.text)}</p></li>`).join("")}</ol></div>`;
  }

  /* ================= dice tray ================= */
  function openTray(open) {
    const tray = document.getElementById("dice-tray");
    tray.hidden = !open;
    document.querySelector('[data-action="dice-open"]').setAttribute("aria-expanded", String(open));
    if (open) setTimeout(() => document.getElementById("dice-expr").focus(), 30);
  }

  function rollAndShow(expr, label) {
    const advEl = document.querySelector('.dice-form input[name="adv"]:checked');
    const adv = advEl ? advEl.value : "";
    let e = String(expr).trim();
    if (adv && /^(1)?d20\b/i.test(e)) e = e.replace(/^(1)?d20/i, adv === "adv" ? "2d20kh1" : "2d20kl1");
    let res;
    try { res = VW.dice.roll(e); }
    catch (err) { document.getElementById("dice-result").innerHTML = `<p class="err">${esc(err.message)}</p>`; return null; }
    const out = document.getElementById("dice-result");
    out.innerHTML = `<div class="big-roll"><span class="total">${res.total}</span><span class="expr">${esc(label || e)}</span></div><p class="detail">${esc(VW.dice.describe(res))}</p>`;
    const log = store.state.diceLog;
    log.unshift({ t: Date.now(), expr: label || e, total: res.total, detail: VW.dice.describe(res) });
    log.length = Math.min(log.length, 40);
    store.save();
    renderLog();
    return res;
  }

  function renderLog() {
    document.getElementById("dice-log").innerHTML = store.state.diceLog.map((r) =>
      `<li><span class="l-total">${r.total}</span><span class="l-expr">${esc(r.expr)}</span><span class="l-detail">${esc(r.detail)}</span></li>`).join("");
  }

  /* ================= save menu and settings menu ================= */
  function toggleMenu(id, action, open) {
    const menu = document.getElementById(id);
    const btn = document.querySelector('.topbar [data-action="' + action + '"]');
    if (!menu) return;
    const show = open != null ? open : menu.hidden;
    menu.hidden = !show;
    if (btn) btn.setAttribute("aria-expanded", String(show));
  }
  function dataMenu(open) { if (open) settingsMenu(false); toggleMenu("data-menu", "data-menu", open); }
  function settingsMenu(open) {
    if (open !== false) toggleMenu("data-menu", "data-menu", false);
    toggleMenu("settings-menu", "settings", open);
    const m = document.getElementById("settings-menu");
    if (m && !m.hidden) { markTheme(); const b = m.querySelector('.lang-picker__opt[aria-checked="true"]'); if (b) b.focus(); }
  }
  const currentTheme = () => document.documentElement.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function setTheme(next) {
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("vraki-west-march:theme", next); } catch (e) {}
    markTheme();
  }
  function markTheme() {
    document.querySelectorAll('[data-action="theme-set"]').forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.theme === currentTheme())));
  }

  /* ================= language ================= */
  // The Settings menu's language list, the AI-translation banner, and the page's own static text.
  function setupLanguage() {
    I18N.applyStatic();
    const langs = (window.VW_LANGS || [{ code: "en", name: "English" }]).filter((l) => l.code === "en" || l.coverage > 0);
    document.querySelectorAll("[data-lang-picker]").forEach((el) => {
      el.dataset.languages = JSON.stringify(langs);
      el.dataset.current = I18N.lang;
      el.dataset.label = __("Language");
      el.dataset.doneText = __("{pct}% translated");
      if (window.LanguagePicker) window.LanguagePicker.mount(el);
    });
    setupUnits();
    const banner = document.getElementById("lang-banner");
    if (banner && I18N.lang !== "en") {
      banner.innerHTML = `<p>${esc(I18N.meta.banner || "")} <button class="link" data-action="lang-en" lang="en">${esc(I18N.meta.english || "English")}</button></p>`;
      banner.hidden = false;
    }
    // The install-and-offline helper's words (site/js/pwa.js reads them from its script tag).
    const pwa = document.querySelector('script[src*="pwa.js"]');
    if (pwa && I18N.lang !== "en") pwa.dataset.text = JSON.stringify({
      offline: __("You're offline. Showing what's saved on this device."), ready: __("Ready to use offline on this device."),
      saving: __("Saving…"), saved: __("Saved for offline use"), partial: __("Saved {saved} of {total}. Try again online for the rest.")
    });
  }
  // Distances: feet and miles as written, or meters and kilometers (site/js/units.js). English starts in feet;
  // a language whose i18n/<lang>/meta.json says "units": "metric" starts in meters. The Settings menu switches.
  function setupUnits() {
    if (!window.Units) return;
    const key = "vraki-west-march:units";
    const units = window.Units.preferred(key, I18N.meta.units === "metric" ? "metric" : "imperial");
    document.querySelectorAll("[data-unit-picker]").forEach((el) => {
      el.dataset.label = __("Distances");
      el.dataset.value = units;
      el.dataset.options = JSON.stringify([{ value: "imperial", label: __("Feet and miles") }, { value: "metric", label: __("Meters and kilometers") }]);
      window.Units.mount(el);
    });
    window.Units.watch(document.body, { lang: I18N.lang, locale: I18N.locale, units });
  }
  function switchLanguage(code) {
    try { localStorage.setItem("vraki-west-march:lang", code); } catch (e) {}
    const url = new URL(location.href);
    url.searchParams.delete("lang");
    if (url.href === location.href) location.reload(); else location.href = url.href;
  }

  function showSaved() {
    const el = document.getElementById("save-status");
    if (!store.storageOk) { el.textContent = __("Not saving: this browser blocks storage. Download a save file to keep your work."); el.className = "save-status warn"; return; }
    const t = store.state.savedAt ? new Date(store.state.savedAt) : null;
    el.textContent = t ? __("Saved {time}", { time: t.toLocaleTimeString(I18N.locale, { hour: "numeric", minute: "2-digit" }) }) : "";
    el.className = "save-status";
  }

  /* ================= events ================= */
  function onClick(ev) {
    // With the menu open on a phone, a tap outside it just closes it.
    if (document.body.classList.contains("nav-open") && !ev.target.closest(".sidenav, .menu-btn")) {
      ev.preventDefault();
      closeNav();
      return;
    }
    let el = ev.target.closest("[data-action]");
    // Fields and forms act on change/input/submit, not on click. Treating a click on an open
    // dropdown as an action re-drew the page and closed the dropdown.
    if (el && /^(SELECT|INPUT|TEXTAREA|FORM|OPTION)$/.test(el.tagName)) el = null;
    if (!el) {
      if (!ev.target.closest("#data-menu,[data-action='data-menu']")) dataMenu(false);
      if (!ev.target.closest("#settings-menu,[data-action='settings']")) settingsMenu(false);
      return;
    }
    if (!el.closest("#settings-menu") && el.dataset.action !== "settings") settingsMenu(false);
    const a = el.dataset.action;
    switch (a) {
      case "toggle-nav": toggleNav(); return;
      case "role": {
        ev.preventDefault();
        setRole(el.dataset.role);
        if (el.dataset.then) go(el.dataset.then);
        return;
      }
      case "theme": setTheme(currentTheme() === "dark" ? "light" : "dark"); return;
      case "theme-set": setTheme(el.dataset.theme); return;
      case "settings": closeNav(); settingsMenu(); return;
      case "lang-en": switchLanguage("en"); return;
      case "dice-open": openTray(document.getElementById("dice-tray").hidden); return;
      case "dice-close": openTray(false); return;
      case "dice-clear": store.state.diceLog = []; store.save(); renderLog(); return;
      case "roll": {
        ev.preventDefault();
        openTray(true);
        rollAndShow(el.dataset.expr, el.dataset.label);
        return;
      }
      case "data-menu": dataMenu(); return;
      case "export": store.exportFile(); VW.toast(__("Save file downloaded.")); dataMenu(false); return;
      case "reset": {
        if (!confirm(__("Start over? This clears trips, the party, campaign tracking and characters saved in this browser. Download a save file first if you want a backup."))) return;
        store.reset(); dataMenu(false); renderNav(); render(); VW.toast(__("Started over.")); return;
      }
      case "import": return; // handled on change
    }
    if (current && current.route && current.route.onAction) current.route.onAction(a, el, ev);
  }

  function onInput(ev) {
    const el = ev.target;
    if (el.dataset.bind) {
      let v = el.type === "checkbox" ? el.checked : el.value;
      if (el.type === "number" || el.dataset.type === "number") v = el.value === "" ? "" : VW.util.num(el.value);
      store.setPath(el.dataset.bind, v);
      store.save();
      if (current && current.route && current.route.onBind) current.route.onBind(el, ev);
      if (el.dataset.rerender != null && ev.type === "change") rerender();
    } else if (current && current.route && current.route.onInput) {
      // Selects and checkboxes report on "change"; text fields report as you type.
      const picks = el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio";
      if ((ev.type === "change") === picks) current.route.onInput(el, ev);
    }
  }

  function onSubmit(ev) {
    const f = ev.target;
    const a = f.dataset.action;
    if (a === "search") {
      ev.preventDefault();
      const q = document.getElementById("q").value.trim();
      go("#/search?q=" + encodeURIComponent(q));
      return;
    }
    if (a === "roll-form") {
      ev.preventDefault();
      rollAndShow(document.getElementById("dice-expr").value);
      return;
    }
    if (current && current.route && current.route.onSubmit) current.route.onSubmit(a, f, ev);
  }

  async function onChange(ev) {
    const el = ev.target;
    if (el.dataset.action === "import" && el.files && el.files[0]) {
      const text = await el.files[0].text();
      el.value = "";
      try {
        if (!confirm(__("Load this save file? It replaces what's saved in this browser now."))) return;
        store.importText(text);
        dataMenu(false);
        renderNav();
        render();
        VW.toast(__("Save file loaded."));
      } catch (err) { VW.toast(err.message, "error"); }
      return;
    }
    onInput(ev);
  }

  // Keeps --top-h equal to the top bar's real height (it wraps to two rows on phones),
  // so the menu, the dice tray and sticky panels start right below it.
  function trackTopBar() {
    const bar = document.querySelector(".topbar");
    const set = () => document.documentElement.style.setProperty("--top-h", bar.offsetHeight + "px");
    set();
    if (window.ResizeObserver) new ResizeObserver(set).observe(bar);
    else window.addEventListener("resize", set);
  }

  function start() {
    setupLanguage();
    trackTopBar();
    store.load();
    store.onSave(showSaved);
    renderNav();
    renderLog();
    showSaved();
    document.addEventListener("click", onClick);
    document.addEventListener("input", onInput);
    document.addEventListener("change", onChange);
    document.addEventListener("submit", onSubmit);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { openTray(false); dataMenu(false); settingsMenu(false); closeNav(); }
      if (e.key === "/" && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); document.getElementById("q").focus(); }
    });
    window.addEventListener("hashchange", () => render());
    render();
  }

  VW.app = { start, render, rerender, register: (id, r) => { routes[id] = r; }, go, docHash, rollAndShow, renderNav, get routes() { return routes; } };
})();
