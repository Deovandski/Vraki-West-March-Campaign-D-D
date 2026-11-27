/* TerminalScreen: an old-school computer terminal (green phosphor on black, amber headings, scan lines, a
   blinking cursor) that types its text out one character at a time, fast, the way old PCs filled the screen.
   Reusable component. No libraries. Ported from Deovandski-repo-template's src/components/reusable/TerminalScreen.astro
   (#19, PR #20) for the "Stats for nerds" page here (debug/index.html, issue #34).

   Usage (it wraps the element's lines in the screen and adds the title bar):
     <div class="terminal" data-terminal data-title="sysinfo" data-label="Build details">
       <div class="term-h">== CODE ==</div>
       <div class="term-row"><span class="term-k">Commit</span><span class="term-v">abc1234</span></div>
       <div class="term-gap"></div>
     </div>
     <script src="site/js/terminal-screen.js"></script>   (plus site/css/terminal-screen.css)

   Data attributes:
     data-label     what screen readers call it (default "Terminal")
     data-title     text in the title bar (default none: no title bar)
     data-duration  about how long the whole text takes to type, in ms (default 1800); long texts type more per frame
     data-wait      don't start by itself: wait for a "terminal:start" event on the element (fill in values first)

   Lines: each child element is one line, revealed in order; its text is typed. Classes: .term-h (amber heading),
   .term-row with .term-k (key) and .term-v (value), .term-dim, .term-hi, .term-amber, .term-warn, .term-gap (an
   empty line), .term-bar (a bar made of characters), .term-pre (keeps spaces). Links keep working.
   Events (on the element): "terminal:start" (types it, again if already typed), "terminal:done" (typing ended).
   Click, tap or any key while it types shows everything at once. Reduced motion shows it all at once, with no
   blinking cursor. While typing, aria-busy="true" tells screen readers to wait for the full text.
   Always left to right and translate="no", even on an Arabic page: it's machine output, like code.
   Theme it with --term-bg, --term-ink, --term-dim, --term-amber, --term-warn, --term-font, --term-size, --term-key.
   Set up by itself once the page has loaded; TerminalScreen.mount(el) sets up one added later. Works several
   times on a page. */
(function () {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  function mount(root) {
    if (root.terminalScreen) return root.terminalScreen;
    const o = root.dataset;
    root.classList.add("terminal");
    root.setAttribute("role", "region");
    root.setAttribute("dir", "ltr");
    root.setAttribute("aria-label", o.label || "Terminal");
    const screen = document.createElement("div");
    screen.className = "terminal__screen";
    screen.setAttribute("translate", "no");
    screen.tabIndex = 0;
    while (root.firstChild) screen.appendChild(root.firstChild);
    [...screen.childNodes].forEach((n) => { if (n.nodeType === 3 && !n.data.trim()) n.remove(); });
    const cursor = document.createElement("span");
    cursor.className = "terminal__cursor";
    cursor.setAttribute("aria-hidden", "true");
    screen.appendChild(cursor);
    if (o.title) {
      const bar = document.createElement("div");
      bar.className = "terminal__bar";
      bar.setAttribute("aria-hidden", "true");
      bar.setAttribute("translate", "no");
      bar.innerHTML = '<span class="terminal__dots"><i></i><i></i><i></i></span><span class="terminal__title"></span>';
      bar.querySelector(".terminal__title").textContent = o.title;
      root.appendChild(bar);
    }
    root.appendChild(screen);
    let stop = null;

    function start() {
      if (stop) stop();
      const lines = [...screen.children].filter((el) => el !== cursor);
      // Every text node of every line, with its full text kept aside.
      const texts = lines.map((line) => {
        const w = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        const nodes = [];
        for (let n = w.nextNode(); n; n = w.nextNode()) nodes.push({ node: n, full: n.data });
        return nodes;
      });
      const all = [].concat(...texts);
      const total = all.reduce((sum, t) => sum + t.full.length, 0);
      const finish = () => {
        all.forEach((t) => { t.node.data = t.full; });
        lines.forEach((l) => l.removeAttribute("data-term-hidden"));
        screen.appendChild(cursor);
        root.removeAttribute("data-typing");
        root.removeAttribute("aria-busy");
        stop = null;
        root.dispatchEvent(new CustomEvent("terminal:done"));
      };
      if (reduce.matches || total === 0) return finish();
      root.setAttribute("data-typing", "");
      root.setAttribute("aria-busy", "true");
      all.forEach((t) => { t.node.data = ""; });
      lines.forEach((l) => l.setAttribute("data-term-hidden", ""));
      const duration = Number(o.duration) || 1800;
      const perMs = Math.max(total / duration, 0.06);
      let line = 0, node = 0, raf = 0, last = performance.now(), budget = 0;
      const step = (now) => {
        budget += (now - last) * perMs;
        last = now;
        while (budget >= 1 && line < lines.length) {
          lines[line].removeAttribute("data-term-hidden");
          const t = texts[line][node];
          if (!t) { line++; node = 0; continue; } // a line with no (more) text: next line
          const take = Math.min(Math.floor(budget), t.full.length - t.node.data.length);
          t.node.data = t.full.slice(0, t.node.data.length + take);
          budget -= take;
          t.node.after(cursor);
          if (t.node.data.length === t.full.length) node++;
        }
        if (line >= lines.length) return finish();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      stop = () => { cancelAnimationFrame(raf); finish(); };
    }

    // Show everything at once: click, tap or any key while it types.
    const skip = () => { if (root.hasAttribute("data-typing") && stop) stop(); };
    screen.addEventListener("click", skip);
    window.addEventListener("keydown", (e) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) skip(); });
    root.addEventListener("terminal:start", start);
    root.terminalScreen = { start, skip };
    if (!root.hasAttribute("data-wait")) start();
    return root.terminalScreen;
  }

  const mountAll = (scope) => (scope || document).querySelectorAll("[data-terminal]").forEach((el) => mount(el));
  window.TerminalScreen = { mount, mountAll };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => mountAll()); else mountAll();
})();
