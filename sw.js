// Service worker: makes the Vraki West March site work as an installed app, with no signal at the table.
// Adapted from Deovandski/Deovandski's public/sw.js (PR #160): same network-first-with-4-seconds rule
// and hands off other websites. Changed for this site: it's one page (index.html, routes after the #)
// that loads Markdown files, and file names don't change between deploys (so the deploy stamps VERSION).
//
// Saved when the worker installs (about 2 MB):
//   - the page (index.html) and every stylesheet and script it links, read from its HTML;
//   - the fonts and images those stylesheets use, read from the CSS;
//   - site/snapshot.js, the bundled copy of every rules and lore page, so all of them read offline,
//     even ones never opened;
//   - the manifest, the app icons and the travel map at normal zoom (Maps/web/west-march-map-2400.jpg).
// The language in use: the page asks for its two files (site/i18n/<lang>.js and <lang>.docs.js) to be saved
// once the worker is in control (site/js/app.js).
// Saved when you use them: any Markdown page you open, and pictures you look at (handouts, the sharper
// map when you zoom), up to MAX_SAVE each. Never saved: bigger files (the 34 MB print map) and anything
// from other websites. The page can also ask it to save a list of files (see site/js/pwa.js).
//
// How it answers:
//   - the page, Markdown files, scripts, styles, the manifest and site/i18n/: network first, always asking
//     the server (cache: 'no-cache', so the browser's own copy is never used without checking; unchanged
//     files cost a quick "not modified"). With no answer in 4 seconds, or no signal, the saved copy.
//     Their file names don't change between deploys, so saved-first would run a new page with old scripts,
//     or show the old page for a whole visit after a deploy (issue #30, after Deovandski/Deovandski#220).
//   - fonts and pictures: the saved copy at once, refreshed in the background (they rarely change, and an
//     old picture for one view does no harm).
//
// VERSION: the Pages workflow writes the commit into it on every deploy, so each deploy saves a fresh set
// and throws away the old one. Change it by hand only to force that.
const VERSION = '__BUILD__';
const PREFIX = 'vraki-west-march-';
const CACHE = PREFIX + VERSION;
const SCOPE = new URL(self.registration.scope);
const HOME = SCOPE.href;
const EXTRA = [
  'site/snapshot.js',
  'site/manifest.webmanifest',
  'site/icons/icon-192.png',
  'site/icons/icon-512.png',
  'site/icons/icon-maskable-512.png',
  'site/icons/apple-touch-icon.png',
  'Maps/web/west-march-map-2400.jpg',
].map((p) => new URL(p, SCOPE).href);
const MAX_SAVE = 6 * 1024 * 1024; // pictures bigger than this are never saved
const WAIT = 4000;

const inScope = (url) => url.origin === SCOPE.origin && url.href.startsWith(SCOPE.href);

// Stylesheets, scripts and icons a page links (same site only). Skips addresses built by a script inside the
// page (index.html writes '<script src="site/i18n/' + lang + '.js">'): saving that literally is a 404, which
// made the whole install fail, so the site didn't work offline (issue #30).
function linksOf(html, base) {
  const found = new Set();
  for (const m of html.matchAll(/<(?:link|script)\b[^>]*?\s(?:href|src)="([^"]+)"[^>]*>/gi)) {
    if (/^<link/i.test(m[0]) && !/rel="(?:stylesheet|icon|apple-touch-icon|manifest|preload)"/i.test(m[0])) continue;
    if (/['"+\s]|\$\{/.test(m[1])) continue;
    const url = new URL(m[1].replace(/&amp;/g, '&'), base);
    if (inScope(url)) found.add(url.href);
  }
  return [...found];
}
// Fonts and images a stylesheet uses.
function urlsInCss(css, base) {
  const found = new Set();
  for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
    if (/^data:/i.test(m[1])) continue;
    const url = new URL(m[1], base);
    if (inScope(url)) found.add(url.href);
  }
  return [...found];
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const res = await fetch(HOME, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Could not load the page to save it.');
    const html = await res.clone().text();
    await cache.put(HOME, res);
    const files = linksOf(html, HOME);
    await cache.addAll(files.map((f) => new Request(f, { cache: 'no-cache' }))); // the app must be complete
    const more = new Set(EXTRA);
    for (const f of files.filter((f) => /\.css$/i.test(f))) {
      const css = await (await cache.match(f)).text();
      urlsInCss(css, f).forEach((u) => more.add(u));
    }
    await Promise.allSettled([...more].map((f) => cache.add(new Request(f, { cache: 'no-cache' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

const keyOf = (url) => url.origin + url.pathname; // no ?query or #hash

// Always asks the server. A request can't be copied with new options when it's a page visit (mode
// "navigate"), so it fetches the address instead; same site only, so the cookies rule doesn't matter.
const fresh = (request) => fetch(request.url, { cache: 'no-cache', credentials: 'same-origin' });

async function networkFirst(request, key) {
  const cache = await caches.open(CACHE);
  const network = fresh(request).then((res) => {
    if (res.ok) cache.put(key, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(resolve, WAIT));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch (e) { /* no signal: use the saved copy */ }
  return (await cache.match(key)) || network;
}

function small(res) {
  const n = parseInt(res.headers.get('content-length') || '0', 10);
  return n > 0 && n <= MAX_SAVE;
}

async function savedFirst(request, key, event) {
  const cache = await caches.open(CACHE);
  const saved = await cache.match(key);
  const refresh = fetch(request).then((res) => {
    if (res.ok && (request.destination !== 'image' || small(res))) cache.put(key, res.clone());
    return res;
  });
  if (saved) {
    event.waitUntil(refresh.catch(() => {}));
    return saved;
  }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!inScope(url)) return; // other websites: hands off

  if (request.mode === 'navigate') {
    // The app itself (any #route). Other files opened in a tab (the PDF, the print map) aren't saved.
    if (url.pathname === SCOPE.pathname || url.pathname === SCOPE.pathname + 'index.html') {
      event.respondWith(networkFirst(request, HOME));
    } else {
      event.respondWith(fetch(request).catch(async () => (await caches.match(keyOf(url))) || Response.error()));
    }
    return;
  }
  const key = keyOf(url);
  // The site's own text and code: always the latest deploy when there's a signal.
  if (['style', 'script', 'manifest'].includes(request.destination) || /\.(md|js|css|json|webmanifest)$/i.test(url.pathname)) {
    event.respondWith(networkFirst(request, key));
    return;
  }
  if (['font', 'image'].includes(request.destination) || EXTRA.includes(key)) {
    event.respondWith(savedFirst(request, key, event));
  }
});

// The page can ask for files to be saved: postMessage({ type: 'save', urls: [...] }) over a MessageChannel.
// It answers { saved, failed } through the channel's port.
self.addEventListener('message', (event) => {
  const d = event.data || {};
  if (d.type !== 'save' || !Array.isArray(d.urls)) return;
  const port = event.ports && event.ports[0];
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    let saved = 0, failed = 0;
    for (const u of d.urls) {
      const url = new URL(u, SCOPE);
      if (!inScope(url)) { failed++; continue; }
      try {
        if (await cache.match(keyOf(url))) { saved++; continue; }
        const res = await fetch(url.href, { cache: 'no-cache' });
        if (!res.ok) throw new Error(res.status);
        await cache.put(keyOf(url), res);
        saved++;
      } catch (e) { failed++; }
    }
    if (port) port.postMessage({ saved, failed });
  })());
});
