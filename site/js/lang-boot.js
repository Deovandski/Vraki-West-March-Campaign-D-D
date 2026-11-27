/* Picks the language and theme before anything draws, for every page of the site (index.html and
   debug/index.html), so they agree: ?lang=xx, else the saved choice, else (first visit) the browser's
   language once its translation is at least 90% done, else English. Then it loads that language's text
   (site/i18n/<lang>.js, written by tools/i18n.js build). Load it in <head> right after site/i18n/languages.js,
   without defer:
     <script src="site/i18n/languages.js"></script>
     <script src="site/js/lang-boot.js"></script>                     (a page in a folder: data-base="../")
   It also applies the saved light/dark theme. */
(function () {
  var me = document.currentScript, base = (me && me.getAttribute("data-base")) || "";
  var html = document.documentElement;
  try { var t = localStorage.getItem("vraki-west-march:theme"); if (t) html.setAttribute("data-theme", t); } catch (e) {}
  var K = "vraki-west-march:lang", L = window.VW_LANGS || [], min = window.VW_LANGS_MIN || 0.9, lang = "";
  var find = function (c) { for (var i = 0; i < L.length; i++) if (L[i].code === c) return L[i]; return null; };
  try {
    var q = /[?&]lang=([a-z]{2})/.exec(location.search);
    if (q && find(q[1])) { lang = q[1]; localStorage.setItem(K, lang); }
    else lang = localStorage.getItem(K) || "";
  } catch (e) {}
  if (!lang) {
    var want = navigator.languages || [navigator.language || ""];
    for (var j = 0; j < want.length && !lang; j++) {
      var c = String(want[j]).toLowerCase().split("-")[0], f = find(c);
      if (f && f.coverage >= min) lang = c;
    }
    lang = lang || "en";
    try { localStorage.setItem(K, lang); } catch (e) {}
  }
  var info = find(lang);
  if (!info || lang === "en") return;
  html.lang = info.html || lang;
  html.dir = info.dir || "ltr";
  html.classList.add("lang-" + lang);
  document.write('<script src="' + base + 'site/i18n/' + lang + '.js"><\/script>');
})();
