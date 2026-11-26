/* InstallApp: an "Install app" button for a site that's installable (a web app manifest and a service worker).
   Reusable component. No libraries. It shows the button only when the browser can install the site right now
   (Chrome, Edge, Samsung Internet), and otherwise a short line on how to get there: "Open this page in Chrome" on
   Android (links opened from WhatsApp, Instagram or Gmail land in a built-in viewer with no install option),
   "Share, then Add to Home Screen" on iPhone and iPad, and which browsers can install it anywhere else. Inside
   the installed app it says so; right after installing, where to find it. Nothing is saved.

   Usage (it builds itself inside the element). Load the script in <head>, without defer, so it catches the
   browser's install offer even when that comes early:
     <div class="install-app" data-install-app></div>
     <script src="site/js/install-app.js"></script>   (plus site/css/install-app.css)

   Elements present when the page has loaded are set up by themselves; set up later ones (or set up after
   changing data-text) with InstallApp.mount(el) or InstallApp.mountAll(container).

   Data attributes:
     data-text   optional JSON with its words in another language: {"install", "installed", "done", "android",
                 "ios", "other"}; any left out stay in English (see T below)

   Accessible: a real button; the line under it is read out when it changes (aria-live="polite").
   Theme it with CSS custom properties on .install-app: --install-accent (the button), --install-ink (the
   button's text), --install-muted (the line). No motion, so nothing to reduce. Works several times on a page.
   Ported from Deovandski/Deovandski's src/components/reusable/InstallApp.astro (#292, PR #293), same words, so
   its translations carry over; issue #32 here. */
(function () {
  "use strict";
  const T = {
    install: "Install app",
    installed: "You’re using the installed app.",
    done: "Installed! Open it from your home screen or app list.",
    android: "No install button? Open this page in Chrome (⋮ → Open in Chrome), then ⋮ → Install app.",
    ios: "On iPhone or iPad: tap Share, then Add to Home Screen.",
    other: "To install it, open this page in Chrome, Edge or Samsung Internet. On iPhone or iPad: Share, then Add to Home Screen."
  };
  // Keep the browser's install offer (it can only be used once). Shared by every copy on the page.
  const offer = window.__installAppPrompt || (window.__installAppPrompt = { event: null });
  if (!offer.listening) {
    offer.listening = true;
    window.addEventListener("beforeinstallprompt", (e) => {
      offer.event = e;
      document.dispatchEvent(new CustomEvent("install-app:ready"));
    });
    window.addEventListener("appinstalled", () => {
      offer.event = null;
      offer.installed = true;
      document.dispatchEvent(new CustomEvent("install-app:ready"));
    });
  }
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M11 3h2v9.6l3.3-3.3 1.4 1.4L12 16.4l-5.7-5.7 1.4-1.4 3.3 3.3V3Zm-6 15h14v2H5v-2Z"/></svg>';

  function mount(root) {
    let given = {};
    try { given = root.dataset.text ? JSON.parse(root.dataset.text) : {}; } catch (e) { given = {}; }
    const words = Object.assign({}, T, given);
    root.classList.add("install-app");
    root.innerHTML = `<button type="button" class="install-app__btn" hidden>${ICON}<span></span></button><p class="install-app__note" aria-live="polite"></p>`;
    const btn = root.querySelector(".install-app__btn");
    const note = root.querySelector(".install-app__note");
    btn.querySelector("span").textContent = words.install;
    let justInstalled = false;
    // What to show: the button when the browser can install the site now, otherwise how to get there.
    const show = () => {
      if (justInstalled || offer.installed) { btn.hidden = true; note.textContent = words.done; }
      else if (standalone()) { btn.hidden = true; note.textContent = words.installed; }
      else if (offer.event) { btn.hidden = false; note.textContent = ""; }
      else { btn.hidden = true; note.textContent = ios ? words.ios : android ? words.android : words.other; }
    };
    btn.addEventListener("click", async () => {
      const e = offer.event;
      if (!e) return show();
      offer.event = null; // the offer can only be used once
      await e.prompt();
      const choice = await e.userChoice;
      if (choice && choice.outcome === "accepted") justInstalled = true;
      show();
      document.dispatchEvent(new CustomEvent("install-app:ready")); // other copies on the page
    });
    if (!root.installApp) document.addEventListener("install-app:ready", () => root.installApp && root.installApp.show());
    root.installApp = { show };
    root.dataset.installAppReady = "";
    show();
    return root.installApp;
  }
  const mountAll = (scope) => (scope || document).querySelectorAll("[data-install-app]").forEach((el) => mount(el));
  window.InstallApp = { mount, mountAll };
  const auto = () => document.querySelectorAll("[data-install-app]:not([data-install-app-ready])").forEach((el) => mount(el));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
