/* MapViewer: a zoom-and-pan viewer for one big picture, like a world map. Reusable component.
   No libraries. Drag to pan, pinch or Ctrl/⌘ + scroll to zoom, double-click to zoom in, and buttons for
   zoom in, zoom out, reset, full screen and the full-size file. When it's zoomed in it swaps to a sharper
   copy if you give it one. Works several times on one page.

   Usage (it builds itself inside the element):
     <figure class="map-viewer" data-map-viewer
       data-src="Maps/web/west-march-map-2400.jpg"
       data-hires="Maps/web/west-march-map-5000.jpg"
       data-full="Maps/Vraki World Map - West March.png"
       data-label="The Vraki West March travel map"
       data-caption="Drag to move around. Pinch, or hold Ctrl and scroll, to zoom."></figure>
     <script src="site/js/map-viewer.js"></script>   (plus site/css/map-viewer.css)

   Elements added later (pages drawn by script) are set up with MapViewer.mountAll(container).

   Data attributes:
     data-src      (required) the picture shown at first
     data-hires    optional sharper copy, loaded the first time someone zooms in past 1.6×
     data-full     optional link to the original file ("Full size" button)
     data-label    what screen readers hear for the picture (also its alt text)
     data-caption  optional caption under the viewer
     data-ratio    width ÷ height of the viewer box (default: the picture's own shape)
     data-max-zoom how far it zooms in (default 8)
     data-text     optional JSON with its own words in another language: {"zoomIn", "zoomOut", "reset",
                   "fullscreen", "full", "help"} (any left out stay in English)

   Script API: el.mapViewer.zoomTo(fx, fy, zoom) centers on a point given as fractions of the
   picture (0–1) at that zoom; el.mapViewer.reset().

   Theme it with CSS custom properties on .map-viewer: --map-viewer-bg, --map-viewer-border,
   --map-viewer-btn, --map-viewer-btn-ink, --map-viewer-focus, --map-viewer-radius.
   Based on the ideas in Deovandski/Deovandski's RouteMap (built when first used, a label for screen
   readers, button and pinch zoom), rewritten for a plain picture with no map library. */
(function () {
  "use strict";
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let count = 0;

  function icon(d) { return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`; }

  function mount(root) {
    if (root.mapViewer) return root.mapViewer;
    const id = "map-viewer-" + (++count);
    const o = root.dataset;
    const maxZoom = Math.max(1, parseFloat(o.maxZoom) || 8);
    const label = o.label || "Map";
    let words = {};
    try { words = o.text ? JSON.parse(o.text) : {}; } catch (e) { words = {}; }
    const T = Object.assign({
      zoomIn: "Zoom in", zoomOut: "Zoom out", reset: "Show the whole map", fullscreen: "Full screen", full: "Open the full-size file",
      help: "Drag to move around. Pinch, or hold Ctrl and scroll, to zoom. Double-click to zoom in. Keyboard: + and − zoom, arrow keys move, 0 shows the whole map."
    }, words);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    root.classList.add("map-viewer");
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", label);
    root.innerHTML = `
      <div class="map-viewer__box" tabindex="0" aria-describedby="${id}-help">
        <img class="map-viewer__img" src="${esc(o.src)}" alt="${esc(label)}" draggable="false" decoding="async">
        <div class="map-viewer__tools">
          <button type="button" data-mv="in" aria-label="${esc(T.zoomIn)}" title="${esc(T.zoomIn)}">${icon("M12 5v14M5 12h14")}</button>
          <button type="button" data-mv="out" aria-label="${esc(T.zoomOut)}" title="${esc(T.zoomOut)}">${icon("M5 12h14")}</button>
          <button type="button" data-mv="reset" aria-label="${esc(T.reset)}" title="${esc(T.reset)}">${icon("M3 11.5L12 4l9 7.5M5.5 9.5V20h13V9.5")}</button>
          ${document.fullscreenEnabled ? `<button type="button" data-mv="fs" aria-label="${esc(T.fullscreen)}" title="${esc(T.fullscreen)}" aria-pressed="false">${icon("M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5")}</button>` : ""}
          ${o.full ? `<a href="${esc(o.full)}" target="_blank" rel="noopener" aria-label="${esc(T.full)}" title="${esc(T.full)}">${icon("M14 4h6v6M20 4l-9 9M18 14v6H4V6h6")}</a>` : ""}
        </div>
        <span class="map-viewer__zoom" aria-live="polite"></span>
      </div>
      <p class="map-viewer__help" id="${id}-help">${esc(T.help)}</p>
      ${o.caption ? `<figcaption class="map-viewer__caption">${esc(o.caption)}</figcaption>` : ""}`;
    if (root.tagName !== "FIGURE") { const c = root.querySelector("figcaption"); if (c) c.outerHTML = `<p class="map-viewer__caption">${esc(o.caption)}</p>`; }

    const box = root.querySelector(".map-viewer__box");
    const img = root.querySelector(".map-viewer__img");
    const zoomOut = root.querySelector(".map-viewer__zoom");
    let iw = 0, ih = 0, s = 1, tx = 0, ty = 0, hiresLoaded = !o.hires;

    function size() { return { W: box.clientWidth, H: box.clientHeight }; }
    function base() { const { W, H } = size(); return iw ? Math.min(W / iw, H / ih) : 1; }
    function clampAndDraw(animate) {
      const { W, H } = size();
      const b = base(), dw = iw * b * s, dh = ih * b * s;
      tx = dw <= W ? (W - dw) / 2 : Math.min(0, Math.max(W - dw, tx));
      ty = dh <= H ? (H - dh) / 2 : Math.min(0, Math.max(H - dh, ty));
      img.style.transition = animate && !reduced() ? "transform .18s ease-out" : "none";
      img.style.width = iw * b + "px";
      img.style.height = ih * b + "px";
      img.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
      box.classList.toggle("is-zoomed", s > 1.001);
      if (!hiresLoaded && s > 1.6) loadHires();
    }
    function announce() { zoomOut.textContent = Math.round(s * 100) + "%"; }
    function zoomAt(ns, cx, cy, animate) {
      ns = Math.min(maxZoom, Math.max(1, ns));
      // keep the point under (cx, cy) in place
      tx = cx - (cx - tx) * (ns / s);
      ty = cy - (cy - ty) * (ns / s);
      s = ns;
      clampAndDraw(animate);
      announce();
    }
    function center() { const { W, H } = size(); return [W / 2, H / 2]; }
    function loadHires() {
      hiresLoaded = true;
      const hi = new Image();
      hi.decoding = "async";
      hi.onload = () => { img.src = o.hires; };
      hi.src = o.hires;
    }

    function setRatio() {
      const r = parseFloat(o.ratio) || (iw && ih ? iw / ih : 2);
      box.style.aspectRatio = String(r);
    }
    function ready() {
      iw = img.naturalWidth; ih = img.naturalHeight;
      setRatio();
      clampAndDraw(false);
    }
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener("load", ready, { once: true });
    if (window.ResizeObserver) new ResizeObserver(() => iw && clampAndDraw(false)).observe(box);

    /* pointer: drag to pan, two fingers to pinch */
    const pts = new Map();
    let last = null, pinch = null;
    box.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".map-viewer__tools")) return;
      box.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s };
      }
      last = { x: e.clientX, y: e.clientY };
      box.classList.add("is-dragging");
    });
    box.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = box.getBoundingClientRect();
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        zoomAt(pinch.s * (d / pinch.d), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, false);
        return;
      }
      if (last) { tx += e.clientX - last.x; ty += e.clientY - last.y; last = { x: e.clientX, y: e.clientY }; clampAndDraw(false); }
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      const rest = [...pts.values()][0];
      last = rest ? { x: rest.x, y: rest.y } : null;
      if (!pts.size) box.classList.remove("is-dragging");
    };
    box.addEventListener("pointerup", end);
    box.addEventListener("pointercancel", end);
    box.addEventListener("dblclick", (e) => {
      if (e.target.closest(".map-viewer__tools")) return;
      const r = box.getBoundingClientRect();
      zoomAt(s * 2, e.clientX - r.left, e.clientY - r.top, true);
    });
    // Scrolling the page shouldn't get stuck on the map: wheel zooms only with Ctrl/⌘ (also trackpad pinch).
    box.addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      const r = box.getBoundingClientRect();
      zoomAt(s * Math.exp(-e.deltaY * 0.0025), e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });

    box.addEventListener("keydown", (e) => {
      if (e.target !== box) return;
      const step = 80;
      const k = e.key;
      if (k === "+" || k === "=") zoomAt(s * 1.5, ...center(), true);
      else if (k === "-" || k === "_") zoomAt(s / 1.5, ...center(), true);
      else if (k === "0") api.reset();
      else if (k === "ArrowLeft") { tx += step; clampAndDraw(true); }
      else if (k === "ArrowRight") { tx -= step; clampAndDraw(true); }
      else if (k === "ArrowUp") { ty += step; clampAndDraw(true); }
      else if (k === "ArrowDown") { ty -= step; clampAndDraw(true); }
      else return;
      e.preventDefault();
    });

    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mv]");
      if (!b || !root.contains(b)) return;
      const a = b.dataset.mv;
      if (a === "in") zoomAt(s * 1.5, ...center(), true);
      if (a === "out") zoomAt(s / 1.5, ...center(), true);
      if (a === "reset") api.reset();
      if (a === "fs") {
        if (document.fullscreenElement === root) document.exitFullscreen();
        else root.requestFullscreen && root.requestFullscreen().catch(() => {});
      }
    });
    document.addEventListener("fullscreenchange", () => {
      const on = document.fullscreenElement === root;
      root.classList.toggle("is-fullscreen", on);
      const b = root.querySelector('[data-mv="fs"]');
      if (b) b.setAttribute("aria-pressed", String(on));
      requestAnimationFrame(() => clampAndDraw(false));
    });

    const api = {
      reset() { s = 1; tx = 0; ty = 0; clampAndDraw(true); announce(); },
      zoomTo(fx, fy, zoom) {
        const { W, H } = size();
        s = Math.min(maxZoom, Math.max(1, zoom || 2));
        const b = base();
        tx = W / 2 - fx * iw * b * s;
        ty = H / 2 - fy * ih * b * s;
        clampAndDraw(true); announce();
      },
      get zoom() { return s; }
    };
    root.mapViewer = api;
    return api;
  }

  function mountAll(container) {
    (container || document).querySelectorAll("[data-map-viewer]").forEach(mount);
  }

  window.MapViewer = { mount, mountAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mountAll());
  else mountAll();
})();
