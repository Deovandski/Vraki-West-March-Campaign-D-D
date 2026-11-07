/* Vraki West March site: calculators, the adventurer tracker card (shared with the DM party),
   the player's own adventurers, and the handout gallery. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, uid, clamp, num, encPath } = VW.util;
  const store = VW.store;
  const app = VW.app;

  const BALLS = [
    { id: "sapphire", name: "Sapphire", short: "sa", pearls: 5000 },
    { id: "aquamarine", name: "Aquamarine", short: "aq", pearls: 500 },
    { id: "amethyst", name: "Amethyst", short: "am", pearls: 50 },
    { id: "pearl", name: "Pearl", short: "p", pearls: 1 }
  ];
  const ballImg = (id, size) => `<img class="ball" src="Handouts/source/assets/${id}.png" alt="" width="${size || 22}" height="${size || 22}">`;
  const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  function breakdown(pearls) {
    let rem = Math.max(0, Math.round(pearls));
    return BALLS.map((b) => { const n = Math.floor(rem / b.pearls); rem -= n * b.pearls; return { b, n }; });
  }
  const breakdownText = (pearls) => {
    const parts = breakdown(pearls).filter((x) => x.n);
    return parts.length ? parts.map((x) => x.n + " " + x.b.name.toLowerCase() + (x.n === 1 ? "" : "s")).join(", ") : "nothing";
  };
  const pb = (level) => 2 + Math.floor((clamp(level, 1, 20) - 1) / 4);
  const tierCost = (t) => (t <= 0 ? 1 : Math.pow(2, t - 1));
  VW.calc = { BALLS, ballImg, breakdown, breakdownText, pb, tierCost, fmt };

  /* ================= calculators ================= */
  const C0 = {
    money: { amount: 120, unit: "pearl", sapphire: 0, aquamarine: 0, amethyst: 3, pearl: 40 },
    travel: { circles: 5, pace: 2, party: 4 },
    revival: { level: 3, iced: false },
    pay: { reward: 5, unit: "amethyst", size: 4, owing: 1 },
    soul: { level: 3, con: 2, tier: 2, stones: 2, sp: 3 }
  };
  function calcState() {
    const s = store.state;
    if (!s.calc) s.calc = JSON.parse(JSON.stringify(C0));
    Object.keys(C0).forEach((k) => { s.calc[k] = Object.assign({}, C0[k], s.calc[k] || {}); });
    return s.calc;
  }

  const unitSelect = (bind, value) => `<select data-bind="${bind}">${BALLS.slice().reverse().map((b) => `<option value="${b.id}"${b.id === value ? " selected" : ""}>${b.name}${b.id === "pearl" ? "s" : "s"}</option>`).join("")}</select>`;
  const field = (label, inner, hint) => `<label class="f"><span class="f-label">${label}</span>${inner}${hint ? `<span class="f-hint">${hint}</span>` : ""}</label>`;
  const numIn = (bind, v, min, max, step) => `<input type="number" inputmode="decimal" data-bind="${bind}" value="${esc(v)}"${min != null ? ` min="${min}"` : ""}${max != null ? ` max="${max}"` : ""}${step ? ` step="${step}"` : ""}>`;

  function renderCalculators(m) {
    const c = calcState();
    m.innerHTML = `<div class="page wide tool">
      <h1>Calculators</h1>
      <p class="lede">Quick math for balls, travel, deadlines, revival debt and soul energy, using this campaign's rules. Change any number and the answer updates.</p>
      <div class="calc-grid">
        <section class="calc" aria-labelledby="c-money">
          <h2 id="c-money">Balls and change</h2>
          <div class="frow">${field("Amount", numIn("calc.money.amount", c.money.amount, 0))}${field("In", unitSelect("calc.money.unit", c.money.unit))}</div>
          <div class="out" id="o-money"></div>
          <h3>Count a purse</h3>
          <div class="purse">${BALLS.map((b) => field(ballImg(b.id) + b.name + "s", numIn("calc.money." + b.id, c.money[b.id], 0))).join("")}</div>
          <div class="out" id="o-purse"></div>
        </section>
        <section class="calc" aria-labelledby="c-travel">
          <h2 id="c-travel">Travel and quest deadline</h2>
          <div class="frow">${field("Circles to go", numIn("calc.travel.circles", c.travel.circles, 0))}
            ${field("Days per circle", `<select data-bind="calc.travel.pace" data-type="number">${[1, 2, 3].map((p) => `<option value="${p}"${+c.travel.pace === p ? " selected" : ""}>${p} (${["fast", "standard", "slow"][p - 1]})</option>`).join("")}</select>`)}
            ${field("People", numIn("calc.travel.party", c.travel.party, 1))}</div>
          <div class="out" id="o-travel"></div>
        </section>
        <section class="calc" aria-labelledby="c-rev">
          <h2 id="c-rev">Revival window and debt</h2>
          <div class="frow">${field("Character level", numIn("calc.revival.level", c.revival.level, 1, 20))}
            <label class="f check"><input type="checkbox" data-bind="calc.revival.iced"${c.revival.iced ? " checked" : ""}> <span>Body kept on ice</span></label></div>
          <div class="out" id="o-rev"></div>
        </section>
        <section class="calc" aria-labelledby="c-pay">
          <h2 id="c-pay">Splitting quest pay</h2>
          <div class="frow">${field("Reward", numIn("calc.pay.reward", c.pay.reward, 0))}${field("In", unitSelect("calc.pay.unit", c.pay.unit))}</div>
          <div class="frow">${field("Party size", numIn("calc.pay.size", c.pay.size, 1))}${field("How many owe revival debt", numIn("calc.pay.owing", c.pay.owing, 0))}</div>
          <div class="out" id="o-pay"></div>
        </section>
        <section class="calc" aria-labelledby="c-soul">
          <h2 id="c-soul">Soul Points and tiers</h2>
          <div class="frow">${field("Level", numIn("calc.soul.level", c.soul.level, 1, 20))}${field("Con modifier", numIn("calc.soul.con", c.soul.con, -5, 10))}</div>
          <div class="out" id="o-soul1"></div>
          <div class="frow">${field("Spell or ring tier", `<select data-bind="calc.soul.tier" data-type="number">${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => `<option value="${t}"${+c.soul.tier === t ? " selected" : ""}>${t === 0 ? "0 (cantrip ring)" : "Tier " + ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][t - 1]}</option>`).join("")}</select>`)}
            ${field("Nari stones on hand", numIn("calc.soul.stones", c.soul.stones, 0))}${field("Current SP", numIn("calc.soul.sp", c.soul.sp, 0))}</div>
          <div class="out" id="o-soul2"></div>
        </section>
      </div>
      <p class="muted">Rules used: <a href="${app.docHash("World Lore/03 - Money, Prices & Economy.md")}">money</a>, <a href="${app.docHash("D&D Campaign/01 - Travel by Circles.md")}">travel by circles</a>, <a href="${app.docHash("D&D Campaign/06 - Quest Board.md")}">quest board</a>, <a href="${app.docHash("D&D Campaign/05 - Death, Revival & Debt.md")}">death, revival &amp; debt</a>, <a href="${app.docHash("D&D Campaign/03 - Soul Energy, Interfaces & Sigil Rings.md")}">soul energy</a>.</p>
    </div>`;
    computeCalcs();
  }

  function computeCalcs() {
    const c = calcState();
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    // money
    const unit = BALLS.find((b) => b.id === c.money.unit) || BALLS[3];
    const total = num(c.money.amount) * unit.pearls;
    set("o-money", `<table class="mini"><tbody>${BALLS.map((b) => `<tr><th>${ballImg(b.id)} ${b.name}s</th><td>${fmt(total / b.pearls)}</td></tr>`).join("")}
      <tr><th>D&amp;D 5e</th><td>${fmt(total / 10)} gp (${fmt(total)} sp)</td></tr></tbody></table>
      <p>Paid with the fewest balls: <b>${breakdownText(total)}</b>.</p>`);
    const purse = BALLS.reduce((s, b) => s + num(c.money[b.id]) * b.pearls, 0);
    set("o-purse", `<p>Worth <b>${fmt(purse)} pearls</b> (${fmt(purse / 10)} gp). Exchanged up: ${breakdownText(purse)}.</p>`);
    // travel
    const n = Math.max(0, num(c.travel.circles)), p = clamp(num(c.travel.pace, 2), 1, 3), ppl = Math.max(1, num(c.travel.party, 1));
    const oneWay = n * p, round = oneWay * 2, deadline = Math.ceil(round * 1.5);
    set("o-travel", `<dl class="facts">
      <div><dt>One way</dt><dd><b>${VW.util.plural(oneWay, "day")}</b></dd></div>
      <div><dt>Round trip</dt><dd><b>${VW.util.plural(round, "day")}</b></dd></div>
      <div><dt>Quest deadline</dt><dd><b>${VW.util.plural(deadline, "day")}</b></dd></div>
      <div><dt>Rations, round trip</dt><dd><b>${fmt(round * ppl)}</b> <span class="muted">(about ${fmt(round * ppl * 2)}–${fmt(round * ppl * 5)} pearls)</span></dd></div>
      <div><dt>Winga mail there</dt><dd>about <b>${VW.util.plural(Math.max(1, Math.ceil(n / 3)), "day")}</b></dd></div></dl>
      <p class="muted">Deadline = round trip plus 50%, rounded up. Each shift of travel is one of four per day.</p>`);
    // revival
    const L = clamp(num(c.revival.level, 1), 1, 20);
    const win = (3 + L) * (c.revival.iced ? 2 : 1);
    set("o-rev", `<dl class="facts">
      <div><dt>Revival window</dt><dd><b>${VW.util.plural(win, "day")}</b></dd></div>
      <div><dt>Revival debt</dt><dd><b>${fmt(100 * L)} pearls</b> <span class="muted">(${breakdownText(100 * L)})</span></dd></div></dl>
      <p class="muted">Until it's paid, half of every quest reward goes to Forway. Die again while you owe and you're drafted into the Forway Guard.</p>`);
    // pay
    const pu = BALLS.find((b) => b.id === c.pay.unit) || BALLS[2];
    const R = num(c.pay.reward) * pu.pearls, k = Math.max(1, num(c.pay.size, 1)), owe = clamp(num(c.pay.owing), 0, k);
    const share = Math.floor(R / k), left = Math.round(R - share * k);
    const keep = Math.floor(share / 2);
    set("o-pay", `<dl class="facts">
      <div><dt>Each share</dt><dd><b>${fmt(share)} pearls</b> <span class="muted">(${breakdownText(share)})</span>${left ? `<br><span class="muted">${VW.util.plural(left, "pearl")} left over: buy a round</span>` : ""}</dd></div>
      ${owe ? `<div><dt>Each debtor keeps</dt><dd><b>${fmt(keep)} pearls</b>; Forway takes ${fmt(share - keep)} off their debt</dd></div>` : ""}
      <div><dt>If the quest fails</dt><dd><b>${fmt(Math.ceil(R * 0.1))} pearls</b> penalty</dd></div></dl>`);
    // soul
    const SL = clamp(num(c.soul.level, 1), 1, 20), maxSp = Math.max(1, pb(SL) + num(c.soul.con));
    set("o-soul1", `<p>Proficiency bonus <b>+${pb(SL)}</b>, so maximum Soul Points are <b>${maxSp}</b>. Regain 1 SP per long rest.</p>`);
    const t = clamp(num(c.soul.tier), 0, 9), cost = tierCost(t), have = num(c.soul.stones) + num(c.soul.sp);
    let best = -1; for (let i = 0; i <= 9; i++) if (tierCost(i) <= have) best = i;
    const roman = (i) => (i === 0 ? "a cantrip ring" : "Tier " + ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"][i - 1]);
    set("o-soul2", `<p>${roman(t)} costs <b>${VW.util.plural(cost, "nari stone")} or SP</b>. With ${fmt(have)} between stones and SP, ${have >= cost ? "you can cast it" + (Math.floor(have / cost) > 1 ? " " + Math.floor(have / cost) + " times" : "") : "you're " + (cost - have) + " short"}. ${best >= 0 ? "The biggest you can afford is " + roman(best) + "." : ""}</p>
      <p class="muted">A nari stone costs 1 amethyst, so ${roman(t)} burns about ${fmt(cost * 50)} pearls of stones.</p>`);
  }

  app.register("calculators", { title: "Calculators", nav: "Calculators", role: "player", order: 20, render: renderCalculators, onBind: computeCalcs });

  /* ================= adventurer card (players and the DM party) ================= */
  const STATUS = [["ok", "Fine"], ["down", "Down (dying)"], ["dead", "Dead"], ["revived", "Revived"], ["away", "Not on this trip"]];

  function blankMember(extra) {
    return Object.assign({
      id: uid("m"), name: "", player: "", people: "", cls: "", level: 1, rank: "Pearl",
      ac: 10, hp: 10, maxHp: 10, tempHp: 0, sp: 1, maxSp: 1, exhaustion: 0, conditions: "",
      debt: 0, status: "ok", diedOn: "", iced: false, notes: "",
      balls: { pearl: 0, amethyst: 0, aquamarine: 0, sapphire: 0 }
    }, extra || {});
  }

  function fromPregen(a) {
    return blankMember({ name: a.name, people: a.people, cls: a.cls, level: a.level, rank: a.rank || "Pearl", ac: a.ac, hp: a.hp, maxHp: a.hp, sp: a.sp, maxSp: a.sp, notes: "", source: a.path });
  }

  // base = state path to the member, e.g. "party.2"
  function memberCard(mb, base, opts) {
    opts = opts || {};
    const hpPct = mb.maxHp ? clamp((mb.hp / mb.maxHp) * 100, 0, 100) : 0;
    const spPips = Array.from({ length: Math.max(mb.maxSp || 0, mb.sp || 0) }, (_, i) =>
      `<button class="pip ${i < mb.sp ? "on" : ""}" data-action="m-sp-set" data-base="${base}" data-n="${i + 1}" aria-label="Set Soul Points to ${i + 1}"></button>`).join("");
    const exPips = Array.from({ length: 6 }, (_, i) =>
      `<button class="pip ex ${i < mb.exhaustion ? "on" : ""}" data-action="m-ex-set" data-base="${base}" data-n="${i + 1}" aria-label="Exhaustion level ${i + 1}"></button>`).join("");
    const window = (3 + num(mb.level, 1)) * (mb.iced ? 2 : 1);
    const idp = base.replace(/\W/g, "-");
    return `<article class="member status-${esc(mb.status)}" aria-label="${esc(mb.name || "Unnamed adventurer")}">
      <header class="m-head">
        <input class="m-name" id="${idp}-name" data-bind="${base}.name" value="${esc(mb.name)}" placeholder="Name Place Guild" aria-label="Name">
        <select data-bind="${base}.status" data-rerender aria-label="Status">${STATUS.map(([v, t]) => `<option value="${v}"${mb.status === v ? " selected" : ""}>${t}</option>`).join("")}</select>
        <button class="icon-btn small" data-action="m-remove" data-base="${base}" aria-label="Remove ${esc(mb.name || "this adventurer")}" title="Remove">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      </header>
      <div class="m-id">
        ${opts.player === false ? "" : `<label>Player<input data-bind="${base}.player" value="${esc(mb.player)}"></label>`}
        <label>People<input data-bind="${base}.people" value="${esc(mb.people)}"></label>
        <label>Class<input data-bind="${base}.cls" value="${esc(mb.cls)}"></label>
        <label class="n">Level<input type="number" min="1" max="20" data-bind="${base}.level" value="${esc(mb.level)}"></label>
        <label>Rank<select data-bind="${base}.rank">${["Pearl", "Amethyst", "Aquamarine", "Sapphire"].map((r) => `<option${mb.rank === r ? " selected" : ""}>${r}</option>`).join("")}</select></label>
        <label class="n">AC<input type="number" data-bind="${base}.ac" value="${esc(mb.ac)}"></label>
      </div>
      <div class="vital">
        <div class="v-row">
          <span class="v-label">HP</span>
          <input type="number" class="v-num" id="${idp}-hp" data-bind="${base}.hp" data-rerender value="${esc(mb.hp)}" aria-label="Current HP">
          <span class="slash">/</span>
          <input type="number" class="v-num" data-bind="${base}.maxHp" data-rerender value="${esc(mb.maxHp)}" aria-label="Max HP">
          <label class="temp">Temp<input type="number" class="v-num" data-bind="${base}.tempHp" data-rerender value="${esc(mb.tempHp || 0)}"></label>
        </div>
        <div class="hpbar" role="img" aria-label="${mb.hp} of ${mb.maxHp} HP"><span style="width:${hpPct}%"></span>${mb.tempHp ? `<i style="width:${clamp((mb.tempHp / (mb.maxHp || 1)) * 100, 0, 100)}%"></i>` : ""}</div>
        <div class="dmg">
          <input type="number" min="0" id="${idp}-amt" data-focus="${idp}-amt" placeholder="0" aria-label="Amount">
          <button class="btn small blood" data-action="m-dmg" data-base="${base}" data-amt="${idp}-amt">Damage</button>
          <button class="btn small" data-action="m-heal" data-base="${base}" data-amt="${idp}-amt">Heal</button>
        </div>
      </div>
      <div class="vital">
        <div class="v-row"><span class="v-label">Soul Points</span>
          <span class="pips">${spPips}</span>
          <span class="v-text">${esc(mb.sp)} / <input type="number" class="v-num tiny" data-bind="${base}.maxSp" data-rerender value="${esc(mb.maxSp)}" aria-label="Max Soul Points"></span>
          <button class="icon-btn small" data-action="m-sp" data-base="${base}" data-d="-1" aria-label="Spend 1 Soul Point">−</button>
          <button class="icon-btn small" data-action="m-sp" data-base="${base}" data-d="1" aria-label="Regain 1 Soul Point">+</button>
        </div>
        <div class="v-row"><span class="v-label">Exhaustion</span><span class="pips">${exPips}</span>
          <button class="link small" data-action="m-ex-set" data-base="${base}" data-n="0">clear</button></div>
      </div>
      ${mb.status === "dead" ? `<div class="deathbox">
        <label>Died on<input data-bind="${base}.diedOn" value="${esc(mb.diedOn)}" placeholder="e.g. Moacir 14th, or trip day 6"></label>
        <label class="check"><input type="checkbox" data-bind="${base}.iced" data-rerender${mb.iced ? " checked" : ""}> Body on ice</label>
        <p>Get the body to an embassy within <b>${VW.util.plural(window, "day")}</b>. Revival adds <b>${fmt(100 * num(mb.level, 1))} pearls</b> of debt${num(mb.debt) > 0 ? " — and they already owe, so dying again means the Forway Guard unless the party pays everything" : ""}.</p>
        <button class="btn small" data-action="m-revive" data-base="${base}">Revived at an embassy</button></div>` : ""}
      <div class="m-more">
        <label>Conditions<input data-bind="${base}.conditions" value="${esc(mb.conditions)}" placeholder="poisoned, frightened…"></label>
        <label class="n">Revival debt (pearls)<input type="number" min="0" data-bind="${base}.debt" value="${esc(mb.debt)}"></label>
      </div>
      ${opts.purse ? `<div class="purse small">${BALLS.map((b) => `<label>${ballImg(b.id, 18)}<span class="sr">${b.name}s</span><input type="number" min="0" data-bind="${base}.balls.${b.id}" value="${esc((mb.balls || {})[b.id] || 0)}" aria-label="${b.name}s"></label>`).join("")}</div>` : ""}
      <label class="m-notes">Notes<textarea rows="2" data-bind="${base}.notes">${esc(mb.notes)}</textarea></label>
    </article>`;
  }

  // Shared button handling for member cards. Returns true if it handled the action.
  function memberAction(a, el) {
    const base = el.dataset.base;
    if (!base) return false;
    const mb = store.getPath(base);
    if (!mb) return false;
    const amt = () => { const i = document.getElementById(el.dataset.amt); const v = Math.max(0, num(i && i.value)); return v; };
    switch (a) {
      case "m-dmg": damage(mb, amt()); break;
      case "m-heal": heal(mb, amt()); break;
      case "m-sp": mb.sp = clamp(num(mb.sp) + num(el.dataset.d), 0, Math.max(num(mb.maxSp), 0)); break;
      case "m-sp-set": mb.sp = mb.sp === +el.dataset.n ? +el.dataset.n - 1 : +el.dataset.n; break;
      case "m-ex-set": mb.exhaustion = mb.exhaustion === +el.dataset.n ? +el.dataset.n - 1 : +el.dataset.n; if (mb.exhaustion >= 6) mb.status = "dead"; break;
      case "m-revive":
        mb.status = "revived"; mb.hp = 1; mb.exhaustion = Math.min(6, num(mb.exhaustion) + 1);
        mb.debt = num(mb.debt) + 100 * num(mb.level, 1);
        VW.toast((mb.name || "They") + " are back, with " + fmt(100 * num(mb.level, 1)) + " pearls more debt.");
        break;
      case "m-remove": {
        if (!confirm("Remove " + (mb.name || "this adventurer") + "?")) return true;
        const parts = base.split(".");
        const idx = +parts.pop();
        store.getPath(parts.join(".")).splice(idx, 1);
        break;
      }
      default: return false;
    }
    store.save();
    app.rerender();
    return true;
  }

  function damage(mb, n) {
    if (!n) return;
    let left = n;
    const t = num(mb.tempHp);
    if (t) { const used = Math.min(t, left); mb.tempHp = t - used; left -= used; }
    mb.hp = Math.max(0, num(mb.hp) - left);
    if (mb.hp === 0 && (mb.status === "ok" || mb.status === "revived")) mb.status = "down";
  }
  function heal(mb, n) {
    if (!n) return;
    mb.hp = Math.min(num(mb.maxHp), num(mb.hp) + n);
    if (mb.hp > 0 && mb.status === "down") mb.status = "ok";
  }
  function longRest(mb) {
    if (mb.status === "dead" || mb.status === "away") return;
    mb.hp = num(mb.maxHp); mb.tempHp = 0;
    mb.sp = Math.min(num(mb.maxSp), num(mb.sp) + 1);
    mb.exhaustion = Math.max(0, num(mb.exhaustion) - 1);
    if (mb.status === "down") mb.status = "ok";
  }

  VW.members = { blankMember, fromPregen, memberCard, memberAction, damage, heal, longRest };

  /* ================= player: my adventurers ================= */
  async function renderMine(m) {
    const list = store.state.player.characters;
    const d = await VW.content.data();
    m.innerHTML = `<div class="page wide tool">
      <h1>My adventurers</h1>
      <p class="lede">Track your character between and during sessions: HP, Soul Points, exhaustion, balls and revival debt. It saves in this browser as you type.</p>
      <div class="toolbar">
        <button class="btn primary" data-action="pc-add">New adventurer</button>
        <label class="inline">Start from a pre-made one
          <select data-action="pc-pregen" id="pc-pregen"><option value="">Choose…</option>${d.adventurers.map((a, i) => `<option value="${i}">${esc(a.name)} (${esc(a.cls)})</option>`).join("")}</select></label>
        <button class="btn" data-action="pc-rest">Long rest</button>
      </div>
      ${list.length ? `<div class="members">${list.map((mb, i) => memberCard(mb, "player.characters." + i, { player: false, purse: true })).join("")}</div>`
        : `<div class="empty"><p>No adventurers yet. Make a new one, or start from one of the nine pre-made adventurers.</p></div>`}
    </div>`;
  }

  app.register("mine", {
    title: "My adventurers", nav: "My adventurers", role: "player", order: 10, playerOnly: true, render: renderMine,
    onAction(a, el) {
      if (VW.members.memberAction(a, el)) return;
      const list = store.state.player.characters;
      if (a === "pc-add") { list.push(blankMember()); store.save(); app.rerender(); }
      if (a === "pc-rest") { list.forEach(longRest); store.save(); app.rerender(); VW.toast("Long rest: HP restored, +1 SP, −1 exhaustion."); }
    },
    async onInput(el) {
      if (el.dataset.action === "pc-pregen" && el.value !== "") {
        const d = await VW.content.data();
        store.state.player.characters.push(fromPregen(d.adventurers[+el.value]));
        store.save();
        app.rerender();
      }
    }
  });

  /* ================= handout gallery ================= */
  async function renderHandouts(m) {
    let md = "";
    try { md = await VW.content.getDoc("Handouts/README.md"); } catch (e) {}
    const items = [];
    md.split("\n").forEach((l) => {
      if (!/^\|\s*\d/.test(l)) return;
      const cells = l.split("|").map((s) => s.trim());
      const when = VW.parse.stripMd(cells[3] || "");
      const re = /\[([^\]]+)\]\((images\/[^)]+)\)/g;
      let mm;
      while ((mm = re.exec(cells[2] || ""))) items.push({ title: mm[1].replace(/^back$/, "Contract (back)"), src: "Handouts/" + decodeURIComponent(mm[2]), when });
    });
    m.innerHTML = `<div class="page wide tool">
      <h1>Handouts and props</h1>
      <p class="lede">Printable props for the table: quest notices, wanted posters, a blood contract, badges and more. Print the whole set, or open one to show on screen.</p>
      <p><a class="btn primary" href="${encPath("Handouts/Vraki West March - Handouts.pdf")}" target="_blank" rel="noopener">Open the printable PDF</a>
        <a class="btn" href="${app.docHash("Handouts/README.md")}">How to use them</a></p>
      <ul class="gallery">${items.map((it) => `<li><a href="${encPath(it.src)}" target="_blank" rel="noopener"><img src="${encPath(it.src)}" alt="" loading="lazy"><span class="g-title">${esc(it.title)}</span></a><p>${esc(it.when)}</p></li>`).join("")}</ul>
      <p class="muted">Art by Mitsukiven &amp; Feiourm. © Deovandski Skibinski Junior, CC-BY-NC-SA-4.0.</p>
    </div>`;
  }
  app.register("handouts", { title: "Handouts", nav: null, role: "player", render: renderHandouts });
})();
