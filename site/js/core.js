/* Vraki West March site: shared helpers, dice engine and the save state. */
(function () {
  "use strict";
  const VW = (window.VW = window.VW || {});

  /* ---------------- small helpers ---------------- */
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => (p || "x") + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const num = (v, d) => { const n = parseFloat(v); return isFinite(n) ? n : (d == null ? 0 : d); };
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");
  const plural = (n, one, many) => n + " " + (n === 1 ? one : (many || one + "s"));
  VW.util = { esc, uid, clamp, num, encPath, plural };

  /* ---------------- dice ---------------- */
  // crypto-backed die roll, 1..sides
  function die(sides) {
    if (sides <= 1) return 1;
    const buf = new Uint32Array(1);
    const max = Math.floor(0xffffffff / sides) * sides;
    let x;
    do { crypto.getRandomValues(buf); x = buf[0]; } while (x >= max);
    return (x % sides) + 1;
  }

  // Parses and rolls expressions like "2d6+3", "d20", "4d6kh3", "2d20kl1 - 1", "d%".
  // Returns { total, parts:[{text, rolls, kept, value}], expr } or throws on bad input.
  function roll(expr) {
    const clean = String(expr || "").toLowerCase().replace(/\s+/g, "").replace(/−|–/g, "-").replace(/d%/g, "d100");
    if (!clean) throw new Error("Type a roll, like 2d6+3.");
    if (!/^[+-]?(\d*d\d+(k[hl]\d+)?|\d+)([+-](\d*d\d+(k[hl]\d+)?|\d+))*$/.test(clean)) {
      throw new Error("That doesn't look like a roll. Try 2d6+3, d20, or 4d6kh3.");
    }
    const terms = clean.match(/[+-]?[^+-]+/g);
    let total = 0;
    const parts = [];
    terms.forEach((t) => {
      const sign = t[0] === "-" ? -1 : 1;
      const body = t.replace(/^[+-]/, "");
      const m = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/.exec(body);
      if (m) {
        const n = clamp(parseInt(m[1] || "1", 10), 1, 200);
        const sides = clamp(parseInt(m[2], 10), 1, 1000);
        const rolls = Array.from({ length: n }, () => die(sides));
        let kept = rolls.map((v, i) => i);
        if (m[3]) {
          const k = clamp(parseInt(m[4], 10), 0, n);
          const order = rolls.map((v, i) => [v, i]).sort((a, b) => (m[3] === "h" ? b[0] - a[0] : a[0] - b[0]));
          kept = order.slice(0, k).map((x) => x[1]);
        }
        const value = kept.reduce((s, i) => s + rolls[i], 0) * sign;
        total += value;
        parts.push({ text: (sign < 0 ? "−" : "") + body, rolls, kept, sides, value });
      } else {
        const value = parseInt(body, 10) * sign;
        total += value;
        parts.push({ text: (sign < 0 ? "−" : "+") + body, rolls: null, value });
      }
    });
    return { expr: String(expr).trim(), total, parts };
  }

  // Quiet roll used by the tools: returns a number (0 for bad input).
  function rollTotal(expr) { try { return roll(expr).total; } catch (e) { return 0; } }

  function describe(res) {
    return res.parts.map((p) => {
      if (!p.rolls) return p.text;
      const kept = p.rolls.filter((v, i) => p.kept.includes(i));
      const dropped = p.rolls.filter((v, i) => !p.kept.includes(i));
      return p.text + " [" + kept.join(", ") + (dropped.length ? "; dropped " + dropped.join(", ") : "") + "]";
    }).join(" ");
  }
  VW.dice = { die, roll, rollTotal, describe };

  /* ---------------- save state ---------------- */
  const KEY = "vraki-west-march:v1";
  const VERSION = 1;

  function blankState() {
    return {
      app: "vraki-west-march", version: VERSION, savedAt: null,
      role: "player",
      trips: [], currentTrip: null,
      party: [],
      campaign: {
        name: "My West March", date: { month: "Moacir", day: 1, year: 1042 },
        mood: 1, moodLog: [], heat: 0, reputation: {}, log: [], notes: ""
      },
      player: { characters: [] },
      diceLog: []
    };
  }

  let state = blankState();
  let timer = null;
  const listeners = new Set();
  let storageOk = true;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) state = upgrade(JSON.parse(raw));
    } catch (e) { storageOk = false; }
    return state;
  }

  // Fills in anything a saved file from an older version is missing.
  function upgrade(s) {
    const b = blankState();
    if (!s || typeof s !== "object") return b;
    const out = Object.assign(b, s);
    out.campaign = Object.assign(blankState().campaign, s.campaign || {});
    out.player = Object.assign(blankState().player, s.player || {});
    out.version = VERSION;
    return out;
  }

  function save(now) {
    clearTimeout(timer);
    const run = () => {
      state.savedAt = new Date().toISOString();
      try { localStorage.setItem(KEY, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
      listeners.forEach((fn) => fn(state));
    };
    if (now) run(); else timer = setTimeout(run, 350);
  }

  function exportFile() {
    state.savedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    const day = new Date().toISOString().slice(0, 10);
    a.download = (state.campaign.name || "west-march").replace(/[^\w-]+/g, "-").toLowerCase() + "-" + day + ".json";
    a.href = URL.createObjectURL(blob);
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function importText(text) {
    let data;
    try { data = JSON.parse(text); } catch (e) { throw new Error("That file isn't valid JSON."); }
    if (!data || data.app !== "vraki-west-march") throw new Error("That file isn't a Vraki West March save.");
    state = upgrade(data);
    save(true);
    return state;
  }

  function reset() { const role = state.role; state = blankState(); state.role = role; save(true); }

  // get/set by dotted path, e.g. "trips.0.name"
  function getPath(path, obj) {
    return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj || state);
  }
  function setPath(path, value, obj) {
    const keys = path.split(".");
    let o = obj || state;
    for (let i = 0; i < keys.length - 1; i++) {
      if (o[keys[i]] == null) o[keys[i]] = {};
      o = o[keys[i]];
    }
    o[keys[keys.length - 1]] = value;
  }

  VW.store = {
    get state() { return state; },
    load, save, exportFile, importText, reset, getPath, setPath,
    onSave: (fn) => listeners.add(fn),
    get storageOk() { return storageOk; }
  };

  /* ---------------- toast ---------------- */
  VW.toast = function (msg, kind) {
    let el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.className = "toast show" + (kind ? " " + kind : "");
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.className = "toast"; }, 3200);
  };
})();
