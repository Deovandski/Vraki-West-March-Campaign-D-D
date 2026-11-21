/* Vraki West March site: the travel map page and route lengths.
   The routes come from the "Route lengths" table in Maps/README.md, so the Markdown stays the only place
   the numbers live. VW.routes finds the fewest circles between two places (adding up legs through towns)
   and turns a route into circles for the travel planner. The map itself is the MapViewer component. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, encPath, plural } = VW.util;
  const store = VW.store;
  const app = VW.app;
  const { __, N_ } = VW.i18n;
  const nm = (p) => VW.content.nameL(p);
  const circles = (n) => __.n(n, "{n} circle", "{n} circles");

  const MAP = {
    src: "Maps/web/west-march-map-2400.jpg",
    hires: "Maps/web/west-march-map-5000.jpg",
    full: "Maps/Vraki World Map - West March.png",
    label: __("The Vraki West March travel map: the world map with coloured circles along the roads and sea lanes between places")
  };

  /* ---------------- routes ---------------- */
  function places(data) {
    const set = new Set();
    data.map.routes.forEach((r) => { set.add(r.from); set.add(r.to); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }
  const same = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

  // Fewest circles from a to b. Returns { circles, legs: [{from, to, circles, region, look}] } or null.
  function find(data, a, b) {
    const all = places(data);
    const A = all.find((p) => same(p, a)), B = all.find((p) => same(p, b));
    if (!A || !B || A === B) return null;
    const dist = { [A]: 0 }, prev = {}, done = new Set();
    while (true) {
      let u = null;
      Object.keys(dist).forEach((k) => { if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k; });
      if (u === null || u === B) break;
      done.add(u);
      data.map.routes.forEach((r) => {
        const v = r.from === u ? r.to : r.to === u ? r.from : null;
        if (v === null || done.has(v)) return;
        const d = dist[u] + r.circles;
        if (dist[v] == null || d < dist[v]) { dist[v] = d; prev[v] = { u, r }; }
      });
    }
    if (dist[B] == null) return null;
    const legs = [];
    for (let v = B; v !== A; v = prev[v].u) {
      const { u, r } = prev[v];
      legs.unshift({ from: u, to: v, circles: r.circles, region: r.region, look: r.look });
    }
    return { from: A, to: B, circles: dist[B], legs };
  }

  // The encounter table id for a region name from the route table (matched by name).
  function regionId(data, name) {
    const n = String(name || "").toLowerCase();
    const r = data.regions.find((x) => x.name.toLowerCase() === n) || data.regions.find((x) => n && x.name.toLowerCase().startsWith(n.split(" ")[0]));
    return r ? r.id : "";
  }

  // Circles for the travel planner: one per circle on the route, labelled with its leg and region set.
  function toCircles(data, res, pace) {
    const out = [];
    res.legs.forEach((leg) => {
      for (let i = 0; i < leg.circles; i++) out.push({ id: VW.util.uid("c"), pace: pace || 2, region: regionId(data, leg.region), label: nm(leg.from) + " " + VW.i18n.arrow + " " + nm(leg.to) });
    });
    return out;
  }

  function describe(res, data) {
    const n = res.circles;
    const leg = (l) => data.map.routes.find((r) => (r.from === l.from && r.to === l.to) || (r.from === l.to && r.to === l.from)) || {};
    return `<p class="rf-total"><b>${esc(nm(res.from))} ${VW.i18n.arrow} ${esc(nm(res.to))}: ${circles(n)}</b>${res.legs.length > 1 ? ` <span class="muted">(${res.legs.map((l) => l.circles).join(" + ")})</span>` : ""}</p>
      <p class="rf-days">${__("{fast} days at Fast · {std} at Standard · {slow} at Slow", { fast: n, std: n * 2, slow: n * 3 })}</p>
      <ol class="rf-legs">${res.legs.map((l) => `<li>${esc(nm(l.from))} ${VW.i18n.arrow} ${esc(nm(l.to))}: ${circles(l.circles)} <span class="muted">(${esc(leg(l).lookL || l.look)}${l.region ? "; " + esc(leg(l).regionL || l.region) : ""})</span></li>`).join("")}</ol>`;
  }

  // The map viewer's own words (its buttons and help), passed in through data-text.
  const viewerText = () => ({
    zoomIn: __("Zoom in"), zoomOut: __("Zoom out"), reset: __("Show the whole map"), fullscreen: __("Full screen"),
    full: __("Open the full-size file"), help: __("Drag to move around. Pinch, or hold Ctrl and scroll, to zoom. Double-click to zoom in. Keyboard: + and − zoom, arrow keys move, 0 shows the whole map.")
  });
  VW.routes = { places, find, toCircles, describe, regionId, MAP, viewerText };

  /* ---------------- the map page ---------------- */
  async function render(m) {
    const data = await VW.content.data();
    const s = store.state;
    s.mapRoute = s.mapRoute || { from: "Forway", to: "Sanbi" };
    const ps = places(data);
    const res = find(data, s.mapRoute.from, s.mapRoute.to);
    const opt = (v) => ps.map((p) => `<option value="${esc(p)}"${same(p, v) ? " selected" : ""}>${esc(nm(p))}</option>`).join("");
    const dm = s.role === "dm";
    m.innerHTML = `<div class="page wide tool travel-map">
      <h1>${__("Travel map")}</h1>
      <p class="lede">${__("Count the circles between two places. Each circle is 1, 2 or 3 days of travel, and the DM picks which.")} <a href="${app.docHash("D&D Campaign/01 - Travel by Circles.md")}">${__("Travel by circles")}</a></p>
      <figure class="map-viewer" data-map-viewer data-src="${encPath(MAP.src)}" data-hires="${encPath(MAP.hires)}" data-full="${encPath(MAP.full)}" data-label="${esc(MAP.label)}" data-text="${esc(JSON.stringify(viewerText()))}"></figure>

      <section class="route-finder panel" aria-labelledby="rf-h">
        <h2 id="rf-h">${__("How far is it?")}</h2>
        <div class="frow">
          <label class="f"><span class="f-label">${__("From")}</span><select data-bind="mapRoute.from" data-rerender>${opt(s.mapRoute.from)}</select></label>
          <button class="icon-btn rf-swap" data-action="rf-swap" aria-label="${__("Swap from and to")}" title="${__("Swap")}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h12l-3-3M17 17H5l3 3"/></svg></button>
          <label class="f"><span class="f-label">${__("To")}</span><select data-bind="mapRoute.to" data-rerender>${opt(s.mapRoute.to)}</select></label>
        </div>
        <div class="rf-out" aria-live="polite">${res ? describe(res, data) : `<p class="muted">${same(s.mapRoute.from, s.mapRoute.to) ? __("Pick two different places.") : __("No road or sea lane on the map joins these. The DM decides how many circles it's worth.")}</p>`}</div>
        ${res && dm ? `<p><button class="btn primary" data-action="rf-plan">${__("Plan this trip in the travel planner")}</button></p>` : ""}
        <p class="muted small">${__('The fewest circles, adding up legs through towns. Numbers from the <a href="{url}">route lengths table</a>.', { url: app.docHash("Maps/README.md", "route-lengths") })}</p>
      </section>

      <section class="route-table">
        <h2>${__("Every road and sea lane")}</h2>
        <div class="table-wrap"><table>
          <thead><tr><th scope="col">${__("From")}</th><th scope="col">${__("To")}</th><th scope="col">${__("Circles")}</th><th scope="col">${__("On the map")}</th><th scope="col">${__("Encounter table")}</th></tr></thead>
          <tbody>${data.map.routes.map((r) => `<tr><td>${esc(r.fromL || r.from)}</td><td>${esc(r.toL || r.to)}</td><td class="num">${r.circles}</td><td>${esc(r.lookL || r.look)}</td><td>${esc(r.regionL || r.region)}</td></tr>`).join("")}</tbody>
        </table></div>
        ${data.map.edges.length ? `<h3>${__("Off the edge of the map")}</h3><ul>${data.map.edges.map((e) => `<li>${__("{from}, heading {heading}: {circles} to the edge", { from: esc(e.fromL || e.from), heading: esc(e.headingL || e.heading), circles: circles(e.circles) })}</li>`).join("")}</ul>` : ""}
      </section>
      <p class="muted small">${__("Map © Deovandski Skibinski Junior, CC-BY-NC-SA-4.0.")} <a href="${encPath(MAP.full)}" target="_blank" rel="noopener">${__("Full-size file for printing")}</a> (34 MB).</p>
      <p><button class="btn quiet" data-pwa-save="${encPath(MAP.hires)}" data-pwa-saved="${__("Sharp map saved for offline use")}">${__("Save the sharp map for offline zooming (2 MB)")}</button>
        <span class="muted small">${__("The map at normal zoom is already saved when the site is installed.")}</span></p>
    </div>`;
    window.MapViewer.mountAll(m);
  }

  async function onAction(a) {
    const s = store.state;
    if (a === "rf-swap") { const r = s.mapRoute; [r.from, r.to] = [r.to, r.from]; store.save(); app.rerender(); }
    if (a === "rf-plan") {
      const data = await VW.content.data();
      const res = find(data, s.mapRoute.from, s.mapRoute.to);
      if (!res) return;
      VW.travel.planRoute(data, res);
      app.go("#/t/travel");
    }
  }

  app.register("map", { title: N_("Travel map"), nav: N_("Travel map"), role: "player", order: 5, render, onAction });
})();
