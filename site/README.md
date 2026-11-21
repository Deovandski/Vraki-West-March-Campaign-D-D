# The website

The repo doubles as a website on GitHub Pages: **https://deovandski.github.io/Vraki-West-March-Campaign-D-D/**

It reads the same Markdown files you see in the repo, so there's nothing to keep in sync by hand: edit a rule, push, and the site shows the change.

## What's on it
- **Travel map:** the West March map with zoom and pan (drag, pinch, Ctrl + scroll, keyboard, full screen), a "how far is it?" finder that adds up the circles between any two places, and the table of every route. In DM mode, **Plan this trip** opens it in the travel planner.
- **Player 101 and DM 101:** pick Player or DM on the start page and a short step-by-step guide shows what you need to do to get ready, with links to the pages and tools for each step. Progress saves, so coming back opens the next step.
- **Player mode:** the rules, the world lore, the pre-made adventurers, the handout gallery, calculators (balls and change, travel time and quest deadlines, revival window and debt, splitting quest pay, Soul Points and tiers) and a tracker for your own adventurers.
- **DM mode:** everything players see, plus the DM pages and:
  - **Travel planner.** Type From and To and **Count circles from the map** sets the circles (and each one's encounter table) from the route lengths, or set how many circles the trip covers and how many days each circle takes (1, 2 or 3). Every day has its Graveyard, Morning, Afternoon and Night shifts. Roll the events the rules call for, or set each shift yourself: quiet, a sign, an encounter from the region tables, the Inside Job offer, or your own event. Open a shift to run it: creatures from the stat blocks, HP, initiative, conditions and notes, with the party in the same fight. **Print or save as PDF** turns a trip into a paper sheet for running it without the site: every day and shift, fights with blank HP space, the party, the encounter tables for its regions and the stat blocks.
  - **Party.** HP, temp HP, Soul Points, exhaustion, conditions, revival debt and death tracking, shared with the travel planner's fights.
  - **Campaign.** The in-world date, Bahyum's Castle Mood (with the daily roll), the Inside Job Heat, faction reputation and a session log.
  - **Bestiary** and **random tables** (quests, encounters, rumors, Inside Job offers).
- **Dice tray** on every page, and every roll written in the rules (like 2d6+3) is a button.
- **Search** across all the rules and lore. Player mode leaves DM pages out of the results.

## Install it as an app (works offline)
The site installs like an app on a phone, tablet or computer, and once installed (or after one visit in the browser) it works with **no signal**: handy at the table.
- **Android and Chrome/Edge:** use the browser's install button, or **Install as an app** in the save menu (top bar). Long-press the app icon for shortcuts to the travel map, the travel planner and the handouts.
- **iPhone and iPad:** in Safari, tap Share, then **Add to Home Screen**.

**What works offline:** the whole site and its tools, every rules and lore page (even ones you haven't opened), and the travel map at normal zoom. Pictures you've looked at stay saved too. To save more ahead of time, use **Save the handouts for offline use** on the handout page (about 4 MB) and **Save the sharp map** on the travel map page (2 MB). The 34 MB print map and the handouts PDF aren't saved.

Pages load from the internet when there is a connection; with no answer in 4 seconds, the saved copy is used. Each deploy saves a fresh copy and drops the old one.

## Saving
Everything you enter saves in your browser as you go (local storage). Use the save button in the top bar to **download a save file (.json)** and **load it** on another device or browser, or to keep a backup. Nothing is sent anywhere: there's no server, no account, no cookies and no analytics.

## Languages
The site comes in English and six translations: 中文 (Simplified Chinese), 日本語 (Japanese), Português (Brazil), Español (Spain), العربية (Arabic) and 한국어 (Korean). They are AI translations of the English, written ahead of time and kept in the repo; nothing is translated on the fly, and English stays the original.
- **Picking one:** open **Settings (⚙)** in the top bar. It lists every language in its own script with how much of it is done, has the light/dark switch, and links to [issue #7](https://github.com/Deovandski/Vraki-West-March-Campaign-D-D/issues/7) for asking for another language. On a first visit the site picks your browser's language by itself, once that translation is at least 90% done. A link can force one with `?lang=ja`.
- **The banner:** every translated page starts with "AI-Translated to (language) from Original works by Deovandski and Mitsukiven/Feiourm" in that language, and a one-click switch back to English.
- **What changes:** the menus, buttons and tools, every rules and lore page, the creature names in the tools, and the handouts (their pictures and PDF). Numbers, dice and AC, HP, DC, CR and SP stay as they are, and the Vraki-script lines on the handouts stay in Vraki. The license stays in English, because the English is the legal text.
- **Arabic** reads right to left: the whole layout flips, while dice, numbers and the map don't. Chinese, Japanese, Korean and Arabic use system fonts made for their scripts.
- **Distances:** the rules are written in feet and miles, as in D&D. English shows them that way; the translations show them in meters and kilometers (`5 ft` = `1.5 m`, `1 mile` = `1.5 km`, the usual D&D conversion), on every page, in the tools and on the translated handouts. **Settings → Distances** switches between the two in any language, and the choice is remembered. Heights and altitudes the lore already gives in meters and kilometers (the world's own units) stay as they are.
- **Save files** don't depend on the language: one saved in Japanese loads in English and the other way round.
- **Not translated yet:** when the English changes, the new or changed text shows in English until the next translation batch. The site never waits for a translation.

How the translations are stored and updated: [i18n/README.md](../i18n/README.md).

## Publishing
The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`: it refreshes `site/snapshot.js`, gathers the site and the Markdown it reads, and deploys them to GitHub Pages. You can also run it by hand from the Actions tab (**Website → Run workflow**).

On the way it writes the translations the site loads (`node tools/i18n.js build`, into `site/i18n/`) and renders the handouts in each language (`Handouts/<lang>/`). If the handouts can't be rendered, the site still deploys with the English ones. The step summary of each run, and of the **Translations** workflow on every pull request, says how much of each language is translated; neither ever fails because of a missing translation.

It also stamps `sw.js` with the commit, so every deploy refreshes the copy people have saved for offline use. Building and deploying are two jobs (**build**, then **deploy**); if a deploy ever fails, re-run the whole workflow rather than just the failed job, so it builds a fresh copy.

One-time setup in the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

## For AI tools and search engines
The site is one page that JavaScript fills in, and its pages live after a `#` in the address. Most AI tools and many crawlers don't run JavaScript and ignore everything after the `#`, so to them the site looks empty. These files point them to the Markdown instead:
- **`llms.txt`** ([format](https://llmstxt.org/)): a short summary of the campaign, then every page grouped as in the side menu (Start here, Player rules, Adventurers, World lore, Maps & handouts), each linked to its raw `.md` file with a one-line description. The DM pages come last, in their own **DM only (spoilers)** sections.
- **`llms-full.txt`**: every page in one file, in the same order, with links made absolute.
- **`sitemap.xml`**: the home page, the two files above and every page, for search engines.

`site/build-llms.js` writes all three from the page list in `site/js/content.js`, so a page added to the menus is added here too. The publishing workflow runs it on every deploy; the files aren't kept in the repo. To leave the DM pages out, set `INCLUDE_DM` to `false` at the top of the script.

The page also links them for readers that never get past the HTML: `<link rel="alternate">` tags in `index.html`, a short list of links that shows when JavaScript is off, and a footer on every page.

**Try it on your computer:** run `node site/build-llms.js` in the repo folder (it writes the three files there; git ignores them), start the local server below, and open http://localhost:8000/llms.txt. To see what a reader without JavaScript gets, turn JavaScript off for the page (in Chrome: DevTools → ⋮ → Run command → "Disable JavaScript") and reload. The script also lists any `.md` file that isn't in `site/js/content.js`.

**Once, by hand:** submit `https://deovandski.github.io/Vraki-West-March-Campaign-D-D/sitemap.xml` in [Bing Webmaster Tools](https://www.bing.com/webmasters) and [Google Search Console](https://search.google.com/search-console). A project site can't name its sitemap in a `robots.txt`, because that file only counts at the top of `deovandski.github.io`.

## Running it on your computer
Browsers block a page opened straight from a file from loading other files, so start a tiny local server in the repo folder:

```
python -m http.server 8000
```

Then open http://localhost:8000. (If you do open `index.html` directly, the site falls back to the copy of the pages bundled in `site/snapshot.js`, which may be older.)

## Editing
| You want to… | Do this |
|---|---|
| Change a rule, a stat block or an encounter table | Edit the `.md` file. The site and its tools read it directly. Keep the existing format (for example `## Name (CR 3) — Region` and `AC 14 · HP 80` in the stat blocks, numbered lists under each region in Events & Encounters) so the tools can read it. |
| Change a route's length, or add a route | Edit the **Route lengths** table in `Maps/README.md` (From, To, Circles, On the map, Encounter table). The travel map page and the travel planner read it directly. |
| Add a new page | Add the `.md` file, then add a line for it in the list at the top of `site/js/content.js` so it appears in the menus, search, `llms.txt` and the sitemap. |
| Change English text | Just change it. The translations show the old text's translation until the English is translated again; new or changed text shows in English until then. See [i18n/README.md](../i18n/README.md). |
| Add text to the site's own code | Wrap it: `__("Roll anything")`, `__.n(n, "{n} day", "{n} days")`, or `data-i18n` on an element in `index.html`. `node tools/i18n.js todo` then lists it for translating. |
| Refresh the offline copy | The publishing workflow does this on every push. To refresh the copy in the repo too, run `node site/build-snapshot.js`. |

## Files
- `index.html` — the page itself
- `site/css/site.css` — the look
- `site/js/` — `parse.js` (reads the Markdown into data), `core.js` (dice and saving), `content.js` (page list and loading), `app.js` (menus, pages, search, dice tray), `tools.js` (calculators, adventurer cards, handouts), `travel.js` (travel planner), `dm.js` (party, campaign, bestiary, random tables), `start.js` (Player 101 and DM 101), `map.js` (travel map page and route lengths), `map-viewer.js` (the zoom-and-pan map viewer, a reusable component with its own `site/css/map-viewer.css`)
- `site/js/i18n.js` — the translations: splits pages into pieces, finds each piece's translation and picks the language (works in the browser and in Node)
- `site/js/lang-picker.js` and `site/css/lang-picker.css` — the language list in Settings (a reusable component)
- `site/js/units.js` and `site/css/units.css` — feet or meters: converts the distances on the page and runs the Distances choice in Settings (a reusable component)
- `site/i18n/` — what `node tools/i18n.js build` writes for the site to load: `languages.js`, `<lang>.js` (the site's own text and names) and `<lang>.docs.js` (pages and handouts). Generated, not kept in the repo.
- `site/snapshot.js` — the bundled offline copy (generated); the installed app uses it to read every page offline
- `site/build-llms.js` — writes `llms.txt`, `llms-full.txt` and `sitemap.xml` for AI tools and search engines (run by the publishing workflow)
- `sw.js` — the service worker that saves the site for offline use (at the top of the repo so it covers the whole site)
- `site/manifest.webmanifest` and `site/icons/` — the app's name, colours, icons (made from the Forway emblem) and shortcuts
- `site/js/pwa.js` — registers the service worker and runs the install button, the iPhone hint, the offline status and the "save for offline" buttons (a reusable component)
- `site/vendor/marked.umd.js` — [marked](https://github.com/markedjs/marked), the Markdown renderer (MIT License, see `LICENSE-marked.md`)
- `site/fonts/` — TeX Gyre Schola and TeX Gyre Heros Cn, unmodified (GUST Font License, see `GUST-FONT-LICENSE.txt`). The Vraki font and the art come from the `Handouts/source/assets` folder.

The site's code and text are AI-assisted; see the [AI Disclosure](../AI-DISCLOSURE.md).

© Deovandski Skibinski Junior. Licensed under CC‑BY‑NC‑SA‑4.0 (third-party files keep their own licenses, listed above).
