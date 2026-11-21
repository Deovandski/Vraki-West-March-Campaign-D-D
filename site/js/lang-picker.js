/* LanguagePicker: a list of languages to choose from, each written in its own language. Reusable component.
   No libraries. A group of radio-style buttons (arrow keys move between them), each with the right `lang`
   and `dir`, plus how complete the translation is when you give it. Picking one saves the choice (if you
   give it a storage key) and reloads the page, unless you handle the "langpick" event yourself.
   Works several times on one page.

   Usage (it builds itself inside the element):
     <div class="lang-picker" data-lang-picker data-label="Language" data-current="ja"
       data-storage-key="my-site:lang"
       data-languages='[{"code":"en","name":"English"},{"code":"ja","name":"日本語","english":"Japanese","coverage":1}]'></div>
     <script src="site/js/lang-picker.js"></script>   (plus site/css/lang-picker.css)

   Elements added later are set up with LanguagePicker.mountAll(container); set data-languages first
   (or pass it: LanguagePicker.mount(el, { languages, current })).

   Data attributes:
     data-languages    JSON list: { code, name (in its own language), english (optional), html (lang tag,
                       optional), dir ("rtl" for right-to-left), coverage (0–1, optional) }
     data-current      the code of the language in use (default: the page's <html lang>)
     data-label        the group's heading (default "Language")
     data-storage-key  localStorage key to save the choice under (optional)
     data-done-text    how a coverage number reads, with {pct} (default "{pct}% translated")

   Events: "langpick" (bubbles, cancelable) on the element, detail { code }. Call preventDefault() to stop
   the save-and-reload and switch languages your own way.

   Theme it with CSS custom properties on .lang-picker: --lang-picker-ink, --lang-picker-muted,
   --lang-picker-line, --lang-picker-on, --lang-picker-on-ink, --lang-picker-radius.
   No motion, so nothing to reduce. Written for the Vraki West March site (issue #7), after the language
   menu in HusbandOutWorld's settings dialog. */
(function () {
  "use strict";
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let count = 0;

  function mount(root, opts) {
    opts = opts || {};
    const o = root.dataset;
    let langs = opts.languages;
    if (!langs) { try { langs = JSON.parse(o.languages || "[]"); } catch (e) { langs = []; } }
    const current = opts.current || o.current || (document.documentElement.lang || "en").split("-")[0];
    const label = o.label || "Language";
    const doneText = o.doneText || "{pct}% translated";
    const id = "lang-picker-" + (++count);
    root.classList.add("lang-picker");
    root.innerHTML = `<p class="lang-picker__label" id="${id}">${esc(label)}</p>
      <div class="lang-picker__list" role="radiogroup" aria-labelledby="${id}">${langs.map((l) => {
        const on = l.code === current;
        const pct = l.coverage != null && l.coverage < 1 ? `<span class="lang-picker__pct">${esc(doneText.replace("{pct}", Math.floor(l.coverage * 100)))}</span>` : "";
        return `<button type="button" role="radio" class="lang-picker__opt" data-code="${esc(l.code)}" aria-checked="${on}" tabindex="${on ? 0 : -1}">
          <span class="lang-picker__name" lang="${esc(l.html || l.code)}" dir="${l.dir === "rtl" ? "rtl" : "ltr"}">${esc(l.name)}</span>${l.english && l.english !== l.name ? `<span class="lang-picker__en" lang="en">${esc(l.english)}</span>` : ""}${pct}</button>`;
      }).join("")}</div>`;
    const opts$ = () => [...root.querySelectorAll(".lang-picker__opt")];

    function pick(code) {
      if (code === current) return;
      const ev = new CustomEvent("langpick", { bubbles: true, cancelable: true, detail: { code } });
      if (!root.dispatchEvent(ev)) return;
      if (o.storageKey) { try { localStorage.setItem(o.storageKey, code); } catch (e) { /* private mode: this visit only */ } }
      const url = new URL(location.href);
      url.searchParams.delete("lang");
      if (!o.storageKey) url.searchParams.set("lang", code);
      if (url.href === location.href) location.reload(); else location.href = url.href;
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest(".lang-picker__opt");
      if (b && root.contains(b)) pick(b.dataset.code);
    });
    root.addEventListener("keydown", (e) => {
      const list = opts$();
      const i = list.indexOf(document.activeElement);
      if (i < 0) return;
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step) {
        e.preventDefault();
        const n = list[(i + step + list.length) % list.length];
        list.forEach((b) => b.setAttribute("tabindex", b === n ? "0" : "-1"));
        n.focus();
      }
      if (e.key === "Home" || e.key === "End") { e.preventDefault(); (e.key === "Home" ? list[0] : list[list.length - 1]).focus(); }
    });
    root.languagePicker = { pick };
    return root.languagePicker;
  }

  function mountAll(scope) {
    (scope || document).querySelectorAll("[data-lang-picker]").forEach((el) => mount(el));
  }

  window.LanguagePicker = { mount, mountAll };
})();
