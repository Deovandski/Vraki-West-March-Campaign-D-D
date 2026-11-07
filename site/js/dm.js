/* Vraki West March site: DM pages for the party, campaign tracking, the bestiary and random tables. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, num, clamp } = VW.util;
  const store = VW.store;
  const app = VW.app;
  const dice = VW.dice;
  const M = VW.members;

  /* ================= party ================= */
  async function renderParty(m) {
    const d = await VW.content.data();
    const p = store.state.party;
    const active = p.filter((x) => x.status !== "away");
    m.innerHTML = `<div class="page wide tool">
      <h1>Party</h1>
      <p class="lede">Everyone on tonight's expedition. HP and conditions here are the same ones the travel planner's fights use, so damage you deal there shows up here.</p>
      <div class="toolbar">
        <button class="btn primary" data-action="p-add">Add an adventurer</button>
        <label class="inline">Add a pre-made one
          <select data-action="p-pregen"><option value="">Choose…</option>${d.adventurers.map((a, i) => `<option value="${i}">${esc(a.name)}, ${esc(a.cls)}</option>`).join("")}</select></label>
        <button class="btn" data-action="p-rest">Long rest for everyone</button>
      </div>
      ${p.length ? `<p class="muted">${active.length} on this trip · average level ${active.length ? (active.reduce((s, x) => s + num(x.level, 1), 0) / active.length).toFixed(1) : "–"} · ${active.filter((x) => num(x.debt) > 0).length} owe revival debt</p>
        <div class="members">${p.map((mb, i) => M.memberCard(mb, "party." + i, { purse: false })).join("")}</div>`
        : `<div class="empty"><p>No one in the party yet. Add the adventurers who showed up tonight, or start from the pre-made ones.</p></div>`}
    </div>`;
  }
  app.register("party", {
    title: "Party", nav: "Party", role: "dm", order: 2, render: renderParty,
    onAction(a, el) {
      if (M.memberAction(a, el)) return;
      if (a === "p-add") { store.state.party.push(M.blankMember()); store.save(); app.rerender(); }
      if (a === "p-rest") { store.state.party.forEach(M.longRest); store.save(); app.rerender(); VW.toast("Long rest: HP restored, +1 SP, −1 exhaustion for everyone still standing."); }
    },
    async onInput(el) {
      if (el.dataset.action === "p-pregen" && el.value !== "") {
        const d = await VW.content.data();
        store.state.party.push(M.fromPregen(d.adventurers[+el.value]));
        store.save(); app.rerender();
      }
    }
  });

  /* ================= campaign ================= */
  const MOODS = [
    ["Sleepy", "Quiet. Doors open; a new room appears 1 in 6."],
    ["Grumpy", "Walking Skin patrols inside. Quiet outside."],
    ["Restless", "Walking Flesh hunt intruders; traps arm. Stragglers on the plains."],
    ["Angry", "Rooms rearrange; a Walking Flathead wakes. Walking Skin packs raid nearby farms."],
    ["Furious", "Two Flatheads; soul-drain fog (1 SP per hour). The embassy posts an Aquamarine quest."],
    ["Rampage", "Everything awake. Waves of undead with five Flathead commanders. Kingdom Alert."]
  ];

  async function renderCampaign(m) {
    const d = await VW.content.data();
    const c = store.state.campaign;
    const date = c.date || { month: "Moacir", day: 1, year: 1042 };
    const facts = d.factions.length ? d.factions : [];
    const extra = Object.keys(c.reputation || {}).filter((k) => !facts.includes(k));
    const repRow = (f) => {
      const v = num((c.reputation || {})[f]);
      return `<li><span class="rep-name">${esc(f)}</span>
        <span class="rep-track" role="group" aria-label="Reputation with ${esc(f)}">${[-3, -2, -1, 0, 1, 2, 3].map((n) => `<button data-action="rep" data-f="${esc(f)}" data-n="${n}" aria-pressed="${v === n}" class="${n < 0 ? "neg" : n > 0 ? "pos" : "zero"}">${n > 0 ? "+" + n : n}</button>`).join("")}</span></li>`;
    };
    m.innerHTML = `<div class="page wide tool">
      <h1>Campaign</h1>
      <p class="lede">The shared world: today's date, Bahyum's Castle Mood, the Inside Job Heat, faction reputation and the session log.</p>
      <div class="camp-grid">
        <section class="panel">
          <h2>Campaign</h2>
          <label class="f"><span class="f-label">Name</span><input data-bind="campaign.name" value="${esc(c.name)}"></label>
          <div class="f"><span class="f-label">In-world date</span>
            <div class="date-row">
              <select data-bind="campaign.date.month" data-rerender aria-label="Month">${VW.calendar.MONTHS.map(([mo]) => `<option${date.month === mo ? " selected" : ""}>${mo}</option>`).join("")}</select>
              <input type="number" min="1" max="110" data-bind="campaign.date.day" data-rerender value="${esc(date.day)}" aria-label="Day">
              <input type="number" data-bind="campaign.date.year" data-rerender value="${esc(date.year)}" aria-label="Year"><span class="unit">A.G.</span>
            </div></div>
          <p class="today">${VW.calendar.fmtDate(date, true)}</p>
          <div class="btn-row"><button class="btn" data-action="day" data-d="-1">Back a day</button><button class="btn primary" data-action="day" data-d="1">Next day</button></div>
          <p class="muted small">Next day also rolls the Castle Mood, as the rules say to at the start of each day.</p>
        </section>

        <section class="panel mood">
          <h2>Today's Castle Mood</h2>
          <ol class="moods">${MOODS.map(([n, t], i) => `<li><button data-action="mood" data-n="${i + 1}" aria-pressed="${num(c.mood, 1) === i + 1}"><b>${i + 1}</b> ${n}</button><span>${t}</span></li>`).join("")}</ol>
          <div class="btn-row"><button class="btn" data-action="mood-roll">Roll the daily change (d6)</button></div>
          <p class="muted small">On a 1 the mood drops by 1; on a 6 it rises by 1. Parties fighting inside raise it by 1 each day. <a href="${app.docHash("D&D Campaign/08 - Dangerous Places.md", "bahyum-castle-the-castle-mood")}">Castle Mood rules</a></p>
          ${c.moodLog && c.moodLog.length ? `<ul class="log small">${c.moodLog.slice(0, 5).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
        </section>

        <section class="panel">
          <h2>Heat</h2>
          <p class="heat-big"><span>${num(c.heat)}</span></p>
          <div class="btn-row"><button class="btn" data-action="c-heat" data-d="-1">Lower</button><button class="btn" data-action="c-heat" data-d="1">Raise</button><button class="btn" data-action="c-patrol">Patrol roll</button></div>
          <p class="muted small">From <a href="${app.docHash("D&D Campaign/10 - The Inside Job (Bandit Offer).md", "heat")}">The Inside Job</a>. Once per day after a raid, a patrol finds the party if a d6 rolls under the Heat. Lying at the debrief or to guards: DC ${10 + 2 * num(c.heat)}.</p>
          ${c.patrol ? `<p>${esc(c.patrol)}</p>` : ""}
        </section>

        <section class="panel wide2">
          <h2>Faction reputation</h2>
          <p class="muted small">−3 hunted · −2 hostile · −1 distrusted · 0 unknown · +1 friendly · +2 trusted · +3 family. One step per session at most. <a href="${app.docHash("D&D Campaign/09 - Factions & Reputation.md")}">What each faction wants</a></p>
          <ul class="reps">${facts.concat(extra).map(repRow).join("")}</ul>
          <form class="inline-form" data-action="rep-add"><label class="sr" for="rep-new">Add a faction or guild</label><input id="rep-new" placeholder="Add a faction or guild"><button class="btn small">Add</button></form>
        </section>

        <section class="panel wide2">
          <h2>Session log</h2>
          <p class="muted small">The West March's shared memory. Write down where each party went and what changed in the world.</p>
          <form class="log-form" data-action="log-add">
            <input id="log-who" placeholder="Party (who went)" aria-label="Party">
            <input id="log-what" placeholder="What happened" aria-label="What happened">
            <button class="btn primary">Add entry</button>
          </form>
          ${(c.log || []).length ? `<ol class="session-log">${c.log.map((e, i) => `<li><span class="when">${esc(e.date)}</span><b>${esc(e.who)}</b> ${esc(e.what)} <button class="link small" data-action="log-del" data-i="${i}">remove</button></li>`).join("")}</ol>` : '<p class="muted">No entries yet.</p>'}
          <label class="f"><span class="f-label">Notes</span><textarea rows="4" data-bind="campaign.notes">${esc(c.notes || "")}</textarea></label>
        </section>
      </div>
    </div>`;
  }

  function moodRoll(c) {
    const n = dice.die(6), before = num(c.mood, 1);
    if (n === 1) c.mood = Math.max(1, before - 1);
    if (n === 6) c.mood = Math.min(6, before + 1);
    const msg = VW.calendar.fmtDate(c.date) + ": d6 " + n + (c.mood !== before ? ", mood " + before + " → " + c.mood + " (" + MOODS[c.mood - 1][0] + ")" : ", no change (" + MOODS[c.mood - 1][0] + ")");
    c.moodLog = [msg].concat(c.moodLog || []).slice(0, 20);
    return msg;
  }

  app.register("campaign", {
    title: "Campaign", nav: "Campaign", role: "dm", order: 3, render: renderCampaign,
    onAction(a, el) {
      const c = store.state.campaign;
      const done = () => { store.save(); app.rerender(); };
      if (a === "day") { c.date = VW.calendar.addDays(c.date, num(el.dataset.d)); if (+el.dataset.d > 0) VW.toast(moodRoll(c)); return done(); }
      if (a === "mood") { c.mood = +el.dataset.n; return done(); }
      if (a === "mood-roll") { VW.toast(moodRoll(c)); return done(); }
      if (a === "c-heat") { c.heat = Math.max(0, num(c.heat) + num(el.dataset.d)); return done(); }
      if (a === "c-patrol") { const n = dice.die(6); c.patrol = "d6 " + n + " against Heat " + num(c.heat) + ": " + (n < num(c.heat) ? "a patrol finds them." : "no patrol today."); return done(); }
      if (a === "rep") { c.reputation = c.reputation || {}; c.reputation[el.dataset.f] = +el.dataset.n; return done(); }
      if (a === "log-del") { c.log.splice(+el.dataset.i, 1); return done(); }
    },
    onSubmit(a, f, ev) {
      ev.preventDefault();
      const c = store.state.campaign;
      if (a === "rep-add") { const v = f.querySelector("input").value.trim(); if (v) { c.reputation = c.reputation || {}; if (c.reputation[v] == null) c.reputation[v] = 0; } }
      if (a === "log-add") {
        const who = document.getElementById("log-who").value.trim(), what = document.getElementById("log-what").value.trim();
        if (!who && !what) return;
        c.log = [{ date: VW.calendar.fmtDate(c.date, true), who, what }].concat(c.log || []);
      }
      store.save(); app.rerender();
    }
  });

  /* ================= bestiary ================= */
  let filt = { q: "", kind: "", open: "" };
  async function renderBestiary(m) {
    const d = await VW.content.data();
    const q = filt.q.toLowerCase();
    const list = d.creatures.filter((c) => (!filt.kind || c.kind === filt.kind) &&
      (!q || (c.name + " " + c.region + " " + c.traits.map((t) => t.name + " " + t.text).join(" ")).toLowerCase().includes(q)));
    const t = store.state.trips.find((x) => x.id === store.state.currentTrip);
    const canAdd = t && t.sel && t.events[t.sel] && t.events[t.sel].type && t.events[t.sel].type !== "quiet";
    const crNum = (cr) => { const s = String(cr); if (s.includes("/")) { const [x, y] = s.split("/"); return num(x) / (num(y) || 1); } return num(s); }; // "1/8" -> 0.125
    list.sort((a, b) => crNum(a.cr) - crNum(b.cr) || a.name.localeCompare(b.name));
    m.innerHTML = `<div class="page wide tool">
      <h1>Bestiary</h1>
      <p class="lede">Every stat block in the campaign: beasts, fauna and people. ${canAdd ? "Use “Add to the fight” to drop one into the shift that's open in the travel planner." : "Open a shift in the travel planner to add creatures to its fight from here."}</p>
      <div class="toolbar">
        <label class="inline"><span class="sr">Filter</span><input id="best-q" placeholder="Filter by name, region or ability" value="${esc(filt.q)}" data-action="best-q"></label>
        <div class="seg small" role="group" aria-label="Kind">${[["", "All"], ["Beast", "Beasts"], ["Fauna", "Fauna"], ["Person", "People"]].map(([v, n]) => `<button data-action="best-kind" data-k="${v}" aria-pressed="${filt.kind === v}">${n}</button>`).join("")}</div>
      </div>
      <div class="table-wrap"><table class="best">
        <thead><tr><th scope="col">Creature</th><th scope="col">CR</th><th scope="col">AC</th><th scope="col">HP</th><th scope="col">Where</th><th scope="col"></th></tr></thead>
        <tbody>${list.map((c) => `<tr class="${filt.open === c.id ? "open" : ""}">
          <th scope="row"><button class="link" data-action="best-open" data-id="${c.id}" aria-expanded="${filt.open === c.id}">${esc(c.name)}</button> <span class="kind">${c.kind === "Person" ? "Person" : c.kind}</span></th>
          <td>${esc(c.cr)}</td><td>${esc(c.ac)}</td><td>${esc(c.hp)}</td><td class="where">${esc(c.region || "")}</td>
          <td>${canAdd ? `<button class="btn small" data-action="best-add" data-id="${c.id}">Add to the fight</button>` : ""}</td></tr>
          ${filt.open === c.id ? `<tr class="sb-row"><td colspan="6">${VW.statBlock(c)}</td></tr>` : ""}`).join("")}</tbody></table></div>
      <p class="muted small">${list.length} of ${d.creatures.length} creatures. Read from the <a href="${app.docHash("D&D Campaign/Stat Blocks/Beasts.md")}">stat block pages</a>; people without their own AC and HP use the 5e block their entry names.</p>
    </div>`;
  }
  app.register("bestiary", {
    title: "Bestiary", nav: "Bestiary", role: "dm", order: 4, render: renderBestiary,
    async onAction(a, el) {
      if (a === "best-kind") { filt.kind = el.dataset.k; app.rerender(); }
      if (a === "best-open") { filt.open = filt.open === el.dataset.id ? "" : el.dataset.id; app.rerender(); }
      if (a === "best-add") {
        const d = await VW.content.data();
        const cr = d.byId[el.dataset.id];
        const t = store.state.trips.find((x) => x.id === store.state.currentTrip);
        const ev = t && t.events[t.sel];
        if (!cr || !ev) return;
        ev.combatants = ev.combatants || [];
        const n = ev.combatants.filter((x) => x.ref === cr.id).length;
        ev.combatants.push({ id: VW.util.uid("k"), name: cr.name.split(" / ")[0] + (n ? " " + (n + 1) : ""), ref: cr.id, ac: cr.ac || 10, hp: cr.hp || 10, max: cr.hp || 10, init: "", cond: "" });
        store.save();
        VW.toast(cr.name + " added to " + (t.name || "the trip") + ".");
      }
    },
    onInput(el) {
      if (el.dataset.action === "best-q") {
        filt.q = el.value;
        clearTimeout(this._t);
        this._t = setTimeout(() => app.rerender(), 180);
      }
    }
  });

  /* ================= random tables ================= */
  let gen = { rank: "Pearl", region: "", results: [] };
  async function renderGen(m) {
    const d = await VW.content.data();
    if (!gen.region) gen.region = (d.regions[0] || {}).id;
    m.innerHTML = `<div class="page wide tool">
      <h1>Random tables</h1>
      <p class="lede">Roll on the campaign's tables between sessions or at the table. Results stack up below until you clear them.</p>
      <div class="gen-grid">
        <section class="panel">
          <h2>Quest board</h2>
          <div class="seg small" role="group" aria-label="Rank">${Object.keys(d.quests).map((r) => `<button data-action="g-rank" data-r="${esc(r)}" aria-pressed="${gen.rank === r}">${esc(r)}</button>`).join("")}</div>
          <div class="btn-row"><button class="btn primary" data-action="g-quest">Roll a ${esc(gen.rank)} quest (d20)</button><button class="btn" data-action="g-board">Fill a board (4 quests)</button></div>
        </section>
        <section class="panel">
          <h2>Encounters</h2>
          <label class="f"><span class="f-label">Region</span><select data-action="g-region">${d.regions.map((r) => `<option value="${r.id}"${r.id === gen.region ? " selected" : ""}>${esc(r.name)}</option>`).join("")}</select></label>
          <div class="btn-row"><button class="btn primary" data-action="g-enc">Roll an encounter (d12)</button><button class="btn" data-action="g-event">Full event roll (d6, then d12)</button></div>
        </section>
        <section class="panel">
          <h2>Rumors</h2>
          <div class="btn-row"><button class="btn primary" data-action="g-rumor">Overheard in the tavern (d10)</button></div>
        </section>
        <section class="panel">
          <h2>Inside Job</h2>
          <div class="btn-row"><button class="btn primary" data-action="g-ij">Roll an offer</button></div>
          <p class="muted small">Go-between, cut, cargo and payment. Roll the secret Deal roll in the travel planner when the party accepts.</p>
        </section>
      </div>
      <div class="results-head"><h2>Results</h2>${gen.results.length ? '<button class="link" data-action="g-clear">Clear</button>' : ""}</div>
      <ol class="gen-results">${gen.results.map((r) => `<li><span class="g-kind">${esc(r.kind)}</span><span class="g-roll">${esc(r.roll)}</span><div>${r.html}</div></li>`).join("") || '<li class="muted">Nothing rolled yet.</li>'}</ol>
    </div>`;
  }
  function pushResult(kind, roll, html) { gen.results.unshift({ kind, roll, html }); gen.results = gen.results.slice(0, 30); }

  app.register("tables", {
    title: "Random tables", nav: "Random tables", role: "dm", order: 5, render: renderGen,
    async onAction(a, el) {
      const d = await VW.content.data();
      const P = VW.parse;
      const quest = () => {
        const list = d.quests[gen.rank] || [];
        const n = dice.die(20), q = list[n - 1] || { title: "", text: "DM's choice." };
        pushResult(gen.rank + " quest", "d20 " + n, `${q.title ? "<b>" + esc(q.title) + "</b> — " : ""}${VW.linkDiceText(q.text)}`);
      };
      const region = d.regions.find((r) => r.id === gen.region) || d.regions[0];
      if (a === "g-rank") gen.rank = el.dataset.r;
      if (a === "g-quest") quest();
      if (a === "g-board") {
        // Four different quests: reroll repeats.
        const list = d.quests[gen.rank] || [], seen = new Set();
        let tries = 0;
        while (seen.size < 4 && tries++ < 60) {
          const n = dice.die(20), q = list[n - 1];
          if (!q || seen.has(q.title || q.text)) continue;
          seen.add(q.title || q.text);
          pushResult(gen.rank + " quest", "d20 " + n, `${q.title ? "<b>" + esc(q.title) + "</b> — " : ""}${VW.linkDiceText(q.text)}`);
        }
      }
      if (a === "g-enc") { const n = dice.die(12); pushResult(region.name, "d12 " + n, VW.linkDiceText(P.stripMd(region.entries[n - 1]))); }
      if (a === "g-event") {
        const e = dice.die(6);
        if (e === 1) { const n = dice.die(12); pushResult("Event: encounter", "d6 1, d12 " + n, VW.linkDiceText(P.stripMd(region.entries[n - 1]))); }
        else if (e === 2) { const n = dice.die(12); pushResult("Event: sign or omen", "d6 2, d12 " + n, "A hint of: " + VW.linkDiceText(P.stripMd(region.entries[n - 1]))); }
        else pushResult("Event: nothing", "d6 " + e, "Quiet. Describe the scenery, or the food.");
      }
      if (a === "g-rumor") { const n = dice.die(10); pushResult("Rumor", "d10 " + n, "“" + esc(d.rumors[n - 1] || "") + "”"); }
      if (a === "g-ij") {
        const T = d.insideJob;
        const g = dice.die(8), c = dice.die(6), cg = dice.die(8), pay = dice.die(6);
        const row = (rows, n) => rows.find((r) => parseInt(r[0], 10) === n) || [];
        pushResult("Inside Job offer", `d8 ${g}, d6 ${c}, d8 ${cg}, d6 ${pay}`,
          `<b>Go-between:</b> ${esc(P.stripMd(row(T.goBetween, g)[1] || ""))}. <b>Cut:</b> ${[20, 20, 30, 30, 40, 50][c - 1]}%. <b>Cargo:</b> ${esc(P.stripMd(row(T.cargo, cg)[1] || ""))}. <b>Payment:</b> ${pay <= 4 ? "balls at a drop point" : "goods from the cargo"}.`);
      }
      if (a === "g-clear") gen.results = [];
      app.rerender();
    },
    onInput(el) { if (el.dataset.action === "g-region") { gen.region = el.value; app.rerender(); } }
  });
})();
