# Working in this repo

A West Marches style D&D 5e campaign set in the world of #HusbandOutWorld: the campaign files plus the website (`index.html` and `site/`). See README.md and [site/README.md](site/README.md) for how it works.

## Build reusable components
If a piece of UI could be useful twice, in this repo or in another of Deovandski's repos, build it as a reusable component instead of one-off code in a page. Examples: a clock, a counter or score card, a board, a gallery, a map, a picker.
- **Where:** its own script in `site/js/` and stylesheet in `site/css/`, set up from data attributes on its HTML. List it in a "Reusable components" section of README.md.
- **Self-contained:** everything it needs comes in as options/props or data attributes, with no reliance on page-specific code. Its styles are scoped to its own class and themed with CSS custom properties (with fallbacks). It works when used several times on one page.
- **Accessible:** text for screen readers, keyboard-friendly, and it respects `prefers-reduced-motion`.
- **Documented:** a comment at the top with a usage example and its options, plus a row in the list of reusable components.
- **Look before you build:** check the reusable components here and in the other repos first. The same rule is in Deovandski/Deovandski (`src/components/reusable/`: `SplitFlap`, a split-flap board, and `LedClock`, an LED countdown), Deovandski-repo-template, HusbandOutWorld, vraki-windows and Vraki-West-March-Campaign-D-D. Copy and adapt an existing component instead of starting over, and note where it came from.
- **Extract when you touch it:** when you change one-off UI that fits this rule, pull it out into a reusable component in the same PR.

## Translations
The site is translated into Chinese (Simplified), Japanese, Portuguese (Brazil), Spanish (Spain), Arabic and Korean, ahead of time, in `i18n/<lang>/`. English is the source; how it all works is in [i18n/README.md](i18n/README.md).
- **Edit English only.** Never block or hold back an English change for translations: changed text shows in English on the translated site until the next batch. Don't hand-edit the stores to "keep up" with an English edit unless asked.
- **New site text goes through `__()`.** Wrap strings in `site/js/*.js` with `__("…")` (or `__.n(n, "{n} day", "{n} days")`, or `N_()` where a list of labels is defined), and mark elements in `index.html` with `data-i18n` / `data-i18n-attr`. Don't build sentences out of pieces; use `{placeholders}`.
- **When asked to translate:** for each language run `node tools/i18n.js todo --lang <lang> --out work.json` (add `--file "<path prefix>"` and `--max-words` to take a batch), check names with `node tools/i18n.js names --work work.json`, write the numbered list as `{"1": "…"}`, and `node tools/i18n.js apply --lang <lang> --work work.json <lang>.json`. Add new names to the glossaries with `addnames` so every page spells them the same. Then `node tools/i18n.js prune` and commit `i18n/`.
- **Translation rules:** names, ranks, coins, gels and soul-energy spells are written by sound in zh/ja/ko/ar, as the glossary spells them, and kept in English in pt/es (except balls, the money). Use the official 5e terms from each glossary's `dnd5e` part. Keep numbers, dice, AC/HP/DC/CR/SP/SE, links (translate only the link text), code and `{placeholders}` exactly as they are; keep distances in feet and miles (the site shows them in meters for readers who pick that, with `site/js/units.js`); keep the Vraki-script lines on the handouts in Vraki. `LICENSE.md` stays in English.
- **Check it on the site** (`node tools/i18n.js build`, then the local server) in at least one language, and in Arabic for anything layout-related: the page runs right to left.

## Google Search Console file
`google0c08003a2b869d98.html` at the repo root verifies the website in Google Search Console (#28). **Never remove, rename or edit it**, and keep it in the `cp` list of the "Gather the site" step in `.github/workflows/pages.yml` (the workflow only deploys what it copies by name). Google re-checks it; without it the site is no longer verified.

## One source
Anything the site shows in more than one place comes from one source; never paste it twice. The rules, lore, stat blocks, tables, quests and handout list live in the Markdown files, and every page and tool reads them from there (`site/snapshot.js` and the `site/i18n/` bundles are generated from them; don't edit those by hand). Pieces of UI used in several places are the reusable components above. The handout pictures are rendered from `Handouts/source/handouts.html`. If something truly has to exist twice, say why in the PR.

## Pictures are clickable
Every picture on the website opens bigger when pressed, in the one photo viewer (`site/js/photo-viewer.js`, `site/css/photo-viewer.css`, and the `<dialog id="photo-viewer">` in `index.html`). The same standard is in Deovandski/Deovandski, Deovandski-repo-template, HusbandOutWorld and sinoi-the-fisherman.
- **Nothing to wire up:** any `<img>` with alt text opens by itself, and so does a link straight to an image file (a handout opens in the viewer, not a new tab). Pictures drawn later by the page's scripts work too.
- **Give every content picture real alt text** (in Markdown, `![what it shows](file.jpg)`). It becomes the viewer's caption. `![](…)` / `alt=""` means decorative, and those don't open.
- **Dates:** the viewer shows the date when it knows one: `data-date="YYYY-MM-DD"` (or `data-date-label`) on the picture or link, or a `YYYY-MM-DD` at the start of the file name.
- **The travel map keeps MapViewer** (its own zoom and pan); the viewer skips it. Opt anything else out with `data-no-zoom`.
