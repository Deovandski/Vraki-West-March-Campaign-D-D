/* Vraki West March site: the list of pages, loading Markdown, and the data the tools read.
   Add a new .md file to the repo? Add a line for it below so it shows up in the menus and search. */
(function () {
  "use strict";
  const VW = (window.VW = window.VW || {});
  const D = "D&D Campaign/";
  const L = "World Lore/";

  // role: "player" pages show for everyone; "dm" pages show only in DM mode (players get a warning).
  const groups = [
    { id: "start", title: "Start here", role: "player", docs: [
      ["README.md", "About this campaign"],
      [D + "02 - Making an Adventurer.md", "Making an adventurer"],
      [L + "01 - The World at a Glance.md", "The world at a glance"],
      ["AI-DISCLOSURE.md", "AI disclosure"]
    ] },
    { id: "rules", title: "Player rules", role: "player", docs: [
      [D + "01 - Travel by Circles.md", "Travel by circles"],
      [D + "02 - Making an Adventurer.md", "Making an adventurer"],
      [D + "03 - Soul Energy, Interfaces & Sigil Rings.md", "Soul energy & sigil rings"],
      [D + "04 - Nari Gels & Gear.md", "Nari gels & gear"],
      [D + "05 - Death, Revival & Debt.md", "Death, revival & debt"],
      [D + "06 - Quest Board.md", "Quest board"],
      [D + "09 - Factions & Reputation.md", "Factions & reputation"]
    ] },
    { id: "pregens", title: "Adventurers", role: "player", docs: [
      [D + "Adventurers/README.md", "All pre-made adventurers"],
      [D + "Adventurers/Harry Sanbi.md", "Harry Sanbi"],
      [D + "Adventurers/Magi Blood Blue-Flower-Red-Bone.md", "Magi"],
      [D + "Adventurers/Fernan Blood Blue-Flower-Red-Bone.md", "Fernan"],
      [D + "Adventurers/Hiromi High-Gandew Tough-Hammer.md", "Hiromi"],
      [D + "Adventurers/Takeo Forway Tea-Drinkers.md", "Takeo"],
      [D + "Adventurers/July Forway Tea-Drinkers.md", "July"],
      [D + "Adventurers/Kaiana Forway Cliff-Jumper.md", "Kaiana"],
      [D + "Adventurers/Morika Tolerideme.md", "Morika"],
      [D + "Adventurers/Posaqui Sanbi.md", "Posaqui"]
    ] },
    { id: "lore", title: "World lore", role: "player", docs: [
      [L + "README.md", "Lore index"],
      [L + "01 - The World at a Glance.md", "The world at a glance"],
      [L + "02 - Time, Calendar & Units.md", "Time, calendar & units"],
      [L + "03 - Money, Prices & Economy.md", "Money, prices & economy"],
      [L + "04 - Law, Treaties & Embassies.md", "Law, treaties & embassies"],
      [L + "05 - Adventurers, Guilds & Professions.md", "Adventurers, guilds & professions"],
      [L + "06 - Races.md", "Races"],
      [L + "07 - Kingdoms.md", "Kingdoms"],
      [L + "08 - Cities.md", "Cities"],
      [L + "09 - Lands, Ruins & Villages.md", "Lands, ruins & villages"],
      [L + "10 - Factions.md", "Factions"],
      [L + "11 - Soul Energy & Interfaces.md", "Soul energy & interfaces"],
      [L + "12 - Nari Gels, Bombs & Stones.md", "Nari gels, bombs & stones"],
      [L + "13 - Beasts.md", "Beasts"],
      [L + "14 - Fauna & Flora.md", "Fauna & flora"],
      [L + "15 - History.md", "History"],
      [L + "16 - Notable People.md", "Notable people"],
      [L + "17 - Daily Life, Food & Festivals.md", "Daily life, food & festivals"]
    ] },
    { id: "dm", title: "Running the game", role: "dm", docs: [
      [D + "README.md", "DM guide"],
      [D + "07 - Events & Encounters.md", "Events & encounters"],
      [D + "08 - Dangerous Places.md", "Dangerous places"],
      [D + "10 - The Inside Job (Bandit Offer).md", "The Inside Job"],
      [D + "Alpha One-Shot - Wagon Escort.md", "Alpha one-shot: wagon escort"],
      [D + "DM Secrets.md", "DM secrets"]
    ] },
    { id: "stats", title: "Stat blocks", role: "dm", docs: [
      [D + "Stat Blocks/Beasts.md", "Beasts"],
      [D + "Stat Blocks/Fauna.md", "Fauna"],
      [D + "Stat Blocks/People.md", "People"]
    ] },
    { id: "more", title: "Maps & handouts", role: "player", docs: [
      ["Maps/README.md", "Maps"],
      ["Handouts/README.md", "Handouts guide"],
      ["site/README.md", "About this website"],
      ["LICENSE.md", "License"]
    ] }
  ];

  // Every page once, with its role (a page listed in a DM group is DM-only).
  const docs = {};
  groups.forEach((g) => g.docs.forEach(([path, title]) => {
    if (!docs[path]) docs[path] = { path, title, role: g.role, group: g.id };
  }));

  // Folder links inside the Markdown point at these pages.
  const folders = {
    "D&D Campaign": D + "README.md", "World Lore": L + "README.md", "Maps": "Maps/README.md",
    "D&D Campaign/Adventurers": D + "Adventurers/README.md", "D&D Campaign/Stat Blocks": D + "Stat Blocks/Beasts.md",
    "site": "site/README.md"
  };

  /* ---------------- loading Markdown ---------------- */
  const cache = {};
  let snapshotPromise = null;
  let usingSnapshot = false;

  function loadSnapshot() {
    if (!snapshotPromise) {
      snapshotPromise = new Promise((resolve) => {
        if (VW.snapshot) return resolve(VW.snapshot);
        const s = document.createElement("script");
        s.src = "site/snapshot.js";
        s.onload = () => resolve(VW.snapshot || { docs: {} });
        s.onerror = () => resolve({ docs: {} });
        document.head.appendChild(s);
      });
    }
    return snapshotPromise;
  }

  async function getDoc(path) {
    if (cache[path] != null) return cache[path];
    let text = null;
    if (location.protocol !== "file:") {
      try {
        const res = await fetch(VW.util.encPath(path), { cache: "no-cache" });
        if (res.ok) text = await res.text();
      } catch (e) { /* fall through to the bundled copy */ }
    }
    if (text == null) {
      const snap = await loadSnapshot();
      if (snap.docs && snap.docs[path] != null) { text = snap.docs[path]; usingSnapshot = true; }
    }
    if (text == null) throw new Error("Couldn't load " + path + ".");
    cache[path] = text.replace(/\r\n?/g, "\n");
    return cache[path];
  }

  /* ---------------- data for the tools ---------------- */
  let dataPromise = null;
  function data() {
    if (dataPromise) return dataPromise;
    const P = VW.parse;
    dataPromise = (async () => {
      const get = (p) => getDoc(p).catch(() => "");
      const [beasts, fauna, people, events, quests, factions, inside] = await Promise.all([
        get(D + "Stat Blocks/Beasts.md"), get(D + "Stat Blocks/Fauna.md"), get(D + "Stat Blocks/People.md"),
        get(D + "07 - Events & Encounters.md"), get(D + "06 - Quest Board.md"),
        get(D + "09 - Factions & Reputation.md"), get(D + "10 - The Inside Job (Bandit Offer).md")
      ]);
      const src = { Beast: D + "Stat Blocks/Beasts.md", Fauna: D + "Stat Blocks/Fauna.md", Person: D + "Stat Blocks/People.md" };
      const creatures = [...P.parseBeasts(beasts), ...P.parseFauna(fauna), ...P.parsePeople(people)];
      creatures.forEach((c) => { c.id = P.slug(c.name); c.source = src[c.kind]; });
      const enc = P.parseEncounters(events);
      const advPaths = groups.find((g) => g.id === "pregens").docs.map((d) => d[0]).filter((p) => !/README/.test(p));
      const adventurers = (await Promise.all(advPaths.map((p) => get(p).then((md) => md && P.parseAdventurer(md, p))))).filter(Boolean);
      const ijTables = P.parseTables(inside);
      const pick = (re) => (ijTables.find((t) => re.test(t.heading)) || { rows: [] }).rows;
      return {
        creatures,
        byId: Object.fromEntries(creatures.map((c) => [c.id, c])),
        regions: enc.regions, rumors: enc.rumors, eventRoll: enc.eventRoll,
        quests: P.parseQuests(quests),
        factions: P.parseFactions(factions),
        adventurers,
        insideJob: {
          goBetween: pick(/go-between/i), cargo: pick(/in the wagon/i),
          value: pick(/^Cargo value/i), deal: pick(/Deal roll/i), heat: pick(/^Heat/i)
        }
      };
    })();
    return dataPromise;
  }

  VW.content = {
    groups, docs, folders, getDoc, data,
    get usingSnapshot() { return usingSnapshot; },
    allPaths: () => Object.keys(docs)
  };
})();
