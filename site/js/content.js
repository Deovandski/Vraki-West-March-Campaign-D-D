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

  // The page in the chosen language (English where a piece isn't translated yet).
  async function getDocL(path) {
    const md = await getDoc(path);
    if (VW.i18n.lang === "en" || keptEnglish(path)) return md;
    await VW.i18n.loadDocs();
    return VW.i18n.translateMd(md);
  }
  // The license stays in English: it's the legal text (tools/i18n.js skips it too).
  const keptEnglish = (path) => path === "LICENSE.md";

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
      await VW.i18n.loadDocs();
      const get = (p) => getDoc(p).catch(() => "");
      const [beasts, fauna, people, events, quests, factions, inside, maps] = await Promise.all([
        get(D + "Stat Blocks/Beasts.md"), get(D + "Stat Blocks/Fauna.md"), get(D + "Stat Blocks/People.md"),
        get(D + "07 - Events & Encounters.md"), get(D + "06 - Quest Board.md"),
        get(D + "09 - Factions & Reputation.md"), get(D + "10 - The Inside Job (Bandit Offer).md"), get("Maps/README.md")
      ]);
      const src = { Beast: D + "Stat Blocks/Beasts.md", Fauna: D + "Stat Blocks/Fauna.md", Person: D + "Stat Blocks/People.md" };
      const creatures = [...P.parseBeasts(beasts), ...P.parseFauna(fauna), ...P.parsePeople(people)];
      creatures.forEach((c) => { c.id = P.slug(c.name); c.source = src[c.kind]; });
      const enc = P.parseEncounters(events);
      const advPaths = groups.find((g) => g.id === "pregens").docs.map((d) => d[0]).filter((p) => !/README/.test(p));
      const adventurers = (await Promise.all(advPaths.map((p) => get(p).then((md) => md && P.parseAdventurer(md, p))))).filter(Boolean);
      const ijTables = P.parseTables(inside);
      const pick = (re) => (ijTables.find((t) => re.test(t.heading)) || { rows: [] }).rows;
      return localize({
        creatures,
        byId: Object.fromEntries(creatures.map((c) => [c.id, c])),
        regions: enc.regions, rumors: enc.rumors, eventRoll: enc.eventRoll,
        quests: P.parseQuests(quests),
        factions: P.parseFactions(factions),
        adventurers,
        map: P.parseRoutes(maps),
        insideJob: {
          goBetween: pick(/go-between/i), cargo: pick(/in the wagon/i),
          value: pick(/^Cargo value/i), deal: pick(/Deal roll/i), heat: pick(/^Heat/i)
        }
      });
    })();
    return dataPromise;
  }

  /* ---------------- the tools' data in the chosen language ---------------- */
  // The tools read the English Markdown (so rules, names and save files stay the same in every language)
  // and show the translated pieces: each item gets a `label` (and translated text fields) beside its English.
  function localize(d) {
    const I = VW.i18n, P = VW.parse;
    const en = I.lang === "en";
    const tx = (raw) => (raw == null ? raw : en ? raw : I.tx(raw));
    const plain = (raw) => P.stripMd(tx(raw) || "");
    const name = (s) => (en ? s : nameL(s));
    const head = (h) => { const m = /^(.+?)\s*[(（]([^)）]*)[)）]\s*$/.exec(h); return m ? [m[1].trim(), m[2].trim()] : [h.trim(), ""]; };
    d.regions.forEach((r) => {
      const [label, places] = en ? [r.name, r.places] : head(plain(r.head));
      r.label = label; r.placesL = places; r.entriesL = r.entries.map((e) => tx(e));
    });
    d.rumorsL = en ? d.rumors : (() => { const r = P.splitRumors(d.rumorLines.map((l) => tx(l)).join(" ")); return r.length >= d.rumors.length ? r : d.rumors; })();
    Object.values(d.quests).forEach((list) => list.forEach((q) => {
      if (!q || q.titleL != null) return;
      if (en) { q.titleL = q.title; q.textL = q.text; return; }
      const t = tx(q.raw), m = /^\*\*(.+?)\*\*\s*[—–-]+\s*(.*)$/.exec(t);
      if (m) { q.titleL = m[1]; q.textL = P.stripMd(m[2]); } else { q.titleL = ""; q.textL = P.stripMd(t); }
    }));
    d.creatures.forEach((c) => {
      c.label = name(c.name);
      c.regionL = en ? c.region : (c.kind === "Fauna" ? plain(c.region) : nameL(c.region));
      c.lootL = en || !c.loot ? c.loot : c.kind === "Fauna" ? plain(c.loot) : P.stripMd(tx(c.lootRaw).replace(/^\*[^*]+\*[:：]?\s*/, ""));
      if (en) { c.traitsL = c.traits; return; }
      if (c.kind === "Fauna" && c.raw) {
        const t = tx(c.raw);
        c.traitsL = t !== c.raw ? [{ name: "", text: P.stripMd(t.split("\n").slice(1).join(" ")) }] : c.traits;
      } else c.traitsL = c.traits.map((tr) => (tr.raw ? (tx(tr.raw) !== tr.raw ? P.traitOf(tx(tr.raw)) : tr) : tr));
    });
    d.adventurers.forEach((a) => { a.label = name(a.name); a.clsL = en ? a.cls : nameL(a.cls); });
    d.factionsL = Object.fromEntries(d.factions.map((f) => [f, en ? f : plain(f)]));
    d.map.routes.forEach((r) => { r.fromL = name(r.from); r.toL = name(r.to); r.lookL = en ? r.look : plain(r.look); r.regionL = en ? r.region : plain(r.region); });
    d.map.edges.forEach((e) => { e.fromL = name(e.from); e.headingL = en ? e.heading : plain(e.heading); });
    const ij = d.insideJob;
    d.insideJobL = Object.fromEntries(Object.entries(ij).map(([k, rows]) => [k, rows.map((r) => r.map((c) => (en ? c : tx(c))))]));
    return d;
  }

  // A name in the chosen language: the glossary's spelling, or word by word ("Harry Sanbi").
  function nameL(s) {
    const I = VW.i18n;
    if (!s || I.lang === "en") return s;
    const whole = I.term(s);
    if (whole !== s) return whole;
    const tx = I.tx(s);
    if (tx !== s) return VW.parse.stripMd(tx);
    const parts = s.split(/(\s+|-)/);
    const mapped = parts.map((w) => (/^\s+$|^-$/.test(w) ? w : I.term(w)));
    if (mapped.every((w, i) => w !== parts[i] || /^\s+$|^-$/.test(w))) {
      const sep = (I.pack && I.pack.meta && I.pack.meta.name_sep) || " ";
      return mapped.filter((w) => !/^\s+$|^-$/.test(w)).join(sep);
    }
    return s;
  }

  VW.content = {
    groups, docs, folders, getDoc, getDocL, keptEnglish, data, nameL,
    get usingSnapshot() { return usingSnapshot; },
    allPaths: () => Object.keys(docs)
  };
})();
