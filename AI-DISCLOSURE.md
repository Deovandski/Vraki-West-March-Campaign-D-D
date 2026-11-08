# AI Disclosure

This repo was built with an AI assistant, **Claude** (by Anthropic), working from the #HusbandOutWorld series. This page says plainly which parts are human work, which parts the AI wrote, and how the two fit together.

## The short version
- **The world is human-made.** The lore, the kingdoms, the characters, the names, the original Alpha D&D campaign and the Vraki font come from Deovandski Skibinski Junior, and the illustrations are by the series' artists, **Mitsukiven** and **Feiourm**. All of it comes from the #HusbandOutWorld series: the originals in the main repo's [Legacy folder](https://github.com/Deovandski/HusbandOutWorld/tree/main/Legacy) (the full docs in `Behind The Scenes`, and the old blog, now retired, in `Public`).
- **No AI-generated images.** Every picture in this repo is existing series art by Mitsukiven and Feiourm. The AI only cropped, scaled and removed white backgrounds from some of it (for the handouts).
- **Much of the writing is AI-assisted.** The World Lore summaries, most of the West March rules, the new stat blocks, the handouts' text and layout, the website (its code and text), and this page were written by Claude, following Deovandski's direction and the existing lore.
- **A human decides.** Deovandski directed the work, set the design rules (for example, travel by circles), and chose what got committed. Not every line has had a detailed human review yet. If something here contradicts the series, **the series wins**: please open an issue or send a PR.

## Attribution statement
Modeled on the questions in IBM's [AI Attribution Toolkit](https://www.research.ibm.com/blog/AI-attribution-toolkit) (what AI was used, what it contributed, how much humans shaped it, and who is accountable):

> **AI system:** Claude, a large language model by Anthropic, used as an assistant with access to the repo files (October–November 2026).
> **Human contribution:** all source material (the world, its lore and its characters, the original Alpha campaign, pre-gens and stat blocks, and the Vraki font, by Deovandski Skibinski Junior; all artwork, by Mitsukiven and Feiourm); the campaign concept and design decisions; direction and approval of every commit.
> **AI contribution:** condensing the lore into summaries; designing and writing most rules, tables and new stat blocks; adapting the original campaign files; designing and writing the handouts; designing and coding the website and its tools; writing the build scripts.
> **Human modification:** Deovandski reviews and requests changes (for example, he rejected a generated hex map and replaced it with hand-drawn circles).
> **Accountability:** Deovandski Skibinski Junior.

## File by file

| Path | Where it comes from | What the AI did |
|---|---|---|
| [README.md](README.md) | Follows the style and the permissions text of the main repo's README (human). | Wrote the new sections (what this repo is, West Marches, travel without math, the folder table, the AI disclosure link). |
| [LICENSE.md](LICENSE.md) | Copied unchanged from the main repo (human). | Copied it. |
| `.gitignore` | The main repo has none. | Written by the AI (OS clutter, editor backups, `node_modules/` for the handout build). |
| [World Lore](World%20Lore) (README + 17 files) | All facts come from the main repo's World Lore and the blog, both now in its [Legacy folder](https://github.com/Deovandski/HusbandOutWorld/tree/main/Legacy) (human). | **Condensed and reorganized** them into a shorter summary. The wording is AI; the facts are canon. |
| [D&D Campaign/README.md](D&D%20Campaign/README.md) (DM guide) | West Marches format (Ben Robbins' [original idea](https://arsludi.lamemage.com/?p=81)); the world (human). | Written by the AI. |
| [01 Travel by Circles](D&D%20Campaign/01%20-%20Travel%20by%20Circles.md) | **Concept by Deovandski:** circles on the map, each worth 1, 2 or 3 days, the DM chooses. The four daily shifts come from the original Alpha campaign. | Wrote the rules text, pace table, supplies and getting-lost rules. |
| [02 – 09](D&D%20Campaign) (Making an Adventurer, Soul Energy, Nari Gels, Death & Revival, Quest Board, Events, Dangerous Places, Factions) | Built on canon lore: peoples, prices, ranks, interfaces, nari gels, laws, revival, factions (human). | **Game design by the AI:** the D&D mechanics (traits, DCs, dice tables, Soul Points, revival debt amounts, sample quests, encounter tables). |
| [10 The Inside Job](D&D%20Campaign/10%20-%20The%20Inside%20Job%20%28Bandit%20Offer%29.md) | **Premise by Deovandski:** bandits offer the party a cut of the wagon; it might be a trap, guards might catch them, and they still have to talk their way past the Sanbi embassy. | Designed the tables and mechanics (go-betweens, cut, Deal roll, Heat, patrols, debrief, punishments). |
| [Alpha One-Shot - Wagon Escort](D&D%20Campaign/Alpha%20One-Shot%20-%20Wagon%20Escort.md) | **Original Alpha campaign by Deovandski.** | Edited: replaced distance and Egua-speed math with circles, switched to normal initiative, added links. |
| [DM Secrets](D&D%20Campaign/DM%20Secrets.md) | Canon secrets from the main repo and the novel notes (human). | Compiled and summarized them. |
| [Stat Blocks/Beasts](D&D%20Campaign/Stat%20Blocks/Beasts.md), [Fauna](D&D%20Campaign/Stat%20Blocks/Fauna.md) | **Original stat blocks by Deovandski.** | Added regions, loot and fixes ("Monica" → Monika), and new entries: Shapeshifter, Trunk People, Nari Worm, Flinga, Bruntos, White Roundies and the Hash template. |
| [Stat Blocks/People](D&D%20Campaign/Stat%20Blocks/People.md) | Canon characters and factions (human). | Written by the AI (guards, bandits, Kozaku Forway, The Stinger and others). |
| [Adventurers](D&D%20Campaign/Adventurers) | **Eight original pre-gens by Deovandski:** Harry, Magi, Fernan, Hiromi, July, Kaiana, Morika, Posaqui. | Adjusted them for the West March rules (people, interface, Soul Points). Rebuilt Hiromi as a Darfaries brawler to match the lore. **Takeo** is new: the AI built him from Hiromi's old interrogator kit. |
| [Maps](Maps) | World maps and art from the main repo (human). The circle travel map is being **hand-drawn by a human artist**. | Wrote the README. (A hex map the AI generated earlier was rejected and is not in the repo.) |
| [Handouts](Handouts) | Art by Mitsukiven and Feiourm from the main repo's Illustrations (emblems, Forway stamp, gemstone balls, nari stones, Kozaku Forway, Walking Flathead, Winga) and the Vraki font by Deovandski (human). Facts and prices from the rules above. | **Designed and wrote** all 16 handouts (HTML/CSS layout and in-world text), and wrote the render script that makes the PDF and images. Image work was limited to cropping, scaling, removing white backgrounds and mirroring one image. Sample news stories, classifieds, the bandit note and some contract clauses are invented flavor, not canon. |
| Website ([`index.html`](index.html), [site](site), `.nojekyll`) | Reads this repo's Markdown files as they are. Art by Mitsukiven and Feiourm and the Vraki font by Deovandski, reused from the Handouts folder (human). Third-party files, unmodified: [marked](https://github.com/markedjs/marked) (MIT License) and the TeX Gyre Schola and Heros Cn fonts (GUST Font License). | **Designed and coded by the AI:** the layout and look, and all the code (Markdown pages, search, dice tray, calculators, travel planner, fight and party trackers, campaign tracker, bestiary, random tables, saving and loading). The tools read stat blocks, encounter tables, quests and the Inside Job tables straight from the Markdown. For people entries without their own AC and HP, the site uses the 5e SRD block the entry names (Bandit, Veteran, Spy and so on). The site's own text (menus, help, labels) is AI-written. |
| [AI-DISCLOSURE.md](AI-DISCLOSURE.md) | — | Written by the AI. In November 2026 its links were updated when the main repo moved its originals into a Legacy folder, matching the main repo's own [AI disclosure](https://github.com/Deovandski/HusbandOutWorld/blob/main/AI-DISCLOSURE.md). |
| Links to the main repo (November 2026) | The main repo moved its original files into `Legacy/Behind The Scenes` and retired the blog. | Updated every link that pointed at the old paths or the blog, and regenerated the website's bundled copy of the pages. |

## Outside sources
The AI read these for ideas about West Marches play, handouts and AI disclosure. No text was copied from them.
- Ben Robbins, [Grand Experiments: West Marches](https://arsludi.lamemage.com/?p=81) (the original West Marches posts) · [West Marches](https://rpgmuseum.fandom.com/wiki/West_Marches) at the RPG Museum · [westmarches.games guide](https://www.westmarches.games/guide/resources)
- D&D Beyond, [New Player's Guide: How to Make Awesome Handouts](https://www.dndbeyond.com/posts/814-new-players-guide-how-to-make-awesome-handouts)
- IBM Research, [AI Attribution Toolkit](https://www.research.ibm.com/blog/AI-attribution-toolkit) · the Eclipse Foundation's [proposal for an AI_POLICY file in project repos](https://gitlab.eclipse.org/eclipsefdn/emo-team/emo-services/-/work_items/26)
- D&D 5e itself (Wizards of the Coast) provides the underlying game system: classes, spells and the monster and NPC stat blocks that these rules reskin.

## Contributing
PRs are welcome, with or without AI help. If you used AI for a contribution, say so in the PR description and add a line to the table above.

© Deovandski Skibinski Junior. Licensed under CC‑BY‑NC‑SA‑4.0.
