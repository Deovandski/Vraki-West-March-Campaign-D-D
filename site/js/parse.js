/* Vraki West March site: turns the campaign's Markdown files into data the tools can use.
   Everything here reads the same .md files the repo already has, so the tools stay in sync
   with the rules. Works in the browser (window.VW.parse) and in Node (module.exports). */
(function (root) {
  "use strict";

  const norm = (md) => String(md || "").replace(/\r\n?/g, "\n");
  const slug = (s) => String(s).toLowerCase()
    .replace(/[‘’'"*_`]/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9À-ɏ]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const stripMd = (s) => String(s || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

  // "AC 14 · HP 110 · burrow 30 ft" -> { ac, acNote, hp, speed }
  function parseDefense(line) {
    const out = {};
    const ac = /AC\s*(\d+)\s*(\(([^)]*)\))?/.exec(line);
    if (ac) { out.ac = +ac[1]; if (ac[3]) out.acNote = ac[3]; }
    const hp = /HP\s*(\d+)/.exec(line);
    if (hp) out.hp = +hp[1];
    const rest = line.split("·").map((s) => s.trim())
      .filter((s) => s && !/^AC\b/.test(s) && !/^HP\b/.test(s));
    if (rest.length) out.speed = rest.join(", ");
    return out;
  }

  const CR = (s) => (s || "").replace("⅛", "1/8").replace("½", "1/2").replace("¼", "1/4").trim();

  /* ---------- Beasts.md: "## Name (CR x) — Region" + AC line + bullets ---------- */
  function parseBeasts(md) {
    const out = [];
    norm(md).split(/^## /m).slice(1).forEach((chunk) => {
      const lines = chunk.split("\n");
      const head = lines[0].trim();
      const m = /^(.+?)\s*\((?:CR\s*)?([^)]*)\)\s*(?:—\s*(.*))?$/.exec(head);
      if (!m) return;
      if (/template/i.test(m[2])) return; // the Hash template is applied, not fought
      const c = { name: m[1].trim(), cr: CR(m[2].replace(/,.*$/, "")), crNote: /,/.test(m[2]) ? m[2].split(",").slice(1).join(",").trim() : "", region: (m[3] || "").trim(), kind: "Beast", traits: [], loot: "" };
      lines.slice(1).forEach((l) => {
        l = l.trim();
        if (!l) return;
        if (/^AC\s*\d/.test(l)) Object.assign(c, parseDefense(l));
        else if (/^- \*Loot:\*/.test(l) || /^\*Loot:\*/.test(l)) c.loot = stripMd(l.replace(/^- /, "").replace(/^\*Loot:\*\s*/, ""));
        else if (/^- /.test(l)) c.traits.push(traitOf(l.slice(2)));
      });
      out.push(c);
    });
    return out;
  }

  function traitOf(s) {
    const m = /^\*\*([^*]+?)\.?\*\*\.?\s*(.*)$/.exec(s.trim());
    if (m) return { name: m[1].replace(/\.$/, ""), text: stripMd(m[2]) };
    return { name: "", text: stripMd(s) };
  }

  /* ---------- Fauna.md: table (region, loot) + "**Name (CR x)** — AC .. · HP ..\nTraits" ---------- */
  function parseFauna(md) {
    md = norm(md);
    const table = {};
    md.split("\n").forEach((l) => {
      const cells = l.split("|").map((s) => s.trim());
      if (cells.length >= 6 && cells[1] && !/^-+$/.test(cells[1]) && cells[1] !== "Creature") {
        table[cells[1]] = { region: cells[3], loot: cells[4] };
      }
    });
    const out = [];
    const re = /^\*\*(.+?)\s*\(CR\s*([^)]*)\)\*\*\s*—\s*(.*)\n([^\n]*)/gm;
    let m;
    while ((m = re.exec(md))) {
      const name = m[1].trim();
      const c = Object.assign({ name, cr: CR(m[2]), kind: "Fauna", traits: [], loot: "" }, parseDefense(m[3]));
      const t = table[name] || {};
      c.region = t.region || "";
      c.loot = t.loot || "";
      // Split "Trait: text. Trait two: text." into named traits where possible.
      const body = stripMd(m[4]);
      const parts = body.split(/(?<=\.)\s+(?=[A-Z][A-Za-z' -]{1,40}(?:\s\([^)]*\))?:)/);
      parts.forEach((p) => {
        const tm = /^([A-Z][A-Za-z' -]{1,40}(?:\s\([^)]*\))?):\s*(.*)$/.exec(p.trim());
        c.traits.push(tm ? { name: tm[1], text: tm[2] } : { name: "", text: p.trim() });
      });
      out.push(c);
    }
    return out;
  }

  /* ---------- People.md: sections; AC/HP lines or a base 5e block ---------- */
  // Base 5e SRD blocks mentioned by name in People.md, for entries with no AC/HP line of their own.
  const BASE = {
    "bandit": { ac: 12, hp: 11 }, "bandit captain": { ac: 15, hp: 65 }, "guard": { ac: 16, hp: 11 },
    "veteran": { ac: 17, hp: 58 }, "scout": { ac: 13, hp: 16 }, "thug": { ac: 11, hp: 32 },
    "spy": { ac: 12, hp: 27 }, "mage": { ac: 12, hp: 40 }, "commoner": { ac: 10, hp: 4 },
    "berserker": { ac: 13, hp: 67 }, "big winga": { ac: 15, hp: 95 }
  };
  function parsePeople(md) {
    const out = [];
    norm(md).split(/^## /m).slice(1).forEach((chunk) => {
      const lines = chunk.split("\n");
      const head = lines[0].trim();
      const body = lines.slice(1);
      const names = head.split(/\s+\/\s+/); // "Bandit (CR ⅛) / Bandit Captain (CR 2)"
      names.forEach((h) => {
        const m = /^(.+?)\s*\(CR\s*([^)]*)\)\s*(?:—\s*(.*))?$/.exec(h.trim());
        if (!m) return;
        const c = { name: m[1].trim(), cr: CR(m[2]), kind: "Person", region: "", traits: [], loot: "", base: "" };
        const note = (m[3] || "").trim();
        const useM = /use \*([^*]+)\*/i.exec(note);
        if (useM) c.base = useM[1];
        else if (note) c.region = note;
        body.forEach((l) => {
          l = l.trim();
          if (!l) return;
          if (/^AC\s*\d/.test(l)) Object.assign(c, parseDefense(l));
          else if (/^- /.test(l)) c.traits.push(traitOf(l.slice(2)));
          else if (!/^Use the 5e blocks/i.test(l)) c.traits.push({ name: "", text: stripMd(l) });
        });
        if (c.ac == null) {
          // Fall back to the base block named in the heading, the text, or the name itself.
          const text = (c.base + " " + body.join(" ")).toLowerCase();
          const key = [c.name.toLowerCase(), (c.base || "").toLowerCase()].find((k) => BASE[k]) ||
            Object.keys(BASE).sort((a, b) => b.length - a.length).find((k) => text.includes("*" + k + "*") || text.includes(" " + k + " stats"));
          if (key) { c.ac = BASE[key].ac; c.hp = BASE[key].hp; c.statsFrom = key.replace(/\b\w/g, (x) => x.toUpperCase()); }
        }
        out.push(c);
      });
    });
    return out;
  }

  /* ---------- Generic Markdown tables, tagged with the heading above them ---------- */
  function parseTables(md) {
    const lines = norm(md).split("\n");
    const tables = [];
    let heading = "";
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const h = /^#{1,6}\s+(.*)$/.exec(l);
      if (h) { heading = stripMd(h[1]); continue; }
      if (/^\s*\|/.test(l) && i + 1 < lines.length && /^\s*\|\s*:?-{2,}/.test(lines[i + 1])) {
        const row = (s) => s.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const head = row(l);
        const rows = [];
        i += 2;
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(row(lines[i])); i++; }
        i--;
        tables.push({ heading, head, rows });
      }
    }
    return tables;
  }

  /* ---------- 07 Events & Encounters: region tables (d12) and rumors (d10) ---------- */
  function parseEncounters(md) {
    md = norm(md);
    const regions = [];
    const part = md.split(/^## /m).find((s) => /^Region tables/i.test(s)) || "";
    part.split(/^### /m).slice(1).forEach((chunk) => {
      const lines = chunk.split("\n");
      const m = /^(.+?)\s*(?:\(([^)]*)\))?\s*$/.exec(lines[0].trim());
      const entries = [];
      lines.slice(1).forEach((l) => {
        const e = /^\s*(\d+)\.\s+(.*)$/.exec(l);
        if (e) entries[+e[1] - 1] = e[2].trim();
      });
      regions.push({ id: slug(m[1]), name: m[1].trim(), places: (m[2] || "").trim(), entries });
    });
    const rumors = [];
    const r = md.split(/^## /m).find((s) => /^Rumors/i.test(s));
    if (r) {
      const body = r.split("\n").slice(1).join(" ");
      const re = /(\d+)\.\s+(.*?)(?=\s+\d+\.\s+|$)/g;
      let m;
      while ((m = re.exec(body))) rumors[+m[1] - 1] = stripMd(m[2]).replace(/^"|"$/g, "");
    }
    // The event roll line, so the tool can quote it.
    const roll = (/\*\*Event roll \(d6\):\*\*(.*)/.exec(md) || [])[1] || "";
    return { regions, rumors, eventRoll: stripMd(roll) };
  }

  /* ---------- 06 Quest Board: sample quests by rank ---------- */
  function parseQuests(md) {
    md = norm(md);
    const ranks = {};
    const part = md.split(/^## /m).find((s) => /^Sample board/i.test(s)) || "";
    part.split(/^### /m).slice(1).forEach((chunk) => {
      const lines = chunk.split("\n");
      const rank = lines[0].trim();
      const list = [];
      lines.slice(1).forEach((l) => {
        const m = /^\s*(\d+(?:[–-]\d+)?)\.\s+(.*)$/.exec(l);
        if (!m) return;
        const t = /^\*\*(.+?)\*\*\s*—\s*(.*)$/.exec(m[2]);
        const item = t ? { title: t[1], text: stripMd(t[2]) } : { title: "", text: stripMd(m[2]) };
        const range = m[1].split(/[–-]/).map(Number);
        for (let n = range[0]; n <= (range[1] || range[0]); n++) list[n - 1] = item;
      });
      ranks[rank] = list;
    });
    return ranks;
  }

  /* ---------- Adventurer sheets ---------- */
  function parseAdventurer(md, path) {
    md = norm(md);
    const title = (/^#\s+(.*)$/m.exec(md) || [])[1] || "";
    const [name, rest] = title.split(/\s+—\s+/);
    const lvl = /Level\s+(\d+)/i.exec(rest || "");
    const field = (label) => { const m = new RegExp("\\*\\*" + label + ":\\*\\*\\s*([^·\\n]*)").exec(md); return m ? stripMd(m[1]).trim() : ""; };
    const ac = /\*\*AC\*\*\s*(\d+)/.exec(md), hp = /\*\*HP\*\*\s*(\d+)/.exec(md), sp = /\*\*Soul Points:\*\*\s*(\d+)/.exec(md);
    const abil = {};
    ["STR", "DEX", "CON", "INT", "WIS", "CHA"].forEach((k) => { const m = new RegExp("\\*\\*" + k + "\\*\\*\\s*(\\d+)").exec(md); if (m) abil[k] = +m[1]; });
    return {
      path, name: stripMd(name || "").trim(), level: lvl ? +lvl[1] : 1, summary: stripMd(rest || ""),
      people: field("People"), cls: field("Class"), rank: field("Rank").replace(/\s*\(.*$/, ""),
      ac: ac ? +ac[1] : 10, hp: hp ? +hp[1] : 10, sp: sp ? +sp[1] : 1, abilities: abil
    };
  }

  /* ---------- Factions & Reputation: faction names ---------- */
  function parseFactions(md) {
    const t = parseTables(md).find((x) => /^Faction$/i.test(x.head[0]));
    return t ? t.rows.map((r) => stripMd(r[0])).filter(Boolean) : [];
  }

  /* ---------- Who shows up: spot creatures and counts in an encounter line ---------- */
  // Words that point at a stat block even though the block has a different name.
  const ALIASES = [
    ["blue wozens", null], // the gang, not the animal: handled by "boss"/"bandits"
    ["boss", "bandit captain"], ["bandits", "bandit"], ["bandit", "bandit"],
    ["guard patrol", "forway guard"], ["guards", "forway guard"],
    ["toleridemian patrol", "tolerideme guard"], ["gandew guard", "gandew guard"],
    ["sanbi guards", "sanbi guard"], ["sundeath patrol", "gandew guard", "Sundeath guard"],
    ["night wozens", "wozen"], ["wozen pack", "wozen"], ["hash wozen", "wozen"], ["wozens", "wozen"],
    ["walking skin", "walking skin"], ["walking flesh", "walking flesh"], ["flatheads", "walking flathead"],
    ["wood people", "wood people"], ["hifuna people", "hifuna people"], ["trunk people", "trunk people"],
    ["sweet sting", "sweet sting"], ["sand worm", "sand worm"], ["sucker lady", "sucker lady"],
    ["crazed muckman", "crazed muckman"], ["muckman", "crazed muckman"], ["shapeshifter", "shapeshifter"],
    ["big winga", "big winga"], ["pink winga", "winga / pink winga"], ["winga", "winga / pink winga"],
    ["fanchaki", "fanchaki"], ["bagarisa", "bagarisa"], ["crocus", "crocus"], ["lansha", "lansha"],
    ["barina", "barina"], ["koalin", "koalin"], ["teefyro", "teefyro"], ["fatupari", "fatupari"],
    ["ptaina", "ptaina"], ["fihi", "fihi"], ["legunia", "legunia"], ["sayna", "sayna"], ["wooly", "wooly"],
    ["white roundies", "white roundies"], ["brunto", "bruntos"], ["flinga", "flinga"], ["egua", "egua"],
    ["monica swarm", "monica swarm"], ["cinika", "cinika"], ["soreno", "soreno"],
    ["darfaries \"dungeon party\"", "bandit", "Darfaries brawler"], ["smugglers", "bandit", "Smuggler"],
    ["cruro tribal hunters", "bandit", "Cruro hunter"], ["guild hunters", "bandit", "Sand Sea hunter"], ["hunters", "bandit", "Hunter"],
    ["aldemeri bandits", "bandit", "Aldemeri bandit"],
    ["red winga", "red winga agent"], ["fallen tree", "veteran"]
  ];
  const NONCOMBAT = /\b(corpse|dead adventurer|signal smoke|signs?|swap gossip|festival|recruiters|prayer|queue|toastmaster|journal|silence|symbol|stone glinting|driftwood|lighthouse|fog|sandstorm|storm|surge|mood rises|roll twice|science station|stray egua|interrogating|in trouble|playing|flock bolts|overhead|shadow overhead|stares)\b/i;

  function findCreature(text, byName) {
    const low = " " + text.toLowerCase() + " ";
    let best = null;
    ALIASES.forEach(([alias, target, label]) => {
      const i = low.indexOf(alias);
      if (i < 0) return;
      if (!best || i < best.i || (i === best.i && alias.length > best.alias.length)) best = { i, alias, target, label };
    });
    if (!best || !best.target) {
      // Fall back to any stat block name mentioned in the text.
      Object.keys(byName).forEach((k) => {
        const i = low.indexOf(k.split(" / ")[0]);
        if (i >= 0 && (!best || !best.target || i < best.i)) best = { i, alias: k, target: k };
      });
    }
    return best && best.target && byName[best.target] ? { c: byName[best.target], label: best.label || "" } : null;
  }

  // Returns [{ ref: creature, count: "2d4", hash: bool }] for an encounter line.
  function spawnsFor(text, creatures) {
    const byName = {};
    creatures.forEach((c) => { byName[c.name.toLowerCase()] = c; });
    const hash = /\bhash\b/i.test(text);
    const out = [];
    const paren = /\(([^)]*)\)/g;
    let m;
    while ((m = paren.exec(text))) {
      const inner = m[1];
      // "1 boss + 1d4+2 bandits", "2d4 Bagarisa", "1d4+1", "2"
      const pairs = inner.split(/\s\+\s|,\s*|\band\b/).map((s) => s.trim());
      pairs.forEach((p) => {
        const pm = /^(\d*d\d+(?:\s*[+-]\s*\d+)?|\d+)\s*(.*)$/.exec(p);
        if (!pm) return;
        const who = (pm[2] ? findCreature(pm[2], byName) : null) || findCreature(text.slice(0, m.index), byName) || findCreature(text, byName);
        if (who) out.push({ ref: who.c, label: who.label, count: pm[1].replace(/\s+/g, ""), hash });
      });
      if (out.length) return out;
    }
    if (NONCOMBAT.test(text)) return out;
    const who = findCreature(text, byName);
    if (who) out.push({ ref: who.c, label: who.label, count: /pair/i.test(text) ? "2" : /\b(pack|herd|swarm|flock|grove)\b/i.test(text) ? "1d4" : "1", hash });
    return out;
  }

  const api = { norm, slug, stripMd, parseBeasts, parseFauna, parsePeople, parseTables, parseEncounters, parseQuests, parseAdventurer, parseFactions, spawnsFor };
  root.VW = root.VW || {};
  root.VW.parse = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
