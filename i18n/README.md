# Translations

The website comes in English plus Chinese (Simplified), Japanese, Portuguese (Brazil), Spanish (Spain), Arabic and Korean ([issue #7](https://github.com/Deovandski/Vraki-West-March-Campaign-D-D/issues/7)). Everything here is an **AI translation of the English**, written ahead of time and checked into the repo. English stays the source: you only ever edit English, and the translations follow.

What readers see, and how they switch languages, is in [site/README.md](../site/README.md#languages).

## What's in this folder

One folder per language (`zh`, `ja`, `pt`, `es`, `ar`, `ko`), each with:

| File | What it holds |
|---|---|
| `meta.json` | The language's name in its own script, the `<html lang>` tag, the direction (`rtl` for Arabic), the locale for dates and numbers, `"units": "metric"` if the site should start in meters and kilometers for this language (leave it out for feet and miles), and the AI-translation banner |
| `glossary.json` | One spelling for every name and game term, and the 5e terms (shared with HusbandOutWorld's glossaries) |
| `ui.json` | The site's own text: menus, buttons, tools |
| `<page path>.json` | One file per Markdown page, e.g. `World Lore/06 - Races.md.json` |
| `Handouts/source/handouts.html.json` | The printable handouts |

Each file maps a short hash of an English piece (a heading, a paragraph, a list item, a table cell, or a label) to its translation:

```json
{ "3f9c0a1b2c4d": { "en": "Roll anything", "t": "なんでも振る" } }
```

Because the key is a hash of the English, English that doesn't change is never translated twice, and English that changes simply has no translation until the next batch. Whitespace and curly-vs-straight quotes don't change a hash.

## How the translations were written

- **Names are written by sound** in Chinese, Japanese, Korean and Arabic, following the HusbandOutWorld glossaries: creatures, places, factions, guilds, ranks, coins, nari gels and soul-energy spells (Body RESTORE is ボディ・リストア, 博迪里斯托尔, 보디 리스토어, بودي ريستور). Portuguese and Spanish keep the English names, ranks, coins and gel names ("30 pearls", "Nari Refresher").
- **"Balls"**, the money, keeps its double meaning: it's each language's word for balls, as the HusbandOutWorld glossaries spell it (bolas, ボール, 球, 볼, كرات). The faction Beer Balls keeps its name.
- **D&D terms** use each language's official 5e wording (skills, conditions, damage types, classes, spells); the list is the `dnd5e` part of each glossary.
- **Kept as they are:** numbers, dice (2d6+3), AC, HP, DC, CR, SP and SE, links, code, and the Vraki-script lines on the handouts. Distances stay in feet and miles, as in the English (`30 ft` → `30フィート`, `30 pies`): the site turns them into meters and kilometers when the reader picks that (`site/js/units.js`, which knows how each language writes feet, miles and inches). `LICENSE.md` stays in English, because the English is the legal text.
- When a character's gender isn't known, Portuguese and Spanish use wording that works for anyone.

## Tools

`tools/i18n.js` does the bookkeeping (it needs only Node):

| Command | What it does |
|---|---|
| `node tools/i18n.js status [--lang ja] [--files]` | How much is translated, per language, part and file |
| `node tools/i18n.js todo --lang ja [--file "World Lore/06"] [--max-words 4000] --out work.json` | Writes what still needs translating and prints it as a numbered list |
| `node tools/i18n.js apply --lang ja --work work.json ja.json` | Saves translations written as `{"1": "…", "2": "…"}` (⏎ marks a line break inside a piece) |
| `node tools/i18n.js names --work work.json` | The glossary spelling of every name in a work file, and the names that have none yet |
| `node tools/i18n.js addnames new.json` | Adds `{"ja": {"Name": "…"}, …}` to the glossaries |
| `node tools/i18n.js prune` | Drops translations whose English is gone |
| `node tools/i18n.js build` | Writes `site/i18n/`, the files the site loads (not kept in the repo) |
| `node tools/i18n.js report` | A Markdown summary for CI |

The handouts are read and rendered by `Handouts/source/render.js` (`--segments` lists their pieces, `--lang ja` or `--all` renders them, into `Handouts/<lang>/`). It needs Playwright, so the Pages workflow runs it on each deploy.

## Updating after the English changes

1. Change the English as usual and push. Nothing breaks: changed or new text shows in English on the translated site.
2. When you want the translations caught up: `node tools/i18n.js todo --lang <lang> --out work.json`, translate the list, `apply`, and repeat for each language (an AI assistant can do this; see [CLAUDE.md](../CLAUDE.md#translations)).
3. `node tools/i18n.js prune` to drop translations of text that's gone, then commit `i18n/`.

CI never blocks on translations: the **Translations** workflow reports the numbers on every pull request, and the Pages workflow builds whatever is there.

## Adding a language

Ask on [issue #7](https://github.com/Deovandski/Vraki-West-March-Campaign-D-D/issues/7). To add one yourself: add its code to `LANGS` in `tools/i18n.js`, create `i18n/<code>/meta.json` and `glossary.json` (copy another language's and change them), then translate with `todo` and `apply`. The site offers a language as soon as it has any translations, and picks it automatically for readers whose browser asks for it once it's 90% done.
