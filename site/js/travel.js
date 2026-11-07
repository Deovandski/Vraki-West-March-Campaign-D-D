/* Vraki West March site: the DM's travel planner.
   A trip is a row of circles (from the travel map). Each circle takes 1, 2 or 3 days (the DM's knob),
   each day has four shifts, and each shift can hold an event: quiet, a sign, an encounter,
   the Inside Job offer, or something the DM writes. Encounters come with a fight tracker. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, uid, clamp, num } = VW.util;
  const store = VW.store;
  const app = VW.app;
  const dice = VW.dice;

  /* ---------------- calendar ---------------- */
  const MONTHS = [["Asa", 85], ["Paulin", 110], ["Moacir", 85], ["Adrian", 85]];
  const WEEKDAYS = ["Freeday", "Tollday", "Sannday", "Gannday", "Forrday"];
  const ord = (n) => { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); };
  function addDays(date, n) {
    let mi = Math.max(0, MONTHS.findIndex((x) => x[0] === date.month));
    let d = clamp(num(date.day, 1), 1, MONTHS[mi][1]) + n, y = num(date.year, 1042);
    while (d > MONTHS[mi][1]) { d -= MONTHS[mi][1]; mi++; if (mi > 3) { mi = 0; y++; } }
    while (d < 1) { mi--; if (mi < 0) { mi = 3; y--; } d += MONTHS[mi][1]; }
    return { month: MONTHS[mi][0], day: d, year: y };
  }
  const fmtDate = (d, year) => d.month + " " + ord(d.day) + (year ? ", " + d.year + " A.G." : "");
  VW.calendar = { MONTHS, WEEKDAYS, addDays, fmtDate, ord };

  const SHIFTS = [
    { id: "graveyard", name: "Graveyard", time: "12am–6am", always: true },
    { id: "morning", name: "Morning", time: "6am–12pm" },
    { id: "afternoon", name: "Afternoon", time: "12pm–6pm" },
    { id: "night", name: "Night", time: "6pm–12am", always: true }
  ];
  const TYPES = [
    ["", "Not rolled"], ["quiet", "Quiet"], ["omen", "Sign or omen"], ["encounter", "Encounter"],
    ["insidejob", "Inside Job offer"], ["custom", "Your own event"]
  ];
  const typeName = (t) => (TYPES.find((x) => x[0] === t) || TYPES[0])[1];
  const PACE = { 1: "Fast", 2: "Standard", 3: "Slow" };

  /* ---------------- trip model ---------------- */
  function newTrip(data, name) {
    const c = store.state.campaign.date || { month: "Moacir", day: 1, year: 1042 };
    return {
      id: uid("t"), name: name || "New trip", from: "Forway", to: "",
      region: (data.regions[0] || {}).id || "", escort: false, valuable: false,
      rollDay: false, danger: false, mode: "shift",
      start: { month: c.month, day: c.day, year: c.year, weekday: "" },
      circles: Array.from({ length: 3 }, () => ({ id: uid("c"), pace: 2, region: "" })),
      events: {}, sel: null, departure: null, notes: ""
    };
  }
  function trip() {
    const s = store.state;
    return s.trips.find((t) => t.id === s.currentTrip) || null;
  }
  const keyOf = (cid, d, s) => cid + ":" + d + ":" + s;
  function dayList(t) {
    const out = [];
    let abs = 0;
    t.circles.forEach((c, ci) => {
      for (let d = 0; d < clamp(num(c.pace, 2), 1, 3); d++) out.push({ circle: c, ci, d, abs: abs++ });
    });
    return out;
  }
  const regionOf = (t, c) => (c && c.region) || t.region;
  function dateFor(t, abs) {
    const d = addDays(t.start, abs);
    const wi = WEEKDAYS.indexOf(t.start.weekday);
    return { date: d, weekday: wi >= 0 ? WEEKDAYS[(wi + abs) % 5] : "" };
  }
  function partySize() {
    const p = store.state.party.filter((m) => m.status !== "away" && m.status !== "dead");
    return p.length || 4;
  }

  /* ---------------- rolling events ---------------- */
  function regionById(data, id) { return data.regions.find((r) => r.id === id) || data.regions[0]; }

  function makeCombatants(data, text) {
    const out = [];
    VW.parse.spawnsFor(VW.parse.stripMd(text), data.creatures).forEach((sp) => {
      const n = Math.max(1, /d/.test(sp.count) ? dice.rollTotal(sp.count) : num(sp.count, 1));
      const base = (sp.hash ? "Hash " : "") + (sp.label || sp.ref.name.split(" / ")[0]);
      for (let i = 0; i < n; i++) {
        const hp = (sp.ref.hp || 10) * (sp.hash ? 2 : 1);
        out.push({ id: uid("k"), name: base + (n > 1 ? " " + (i + 1) : ""), ref: sp.ref.id, ac: sp.ref.ac || 10, hp, max: hp, init: "", cond: "", hash: !!sp.hash });
      }
    });
    return out;
  }

  function entryEvent(data, regionId, entryIdx, type) {
    const r = regionById(data, regionId);
    const text = r.entries[entryIdx] || "";
    const plain = VW.parse.stripMd(text);
    const title = plain.split(/\s+—\s+|\s\(|;\s|:\s/)[0];
    const ev = { type, region: r.id, entry: entryIdx, title: type === "omen" ? "Sign of: " + title : title, text: plain, notes: "", combatants: [], resolved: false, round: 1, turn: 0 };
    if (type === "encounter") {
      if (/^roll twice/i.test(plain)) {
        const picks = [];
        while (picks.length < 2) { const i = dice.die(r.entries.length - 1) - 1; if (!picks.includes(i)) picks.push(i); }
        const a = picks.map((i) => VW.parse.stripMd(r.entries[i]));
        ev.title = "Two things at once";
        ev.text = "Rolled twice: (1) " + a[0] + " (2) " + a[1];
        ev.combatants = picks.flatMap((i) => makeCombatants(data, r.entries[i]));
      } else ev.combatants = makeCombatants(data, text);
    } else if (type === "omen") {
      ev.text = "Something hints at this: " + plain + " (tracks, smoke, a rumor, a corpse).";
    }
    return ev;
  }

  // The event roll from Events & Encounters: d6, 1 = encounter, 2 = sign, 3–6 = nothing.
  function rollEvent(data, t, regionId) {
    const d6 = dice.die(6);
    const enc = t.danger ? 2 : 1;
    if (d6 <= enc) { const d12 = dice.die(12); const ev = entryEvent(data, regionId, d12 - 1, "encounter"); ev.roll = "d6 " + d6 + ", d12 " + d12; return ev; }
    if (d6 === enc + 1) { const d12 = dice.die(12); const ev = entryEvent(data, regionId, d12 - 1, "omen"); ev.roll = "d6 " + d6 + ", d12 " + d12; return ev; }
    return { type: "quiet", title: "Quiet", text: "Nothing happens. Describe the scenery, or the food.", notes: "", combatants: [], roll: "d6 " + d6, resolved: false };
  }

  function insideJobEvent(when) {
    return { type: "insidejob", title: "The Inside Job offer", text: (when || "") + "A go-between offers the party a cut for helping the bandits rob the cargo they're guarding.", notes: "", combatants: [], resolved: false, ij: {} };
  }

  function autofill(data, t) {
    let filled = 0;
    if (t.escort && !t.departure) {
      const d6 = dice.die(6), need = t.valuable ? 2 : 1;
      t.departure = { d6, offer: d6 <= need };
      if (d6 <= need && t.circles[0]) {
        const k = keyOf(t.circles[0].id, 0, "morning");
        t.events[k] = insideJobEvent("At departure, while the party preps. ");
        t.events[k].roll = "departure d6 " + d6;
        filled++;
      }
    }
    if (t.mode === "circle") {
      t.circles.forEach((c) => {
        const has = Object.keys(t.events).some((k) => k.startsWith(c.id + ":") && t.events[k] && t.events[k].type);
        if (has) return;
        const days = clamp(num(c.pace, 2), 1, 3);
        const d = dice.die(days) - 1, s = dice.die(2) === 1 ? "graveyard" : "night";
        t.events[keyOf(c.id, d, s)] = rollEvent(data, t, regionOf(t, c));
        filled++;
      });
    } else {
      dayList(t).forEach(({ circle, d }) => {
        SHIFTS.forEach((s) => {
          if (!s.always && !t.rollDay) return;
          const k = keyOf(circle.id, d, s.id);
          if (t.events[k] && t.events[k].type) return;
          t.events[k] = rollEvent(data, t, regionOf(t, circle));
          filled++;
        });
      });
    }
    return filled;
  }

  /* ---------------- rendering ---------------- */
  const regionOptions = (data, value, inheritLabel) =>
    (inheritLabel ? `<option value="">${esc(inheritLabel)}</option>` : "") +
    data.regions.map((r) => `<option value="${r.id}"${r.id === value ? " selected" : ""}>${esc(r.name)}</option>`).join("");

  function dotClass(ev) {
    if (!ev || !ev.type) return "none";
    return ev.type + (ev.resolved ? " done" : "");
  }

  async function render(m) {
    const data = await VW.content.data();
    const s = store.state;
    if (!s.trips.length) {
      m.innerHTML = `<div class="page wide tool travel">
        <h1>Travel planner</h1>
        <p class="lede">Lay out a trip circle by circle, the way the travel map draws it. Pick how many days each circle takes, roll the events the rules call for (or set them yourself), then run each shift: monsters, HP, initiative and notes.</p>
        <div class="empty"><p>No trips yet.</p><button class="btn primary" data-action="trip-new">Plan a trip</button></div></div>`;
      return;
    }
    let t = trip();
    if (!t) { s.currentTrip = s.trips[0].id; t = trip(); }
    const days = dayList(t);
    if (!t.sel || !days.some((x) => keyOf(x.circle.id, x.d, "graveyard").split(":").slice(0, 2).join(":") === t.sel.split(":").slice(0, 2).join(":"))) {
      t.sel = days.length ? keyOf(days[0].circle.id, 0, "graveyard") : null;
    }
    const [selCid] = (t.sel || "").split(":");
    const selCircle = t.circles.find((c) => c.id === selCid) || t.circles[0];
    const total = days.length, round = total * 2, deadline = Math.ceil(round * 1.5);
    const counts = { encounter: 0, omen: 0, insidejob: 0, custom: 0, open: 0 };
    Object.values(t.events).forEach((e) => { if (e && counts[e.type] != null) counts[e.type]++; if (e && e.type && e.type !== "quiet" && !e.resolved) counts.open++; });
    const end = total ? dateFor(t, total - 1) : null;

    m.innerHTML = `<div class="page wide tool travel">
      <div class="tool-head">
        <h1>Travel planner</h1>
        <div class="trip-pick">
          <label class="sr" for="trip-select">Trip</label>
          <select id="trip-select" data-action="trip-pick">${s.trips.map((x) => `<option value="${x.id}"${x.id === t.id ? " selected" : ""}>${esc(x.name || "Untitled trip")}</option>`).join("")}</select>
          <button class="btn" data-action="trip-new">New trip</button>
          <button class="btn quiet" data-action="trip-delete">Delete trip</button>
        </div>
      </div>

      <details class="trip-setup" ${Object.keys(t.events).length ? "" : "open"}>
        <summary>Trip settings</summary>
        <div class="setup-grid">
          <label class="f wide2"><span class="f-label">Trip name</span><input id="trip-name" data-bind="${tp(t)}.name" value="${esc(t.name)}" data-rerender></label>
          <label class="f"><span class="f-label">From</span><input data-bind="${tp(t)}.from" value="${esc(t.from)}"></label>
          <label class="f"><span class="f-label">To</span><input data-bind="${tp(t)}.to" value="${esc(t.to)}"></label>
          <label class="f wide2"><span class="f-label">Region (encounter table)</span><select data-bind="${tp(t)}.region" data-rerender>${regionOptions(data, t.region)}</select>
            <span class="f-hint">Circles can override this below, for trips that cross regions.</span></label>
          <div class="f"><span class="f-label">Circles on the map</span>
            <div class="stepper"><button class="icon-btn" data-action="circles" data-d="-1" aria-label="One circle fewer">−</button>
              <output aria-live="polite">${t.circles.length}</output>
              <button class="icon-btn" data-action="circles" data-d="1" aria-label="One more circle">+</button></div></div>
          <div class="f"><span class="f-label">Days per circle, all circles</span>
            <div class="seg" role="group" aria-label="Days per circle for every circle">${[1, 2, 3].map((p) => `<button data-action="pace-all" data-p="${p}" aria-pressed="${t.circles.every((c) => +c.pace === p)}">${p} <small>${PACE[p]}</small></button>`).join("")}</div></div>
          <div class="f wide2"><span class="f-label">First day of the trip</span>
            <div class="date-row">
              <select data-bind="${tp(t)}.start.month" data-rerender aria-label="Month">${MONTHS.map(([mo]) => `<option${t.start.month === mo ? " selected" : ""}>${mo}</option>`).join("")}</select>
              <input type="number" min="1" max="110" data-bind="${tp(t)}.start.day" data-rerender value="${esc(t.start.day)}" aria-label="Day">
              <input type="number" data-bind="${tp(t)}.start.year" data-rerender value="${esc(t.start.year)}" aria-label="Year"><span class="unit">A.G.</span>
              <select data-bind="${tp(t)}.start.weekday" data-rerender aria-label="Weekday"><option value="">Weekday (optional)</option>${WEEKDAYS.map((w) => `<option${t.start.weekday === w ? " selected" : ""}>${w}</option>`).join("")}</select>
            </div></div>
          <fieldset class="f wide2 checks"><legend class="f-label">How events are rolled</legend>
            <label><input type="radio" name="mode" value="shift" data-bind="${tp(t)}.mode"${t.mode !== "circle" ? " checked" : ""} data-rerender> Every Graveyard and Night shift</label>
            <label><input type="radio" name="mode" value="circle" data-bind="${tp(t)}.mode"${t.mode === "circle" ? " checked" : ""} data-rerender> Once per circle (faster for long trips)</label>
            <label><input type="checkbox" data-bind="${tp(t)}.rollDay"${t.rollDay ? " checked" : ""}> Roll Morning and Afternoon too</label>
            <label><input type="checkbox" data-bind="${tp(t)}.danger"${t.danger ? " checked" : ""}> Dangerous trip: encounters on 1–2 (slow country, night, loud or smelly party, valuable cargo)</label>
          </fieldset>
          <fieldset class="f wide2 checks"><legend class="f-label">Cargo</legend>
            <label><input type="checkbox" data-bind="${tp(t)}.escort"${t.escort ? " checked" : ""} data-rerender> This is a cargo escort (the Inside Job offer can happen)</label>
            <label><input type="checkbox" data-bind="${tp(t)}.valuable"${t.valuable ? " checked" : ""}> Valuable cargo (offer at departure on 1–2)</label>
            ${t.departure ? `<p class="muted">Departure roll: d6 ${t.departure.d6}, ${t.departure.offer ? "the offer comes before they leave." : "no offer at departure."} <button class="link" data-action="dep-clear">Roll again next fill</button></p>` : ""}
          </fieldset>
        </div>
      </details>

      <div class="trip-actions">
        <button class="btn primary" data-action="autofill">Roll events for empty shifts</button>
        <button class="btn" data-action="clear-events">Clear all events</button>
        <p class="trip-sum">${total ? `<b>${VW.util.plural(total, "day")}</b> one way · ${fmtDate(t.start)} to ${fmtDate(end.date)} · deadline <b>${VW.util.plural(deadline, "day")}</b> if they come back the same way · <b>${round * partySize()}</b> rations for ${partySize()} people` : "Add a circle to start."}</p>
        <p class="trip-sum muted">${VW.util.plural(counts.encounter, "encounter")}, ${VW.util.plural(counts.omen, "sign")}${counts.insidejob ? ", the Inside Job offer" : ""}${counts.custom ? ", " + counts.custom + " of your own" : ""}. ${counts.open} still to run.</p>
      </div>

      <ol class="route" aria-label="Circles on this trip">${t.circles.map((c, ci) => {
        const evs = []; for (let d = 0; d < c.pace; d++) SHIFTS.forEach((sh) => evs.push(t.events[keyOf(c.id, d, sh.id)]));
        const startAbs = t.circles.slice(0, ci).reduce((a, x) => a + num(x.pace, 2), 0);
        return `<li><button class="circle ${c.id === selCircle.id ? "on" : ""}" data-action="pick-circle" data-cid="${c.id}" aria-pressed="${c.id === selCircle.id}"
          aria-label="Circle ${ci + 1}, ${VW.util.plural(+c.pace, "day")}">
          <span class="c-num">${ci + 1}</span><span class="c-days">${VW.util.plural(+c.pace, "day")}</span>
          <span class="c-dots">${evs.map((e) => `<i class="${dotClass(e)}"></i>`).join("")}</span></button>
          <span class="c-date">${fmtDate(addDays(t.start, startAbs))}</span></li>`;
      }).join("")}</ol>

      ${selCircle ? renderCircle(data, t, selCircle) : ""}
      <div id="event-panel">${renderEvent(data, t)}</div>
      <label class="f trip-notes"><span class="f-label">Trip notes</span><textarea rows="3" data-bind="${tp(t)}.notes">${esc(t.notes)}</textarea></label>
    </div>`;
  }

  const tp = (t) => "trips." + store.state.trips.indexOf(t);

  function renderCircle(data, t, c) {
    const ci = t.circles.indexOf(c);
    const startAbs = t.circles.slice(0, ci).reduce((a, x) => a + num(x.pace, 2), 0);
    const r = regionById(data, regionOf(t, c));
    let rows = "";
    for (let d = 0; d < c.pace; d++) {
      const { date, weekday } = dateFor(t, startAbs + d);
      rows += `<div class="day"><div class="day-label"><b>Day ${startAbs + d + 1}</b><span>${fmtDate(date)}${weekday ? ", " + weekday : ""}</span></div>
        <div class="shifts">${SHIFTS.map((sh) => {
          const k = keyOf(c.id, d, sh.id);
          const ev = t.events[k];
          const on = t.sel === k;
          const label = ev && ev.type ? (ev.type === "quiet" ? "Quiet" : ev.title || typeName(ev.type)) : (sh.always || t.rollDay ? "Not rolled" : "—");
          return `<button class="shift ${sh.id} ${ev && ev.type ? "has " + ev.type : "unset"} ${ev && ev.resolved ? "done" : ""} ${on ? "on" : ""}" data-action="pick-shift" data-key="${k}" aria-pressed="${on}">
            <span class="s-name">${sh.name}<small>${sh.time}</small></span>
            <span class="s-ev">${esc(label)}</span>
            ${ev && ev.combatants && ev.combatants.some((x) => !x.partyId) ? `<span class="s-count">${VW.util.plural(ev.combatants.filter((x) => !x.partyId).length, "foe")}</span>` : ""}
          </button>`;
        }).join("")}</div></div>`;
    }
    return `<section class="circle-detail" aria-label="Circle ${ci + 1}">
      <div class="cd-head">
        <h2>Circle ${ci + 1} <span class="muted">of ${t.circles.length}</span></h2>
        <div class="seg small" role="group" aria-label="Days for this circle">${[1, 2, 3].map((p) => `<button data-action="pace" data-cid="${c.id}" data-p="${p}" aria-pressed="${+c.pace === p}">${VW.util.plural(p, "day")}</button>`).join("")}</div>
        <label class="inline">Region <select data-bind="${tp(t)}.circles.${ci}.region" data-rerender>${regionOptions(data, c.region, "Same as trip (" + regionById(data, t.region).name + ")")}</select></label>
        <input class="c-label" data-bind="${tp(t)}.circles.${ci}.label" value="${esc(c.label || "")}" placeholder="Label, like Long Bridge" aria-label="Label for this circle">
      </div>
      <p class="muted small">Encounters here use the ${esc(r.name)} table${r.places ? " (" + esc(r.places) + ")" : ""}.</p>
      ${rows}
    </section>`;
  }

  function locate(t, key) {
    const [cid, d, sh] = (key || "").split(":");
    const ci = t.circles.findIndex((c) => c.id === cid);
    if (ci < 0) return null;
    const abs = t.circles.slice(0, ci).reduce((a, x) => a + num(x.pace, 2), 0) + num(d);
    return { ci, d: num(d), shift: SHIFTS.find((x) => x.id === sh), abs, circle: t.circles[ci] };
  }

  function renderEvent(data, t) {
    const k = t.sel;
    const loc = locate(t, k);
    if (!loc) return "";
    const ev = t.events[k] || { type: "" };
    const base = tp(t) + ".events." + k;
    const { date, weekday } = dateFor(t, loc.abs);
    const regionId = ev.region || regionOf(t, loc.circle);
    const r = regionById(data, regionId);
    const has = !!t.events[k];
    return `<section class="event ${ev.type || "none"}" aria-labelledby="ev-h">
      <div class="ev-head">
        <h2 id="ev-h">Day ${loc.abs + 1}, ${loc.shift.name} <span class="muted">${loc.shift.time} · ${fmtDate(date)}${weekday ? ", " + weekday : ""}</span></h2>
        <div class="ev-tools">
          <button class="btn" data-action="ev-roll">Roll this shift</button>
          ${has ? `<button class="btn quiet" data-action="ev-clear">Clear</button>` : ""}
        </div>
      </div>
      <div class="ev-type seg" role="radiogroup" aria-label="What happens">${TYPES.map(([v, n]) => `<button role="radio" data-action="ev-type" data-type="${v}" aria-checked="${(ev.type || "") === v}">${n}</button>`).join("")}</div>
      ${ev.type ? `
        ${ev.type === "encounter" || ev.type === "omen" ? `
          <div class="frow ev-pick">
            <label class="f"><span class="f-label">Table</span><select data-action="ev-region" aria-label="Encounter table">${regionOptions(data, regionId)}</select></label>
            <label class="f grow"><span class="f-label">Entry</span><select data-action="ev-entry" aria-label="Table entry">
              <option value="">Pick an entry…</option>${r.entries.map((e, i) => `<option value="${i}"${ev.entry === i && ev.region === r.id ? " selected" : ""}>${i + 1}. ${esc(VW.parse.stripMd(e)).slice(0, 90)}</option>`).join("")}</select></label>
            <button class="btn" data-action="ev-d12">Roll d12</button>
          </div>` : ""}
        <div class="frow">
          <label class="f grow"><span class="f-label">Title</span><input data-bind="${base}.title" id="ev-title" value="${esc(ev.title || "")}" data-rerender></label>
          <label class="f check"><input type="checkbox" data-bind="${base}.resolved" data-rerender${ev.resolved ? " checked" : ""}> Done</label>
        </div>
        <label class="f"><span class="f-label">What the party sees</span><textarea rows="2" data-bind="${base}.text">${esc(ev.text || "")}</textarea></label>
        <label class="f"><span class="f-label">DM notes</span><textarea rows="2" data-bind="${base}.notes" placeholder="Who was on watch, what they did, loot, consequences…">${esc(ev.notes || "")}</textarea></label>
        ${ev.roll ? `<p class="muted small">Rolled: ${esc(ev.roll)}</p>` : ""}
        ${ev.type === "insidejob" ? renderInsideJob(data, ev, base) : ""}
        ${ev.type !== "quiet" ? renderCombat(data, t, ev, base) : ""}
      ` : `<p class="muted">Nothing set for this shift. Roll it, or pick what happens above.</p>`}
    </section>`;
  }

  /* ---------------- fight tracker ---------------- */
  function party(id) { return store.state.party.find((p) => p.id === id); }
  function combView(c) {
    if (c.partyId) {
      const p = party(c.partyId);
      if (!p) return null;
      return { name: p.name || "Unnamed", ac: p.ac, hp: p.hp, max: p.maxHp, temp: p.tempHp, isParty: true, status: p.status };
    }
    return { name: c.name, ac: c.ac, hp: c.hp, max: c.max, isParty: false };
  }
  function order(ev) {
    return ev.combatants.map((c, i) => ({ c, i })).sort((a, b) => {
      const ai = a.c.init === "" || a.c.init == null ? -999 : num(a.c.init), bi = b.c.init === "" || b.c.init == null ? -999 : num(b.c.init);
      return bi - ai || a.i - b.i;
    });
  }

  function renderCombat(data, t, ev, base) {
    const list = order(ev);
    const groups = { Beast: [], Fauna: [], Person: [] };
    data.creatures.forEach((c) => groups[c.kind].push(c));
    const inParty = new Set(ev.combatants.filter((c) => c.partyId).map((c) => c.partyId));
    const free = store.state.party.filter((p) => !inParty.has(p.id) && p.status !== "away");
    const shown = ev.show && ev.combatants.find((c) => c.id === ev.show);
    const turn = clamp(num(ev.turn), 0, Math.max(0, list.length - 1));
    return `<div class="combat">
      <div class="combat-head">
        <h3>Who's here</h3>
        ${list.length ? `<span class="round">Round ${num(ev.round, 1)}</span>
          <button class="btn small" data-action="cb-init">Roll initiative for monsters</button>
          <button class="btn small primary" data-action="cb-next">Next turn</button>
          <button class="btn small quiet" data-action="cb-reset">Reset round</button>` : ""}
      </div>
      ${list.length ? `<div class="table-wrap"><table class="combat-table">
        <thead><tr><th scope="col">Init</th><th scope="col">Name</th><th scope="col">AC</th><th scope="col">HP</th><th scope="col">Damage or heal</th><th scope="col">Conditions</th><th scope="col"><span class="sr">Remove</span></th></tr></thead>
        <tbody>${list.map(({ c, i }, pos) => {
          const v = combView(c);
          if (!v) return "";
          const pct = v.max ? clamp((v.hp / v.max) * 100, 0, 100) : 0;
          const down = v.hp <= 0;
          const cb = base + ".combatants." + i;
          const pb = c.partyId ? "party." + store.state.party.findIndex((p) => p.id === c.partyId) : null;
          return `<tr class="${pos === turn ? "turn" : ""} ${down ? "down" : ""} ${v.isParty ? "pc" : ""}">
            <td><input type="number" class="init" data-bind="${cb}.init" value="${esc(c.init)}" data-rerender aria-label="Initiative for ${esc(v.name)}"></td>
            <td class="nm">${v.isParty ? `<span class="pc-tag">Party</span> ${esc(v.name)}` :
              `<input class="cname" data-bind="${cb}.name" value="${esc(c.name)}" aria-label="Name">
               ${c.ref ? `<button class="link small" data-action="cb-show" data-id="${c.id}" aria-expanded="${ev.show === c.id}">stats</button>` : ""}`}</td>
            <td>${v.isParty ? esc(v.ac) : `<input type="number" class="ac" data-bind="${cb}.ac" value="${esc(c.ac)}" aria-label="AC">`}</td>
            <td class="hp"><div class="hpcell"><span><b>${esc(v.hp)}</b> / ${v.isParty ? esc(v.max) : `<input type="number" class="max" data-bind="${cb}.max" value="${esc(c.max)}" data-rerender aria-label="Max HP">`}${v.temp ? ` <small>+${v.temp} temp</small>` : ""}</span>
              <span class="hpbar"><span style="width:${pct}%"></span></span></div></td>
            <td class="dmg"><input type="number" min="0" id="amt-${c.id}" placeholder="0" aria-label="Amount for ${esc(v.name)}">
              <button class="btn small blood" data-action="cb-dmg" data-i="${i}" data-amt="amt-${c.id}">Dmg</button><button class="btn small" data-action="cb-heal" data-i="${i}" data-amt="amt-${c.id}">Heal</button></td>
            <td>${pb ? `<input data-bind="${pb}.conditions" value="${esc(party(c.partyId).conditions || "")}" aria-label="Conditions">` : `<input data-bind="${cb}.cond" value="${esc(c.cond || "")}" aria-label="Conditions">`}</td>
            <td><button class="icon-btn small" data-action="cb-remove" data-i="${i}" aria-label="Remove ${esc(v.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button></td>
          </tr>`;
        }).join("")}</tbody></table></div>` : `<p class="muted">No one yet. Add creatures from the stat blocks, a custom foe, or the party.</p>`}
      ${shown && data.byId[shown.ref] ? statBlock(data.byId[shown.ref], shown.hash) : ""}
      <div class="combat-add">
        <label class="f"><span class="f-label">Add a creature</span>
          <select id="cb-pick">${Object.entries(groups).map(([g, cs]) => `<optgroup label="${g === "Person" ? "People" : g === "Beast" ? "Beasts" : "Fauna"}">${cs.map((c) => `<option value="${c.id}">${esc(c.name)} (CR ${esc(c.cr)})</option>`).join("")}</optgroup>`).join("")}</select></label>
        <label class="f n"><span class="f-label">How many</span><input type="number" id="cb-count" value="1" min="1" max="30"></label>
        <label class="f check"><input type="checkbox" id="cb-hash"> Hash</label>
        <button class="btn" data-action="cb-add">Add</button>
        <button class="btn quiet" data-action="cb-custom">Add a custom foe</button>
        ${free.length ? `<button class="btn quiet" data-action="cb-party">Add the party (${free.length})</button>` : store.state.party.length ? "" : `<a class="btn quiet" href="#/t/party">Set up the party</a>`}
      </div>
    </div>`;
  }

  function statBlock(c, hash) {
    return `<div class="statblock" aria-label="Stat block for ${esc(c.name)}">
      <h4>${hash ? "Hash " : ""}${esc(c.name)} <span class="muted">CR ${esc(c.cr)}${hash ? " (+2-ish, Hash)" : ""} · ${esc(c.kind === "Person" ? "Person" : c.kind)}</span></h4>
      <p><b>AC</b> ${esc(c.ac)}${c.acNote ? " (" + esc(c.acNote) + ")" : ""} · <b>HP</b> ${hash ? c.hp * 2 : esc(c.hp)}${c.speed ? " · " + esc(c.speed) : ""}${c.statsFrom ? ` · <span class="muted">AC and HP from the 5e ${esc(c.statsFrom)}</span>` : ""}</p>
      ${c.region ? `<p class="muted">${esc(c.region)}</p>` : ""}
      <ul>${c.traits.map((tr) => `<li>${tr.name ? `<b>${esc(tr.name)}.</b> ` : ""}${linkDiceText(tr.text)}</li>`).join("")}</ul>
      ${hash ? "<p><b>Hash:</b> double HP, +2 to attack and damage, special abilities +1d6 damage and +2 save DCs, always hostile. Eating its meat gives 1 Exposure.</p>" : ""}
      ${c.loot ? `<p><b>Loot:</b> ${esc(c.loot)}</p>` : ""}
      <p class="small"><a href="${app.docHash(c.source, VW.parse.slug(c.name))}">Open in ${esc(c.source.split("/").pop().replace(".md", ""))}</a></p>
    </div>`;
  }
  // Escapes text and turns dice notation into roll buttons.
  function linkDiceText(s) {
    return esc(s).replace(/\b(\d*d(?:4|6|8|10|12|20|100)(?:[+−-]\d+)?)\b/g, (m) => `<button type="button" class="dice-link" data-action="roll" data-expr="${m.replace("−", "-")}">${m}</button>`);
  }
  VW.statBlock = statBlock;
  VW.linkDiceText = linkDiceText;

  /* ---------------- Inside Job helper ---------------- */
  const CUT = [20, 20, 30, 30, 40, 50]; // d6, from The Inside Job
  function rangeHit(cell, n) {
    const s = String(cell).replace(/\*/g, "");
    let m;
    if ((m = /(\d+)\s*or less/.exec(s))) return n <= +m[1];
    if ((m = /(\d+)\s*or more/.exec(s))) return n >= +m[1];
    if ((m = /(\d+)\s*[–-]\s*(\d+)/.exec(s))) return n >= +m[1] && n <= +m[2];
    return n === parseInt(s, 10);
  }
  function renderInsideJob(data, ev, base) {
    const ij = ev.ij || {};
    const T = data.insideJob;
    const show = (k, label) => ij[k] ? `<p><b>${label}:</b> ${esc(ij[k])}</p>` : "";
    const heat = num(store.state.campaign.heat);
    return `<div class="ij">
      <h3>Inside Job helper</h3>
      <p class="muted small">Rolls from <a href="${app.docHash("D&D Campaign/10 - The Inside Job (Bandit Offer).md")}">The Inside Job</a>. The Deal roll stays secret: only you see this page.</p>
      <div class="ij-buttons">
        <button class="btn small" data-action="ij" data-k="gobetween">Go-between (d8)</button>
        <button class="btn small" data-action="ij" data-k="cut">Their cut (d6)</button>
        <button class="btn small" data-action="ij" data-k="cargo">Cargo (d8)</button>
        <label class="inline small">Quest rank <select id="ij-rank">${T.value.map((r) => `<option>${esc(VW.parse.stripMd(r[0]))}</option>`).join("")}</select></label>
        <button class="btn small" data-action="ij" data-k="value">Cargo value</button>
        <button class="btn small" data-action="ij" data-k="pay">Payment (d6)</button>
        <label class="inline small">Deal modifier <input type="number" id="ij-mod" value="0" class="tiny"></label>
        <button class="btn small blood" data-action="ij" data-k="deal">Deal roll (d10, secret)</button>
      </div>
      ${show("gobetween", "Go-between")}${show("cut", "Cut")}${show("cargo", "Cargo")}${show("value", "Cargo value")}${show("pay", "Payment")}${show("deal", "What's really going on")}
      <div class="heat">
        <span><b>Heat</b> ${heat}</span>
        <button class="icon-btn small" data-action="heat" data-d="-1" aria-label="Lower Heat">−</button>
        <button class="icon-btn small" data-action="heat" data-d="1" aria-label="Raise Heat">+</button>
        <button class="btn small" data-action="patrol">Patrol roll (d6 &lt; Heat)</button>
        <span class="muted">Talking their way out: DC ${10 + 2 * heat}</span>
      </div>
      ${ij.patrol ? `<p>${esc(ij.patrol)}</p>` : ""}
    </div>`;
  }

  function insideJobRoll(data, ev, k) {
    ev.ij = ev.ij || {};
    const T = data.insideJob;
    const row = (rows, n) => rows.find((r) => rangeHit(r[0], n));
    const P = VW.parse.stripMd;
    if (k === "gobetween") { const n = dice.die(8), r = row(T.goBetween, n); ev.ij.gobetween = `${n}. ${P(r ? r[1] : "")}${r && r[2] ? " (" + P(r[2]) + ")" : ""}`; }
    if (k === "cut") { const n = dice.die(6); ev.ij.cut = `d6 ${n}: ${CUT[n - 1]}% of the cargo's value. Each successful DC 13 Persuasion adds 10% (max 60%).`; }
    if (k === "cargo") { const n = dice.die(8), r = row(T.cargo, n); ev.ij.cargo = `${n}. ${P(r ? r[1] : "")}${r && r[2] ? " (" + P(r[2]) + ")" : ""}`; }
    if (k === "value") {
      const rank = (document.getElementById("ij-rank") || {}).value;
      const r = T.value.find((x) => P(x[0]) === rank) || T.value[0];
      if (r) {
        const f = /(\d*d\d+)\s*×\s*(\d+)\s*(\w+)/.exec(P(r[2]));
        if (f) { const roll = dice.rollTotal(f[1]); ev.ij.value = `${rank}: ${f[1]} = ${roll}, × ${f[2]} = ${roll * +f[2]} ${f[3]} (honest reward: ${P(r[1])})`; }
      }
    }
    if (k === "pay") { const n = dice.die(6); ev.ij.pay = `d6 ${n}: ` + (n <= 4 ? "paid in balls at the hideout or a drop point." : "paid in goods from the cargo, which the party has to fence."); }
    if (k === "deal") {
      const mod = num((document.getElementById("ij-mod") || {}).value);
      const n = dice.die(10), tot = n + mod, r = row(T.deal, tot);
      ev.ij.deal = `d10 ${n}${mod ? (mod > 0 ? " + " : " − ") + Math.abs(mod) + " = " + tot : ""}: ${P(r ? r[1] : "")}`;
    }
  }

  /* ---------------- actions ---------------- */
  async function onAction(a, el) {
    const data = await VW.content.data();
    const s = store.state;
    let t = trip();
    const save = () => { store.save(); app.rerender(); };
    switch (a) {
      case "trip-new": {
        const nt = newTrip(data, "Trip " + (s.trips.length + 1));
        s.trips.push(nt); s.currentTrip = nt.id; save();
        setTimeout(() => { const i = document.getElementById("trip-name"); if (i) { i.focus(); i.select(); } }, 50);
        return;
      }
      case "trip-delete":
        if (!t || !confirm("Delete “" + (t.name || "this trip") + "” and all its events?")) return;
        s.trips.splice(s.trips.indexOf(t), 1); s.currentTrip = s.trips[0] ? s.trips[0].id : null; save(); return;
    }
    if (!t) return;
    const ev = t.events[t.sel];
    switch (a) {
      case "circles": {
        if (+el.dataset.d > 0) t.circles.push({ id: uid("c"), pace: t.circles.length ? t.circles[t.circles.length - 1].pace : 2, region: "" });
        else if (t.circles.length > 1) {
          const gone = t.circles[t.circles.length - 1];
          const used = Object.keys(t.events).some((k) => k.startsWith(gone.id + ":") && t.events[k] && t.events[k].type);
          if (used && !confirm("The last circle has events. Remove it anyway?")) return;
          t.circles.pop();
          Object.keys(t.events).forEach((k) => { if (k.startsWith(gone.id + ":")) delete t.events[k]; });
        }
        return save();
      }
      case "pace-all": t.circles.forEach((c) => { c.pace = +el.dataset.p; }); return save();
      case "pace": { const c = t.circles.find((x) => x.id === el.dataset.cid); if (c) c.pace = +el.dataset.p; return save(); }
      case "pick-circle": t.sel = keyOf(el.dataset.cid, 0, "graveyard"); return save();
      case "pick-shift": t.sel = el.dataset.key; store.save(); app.rerender().then(() => { const p = document.getElementById("event-panel"); if (p && p.getBoundingClientRect().top > innerHeight - 80) p.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); }); return;
      case "autofill": { const n = autofill(data, t); VW.toast(n ? "Rolled " + VW.util.plural(n, "shift") + "." : "Every shift that needs a roll already has one."); return save(); }
      case "clear-events":
        if (!Object.keys(t.events).length || !confirm("Clear every event on this trip, including fights and notes?")) return;
        t.events = {}; t.departure = null; return save();
      case "dep-clear": t.departure = null; return save();
      case "ev-roll": {
        const loc = locate(t, t.sel);
        if (ev && (ev.notes || (ev.combatants || []).length) && !confirm("Replace this shift's event? Its notes and fight go too.")) return;
        t.events[t.sel] = rollEvent(data, t, regionOf(t, loc.circle));
        return save();
      }
      case "ev-clear": delete t.events[t.sel]; return save();
      case "ev-type": {
        const type = el.dataset.type;
        if (!type) { delete t.events[t.sel]; return save(); }
        const cur = t.events[t.sel] || { notes: "", combatants: [], resolved: false };
        cur.type = type;
        if (type === "quiet") { cur.title = "Quiet"; cur.text = cur.text || "Nothing happens. Describe the scenery, or the food."; }
        if (type === "insidejob") Object.assign(cur, insideJobEvent(""), { notes: cur.notes, combatants: cur.combatants || [] });
        if (type === "custom") { cur.title = cur.title && cur.title !== "Quiet" ? cur.title : ""; }
        if ((type === "encounter" || type === "omen") && cur.entry == null) { cur.title = cur.title === "Quiet" ? "" : cur.title; }
        cur.combatants = cur.combatants || [];
        t.events[t.sel] = cur;
        save();
        if (type === "custom") setTimeout(() => { const i = document.getElementById("ev-title"); if (i) i.focus(); }, 50);
        return;
      }
      case "ev-d12": {
        const loc = locate(t, t.sel);
        const rid = (ev && ev.region) || regionOf(t, loc.circle);
        const n = dice.die(12);
        const keep = ev ? ev.notes : "";
        t.events[t.sel] = Object.assign(entryEvent(data, rid, n - 1, ev && ev.type === "omen" ? "omen" : "encounter"), { notes: keep, roll: "d12 " + n });
        return save();
      }
      case "cb-init": ev.combatants.forEach((c) => { if (!c.partyId) c.init = dice.die(20); }); ev.turn = 0; return save();
      case "cb-next": {
        const n = ev.combatants.length; if (!n) return;
        ev.turn = num(ev.turn) + 1; if (ev.turn >= n) { ev.turn = 0; ev.round = num(ev.round, 1) + 1; }
        return save();
      }
      case "cb-reset": ev.turn = 0; ev.round = 1; return save();
      case "cb-show": ev.show = ev.show === el.dataset.id ? null : el.dataset.id; return save();
      case "cb-remove": ev.combatants.splice(+el.dataset.i, 1); return save();
      case "cb-dmg": case "cb-heal": {
        const c = ev.combatants[+el.dataset.i];
        const input = document.getElementById(el.dataset.amt);
        const v = Math.max(0, num(input && input.value));
        if (!c || !v) return;
        if (c.partyId) { const p = party(c.partyId); if (p) (a === "cb-dmg" ? VW.members.damage : VW.members.heal)(p, v); }
        else c.hp = a === "cb-dmg" ? Math.max(0, num(c.hp) - v) : Math.min(num(c.max), num(c.hp) + v);
        return save();
      }
      case "cb-add": {
        const id = document.getElementById("cb-pick").value;
        const cnt = clamp(num(document.getElementById("cb-count").value, 1), 1, 30);
        const hash = document.getElementById("cb-hash").checked;
        const cr = data.byId[id];
        if (!cr) return;
        const existing = ev.combatants.filter((x) => x.ref === id).length;
        for (let i = 0; i < cnt; i++) {
          const hp = (cr.hp || 10) * (hash ? 2 : 1);
          ev.combatants.push({ id: uid("k"), name: (hash ? "Hash " : "") + cr.name.split(" / ")[0] + (cnt > 1 || existing ? " " + (existing + i + 1) : ""), ref: id, ac: cr.ac || 10, hp, max: hp, init: "", cond: "", hash });
        }
        return save();
      }
      case "cb-custom": ev.combatants.push({ id: uid("k"), name: "New foe", ref: "", ac: 12, hp: 10, max: 10, init: "", cond: "" }); return save();
      case "cb-party": {
        const inParty = new Set(ev.combatants.filter((c) => c.partyId).map((c) => c.partyId));
        s.party.filter((p) => !inParty.has(p.id) && p.status !== "away").forEach((p) => ev.combatants.push({ id: uid("k"), partyId: p.id, init: "" }));
        return save();
      }
      case "ij": insideJobRoll(data, ev, el.dataset.k); return save();
      case "heat": s.campaign.heat = Math.max(0, num(s.campaign.heat) + num(el.dataset.d)); return save();
      case "patrol": {
        const n = dice.die(6), h = num(s.campaign.heat);
        ev.ij = ev.ij || {};
        ev.ij.patrol = `Patrol roll d6 ${n} against Heat ${h}: ` + (n < h ? "a patrol finds them." : "no patrol today.");
        return save();
      }
    }
  }

  async function onInput(el) {
    const t = trip();
    const data = await VW.content.data();
    const a = el.dataset.action;
    if (a === "trip-pick") { store.state.currentTrip = el.value; store.save(); app.rerender(); return; }
    if (!t) return;
    const ev = t.events[t.sel];
    if (a === "ev-region" && ev) { ev.region = el.value; ev.entry = null; store.save(); app.rerender(); }
    if (a === "ev-entry" && ev && el.value !== "") {
      const loc = locate(t, t.sel);
      const rid = ev.region || regionOf(t, loc.circle);
      const keep = ev.notes;
      if ((ev.combatants || []).length && !confirm("Replace the creatures here with the ones from this entry?")) {
        const fresh = entryEvent(data, rid, +el.value, ev.type === "omen" ? "omen" : "encounter");
        Object.assign(ev, { region: rid, entry: +el.value, title: fresh.title, text: fresh.text });
      } else {
        t.events[t.sel] = Object.assign(entryEvent(data, rid, +el.value, ev.type === "omen" ? "omen" : "encounter"), { notes: keep });
      }
      store.save(); app.rerender();
    }
  }

  app.register("travel", { title: "Travel planner", nav: "Travel planner", role: "dm", order: 1, render, onAction, onInput });
  VW.travel = { SHIFTS, dayList, keyOf };
})();
