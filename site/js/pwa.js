/* PWA helper: turns a site into an installable app that works offline. Reusable component.
   It registers the service worker and runs the small bits of page UI that go with it, all set up from
   data attributes, so it works with any worker and on pages drawn later by script.

   Usage:
     <link rel="manifest" href="site/manifest.webmanifest">
     <script src="site/js/pwa.js" data-sw="sw.js" data-scope="./" defer></script>

   Script tag options:
     data-sw     the service worker file, relative to the page (default "sw.js")
     data-scope  what it controls (default "./"). The worker must sit at or above the scope.

   Page elements it runs (anywhere, any number of them, including ones added later):
     [data-pwa-install]  hidden until the browser offers installing (Chrome, Edge, Android); clicking it
                         opens the browser's install prompt. Hidden again once installed.
     [data-pwa-ios]      shown only on iPhone/iPad Safari when not installed (they install from the Share
                         menu, so put "Share → Add to Home Screen" instructions in it).
     [data-pwa-status]   text kept up to date: "Ready to use offline on this device." / "You're offline…".
     [data-pwa-save="a.jpg|b.jpg"]  a button that saves those files for offline use (asks the worker,
                         which must answer postMessage({type:"save", urls}) like sw.js here does).
                         Optional data-pwa-saved="text" replaces its label when done.

   Adds classes to <html>: pwa-standalone (running as the installed app), pwa-ready (worker in control),
   pwa-offline (no connection). Fires "pwa:ready" and "pwa:installed" events on window.
   No motion, so nothing to reduce; status text is announced politely to screen readers (give the
   status element aria-live="polite").
   Based on the service worker setup in Deovandski/Deovandski (PR #160). */
(function () {
  "use strict";
  const me = document.currentScript || document.querySelector('script[src*="pwa.js"]');
  const swFile = (me && me.dataset.sw) || "sw.js";
  const scope = (me && me.dataset.scope) || "./";
  const root = document.documentElement;
  let deferred = null;
  let ready = false;

  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const all = (sel) => document.querySelectorAll(sel);

  function statusText() {
    if (!navigator.onLine) return "You're offline. Showing what's saved on this device.";
    if (ready) return "Ready to use offline on this device.";
    return "";
  }
  function refresh() {
    root.classList.toggle("pwa-standalone", standalone());
    root.classList.toggle("pwa-offline", !navigator.onLine);
    root.classList.toggle("pwa-ready", ready);
    all("[data-pwa-install]").forEach((el) => { el.hidden = !deferred || standalone(); });
    all("[data-pwa-ios]").forEach((el) => { el.hidden = !(ios && !standalone()); });
    all("[data-pwa-status]").forEach((el) => { const t = statusText(); if (el.textContent !== t) el.textContent = t; });
  }

  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; refresh(); });
  window.addEventListener("appinstalled", () => { deferred = null; refresh(); window.dispatchEvent(new Event("pwa:installed")); });
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);

  function save(urls) {
    return navigator.serviceWorker.ready.then((reg) => new Promise((resolve, reject) => {
      const ch = new MessageChannel();
      const t = setTimeout(() => reject(new Error("No answer from the worker.")), 120000);
      ch.port1.onmessage = (e) => { clearTimeout(t); resolve(e.data || {}); };
      (navigator.serviceWorker.controller || reg.active).postMessage({ type: "save", urls }, [ch.port2]);
    }));
  }

  document.addEventListener("click", (e) => {
    const inst = e.target.closest("[data-pwa-install]");
    if (inst && deferred) {
      e.preventDefault();
      deferred.prompt();
      deferred.userChoice.finally(() => { deferred = null; refresh(); });
      return;
    }
    const sv = e.target.closest("[data-pwa-save]");
    if (sv && "serviceWorker" in navigator) {
      e.preventDefault();
      const urls = sv.dataset.pwaSave.split("|").map((s) => s.trim()).filter(Boolean);
      const label = sv.textContent;
      sv.disabled = true;
      sv.setAttribute("aria-busy", "true");
      sv.textContent = "Saving…";
      save(urls).then((r) => {
        sv.textContent = r.failed ? `Saved ${r.saved} of ${urls.length}. Try again online for the rest.` : (sv.dataset.pwaSaved || "Saved for offline use");
        sv.disabled = !r.failed;
      }).catch(() => { sv.textContent = label; sv.disabled = false; })
        .finally(() => sv.removeAttribute("aria-busy"));
    }
  });

  // Pages drawn later by script get the right state too.
  new MutationObserver(() => refresh()).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", refresh); else refresh();

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register(swFile, { scope }).catch(() => {});
      navigator.serviceWorker.ready.then(() => {
        const mark = () => { ready = !!navigator.serviceWorker.controller; refresh(); if (ready) window.dispatchEvent(new Event("pwa:ready")); };
        if (navigator.serviceWorker.controller) mark();
        else navigator.serviceWorker.addEventListener("controllerchange", mark, { once: true });
      });
    });
  }
  window.PWA = { save, get installable() { return !!deferred; } };
})();
