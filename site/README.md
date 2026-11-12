# The website

The repo doubles as a website on GitHub Pages: **https://deovandski.github.io/Vraki-West-March-Campaign-D-D/**

It reads the same Markdown files you see in the repo, so there's nothing to keep in sync by hand: edit a rule, push, and the site shows the change.

## What's on it
- **Player 101 and DM 101:** pick Player or DM on the start page and a short step-by-step guide shows what you need to do to get ready, with links to the pages and tools for each step. Progress saves, so coming back opens the next step.
- **Player mode:** the rules, the world lore, the pre-made adventurers, the handout gallery, calculators (balls and change, travel time and quest deadlines, revival window and debt, splitting quest pay, Soul Points and tiers) and a tracker for your own adventurers.
- **DM mode:** everything players see, plus the DM pages and:
  - **Travel planner.** Set how many circles the trip covers and how many days each circle takes (1, 2 or 3). Every day has its Graveyard, Morning, Afternoon and Night shifts. Roll the events the rules call for, or set each shift yourself: quiet, a sign, an encounter from the region tables, the Inside Job offer, or your own event. Open a shift to run it: creatures from the stat blocks, HP, initiative, conditions and notes, with the party in the same fight. **Print or save as PDF** turns a trip into a paper sheet for running it without the site: every day and shift, fights with blank HP space, the party, the encounter tables for its regions and the stat blocks.
  - **Party.** HP, temp HP, Soul Points, exhaustion, conditions, revival debt and death tracking, shared with the travel planner's fights.
  - **Campaign.** The in-world date, Bahyum's Castle Mood (with the daily roll), the Inside Job Heat, faction reputation and a session log.
  - **Bestiary** and **random tables** (quests, encounters, rumors, Inside Job offers).
- **Dice tray** on every page, and every roll written in the rules (like 2d6+3) is a button.
- **Search** across all the rules and lore. Player mode leaves DM pages out of the results.

## Saving
Everything you enter saves in your browser as you go (local storage). Use the save button in the top bar to **download a save file (.json)** and **load it** on another device or browser, or to keep a backup. Nothing is sent anywhere: there's no server, no account, no cookies and no analytics.

## Publishing
The workflow in `.github/workflows/pages.yml` publishes the site on every push to `main`: it refreshes `site/snapshot.js`, gathers the site and the Markdown it reads, and deploys them to GitHub Pages. You can also run it by hand from the Actions tab (**Website → Run workflow**).

One-time setup in the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions.**

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
| Add a new page | Add the `.md` file, then add a line for it in the list at the top of `site/js/content.js` so it appears in the menus and search. |
| Refresh the offline copy | The publishing workflow does this on every push. To refresh the copy in the repo too, run `node site/build-snapshot.js`. |

## Files
- `index.html` — the page itself
- `site/css/site.css` — the look
- `site/js/` — `parse.js` (reads the Markdown into data), `core.js` (dice and saving), `content.js` (page list and loading), `app.js` (menus, pages, search, dice tray), `tools.js` (calculators, adventurer cards, handouts), `travel.js` (travel planner), `dm.js` (party, campaign, bestiary, random tables), `start.js` (Player 101 and DM 101)
- `site/snapshot.js` — the bundled offline copy (generated)
- `site/vendor/marked.umd.js` — [marked](https://github.com/markedjs/marked), the Markdown renderer (MIT License, see `LICENSE-marked.md`)
- `site/fonts/` — TeX Gyre Schola and TeX Gyre Heros Cn, unmodified (GUST Font License, see `GUST-FONT-LICENSE.txt`). The Vraki font and the art come from the `Handouts/source/assets` folder.

The site's code and text are AI-assisted; see the [AI Disclosure](../AI-DISCLOSURE.md).

© Deovandski Skibinski Junior. Licensed under CC‑BY‑NC‑SA‑4.0 (third-party files keep their own licenses, listed above).
