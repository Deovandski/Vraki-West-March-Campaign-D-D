/* Vraki West March site: Player 101 and DM 101.
   Picking "Player" or "DM" on the start page opens a short step-by-step guide: a bird's-eye view of
   what that person needs to do to get ready, with links to the pages and tools for each step.
   Progress saves in the browser, so coming back opens the first step not done yet. */
(function () {
  "use strict";
  const VW = window.VW;
  const { esc, encPath, clamp, num } = VW.util;
  const store = VW.store;
  const app = VW.app;
  const D = "D&D Campaign/";
  const doc = (path, label, primary) => ({ href: app.docHash(path), label, primary });
  const tool = (id, label, primary) => ({ href: "#/t/" + id, label, primary });
  const roll = (expr) => `<button type="button" class="dice-link" data-action="roll" data-expr="${expr}">${expr}</button>`;

  const GUIDES = {
    player: {
      kicker: "Player 101", title: "Get ready to play",
      lede: "Six steps from never heard of it to sitting at the table with an adventurer. Each one takes a few minutes; open the links when you need the details.",
      skip: { href: "#/t/mine", label: "my adventurers" },
      done: "You're ready. Grab a quest, sign in blood, and come back alive.",
      finish: [tool("mine", "My adventurers", true), doc(D + "06 - Quest Board.md", "Quest board"), tool("calculators", "Calculators")],
      steps: [
        { id: "world", short: "The world", title: "Get to know the world",
          why: "Vraki is the world of the #HusbandOutWorld light novels: soul energy instead of magic, killer trees, moody undead castles and a lot of bureaucracy.",
          todo: ["Read <b>The World at a Glance</b> (about five minutes).",
            "Heads up: the lore pages reveal secrets of the world. Stop at the overview if you want to discover things in play."],
          links: [doc("World Lore/01 - The World at a Glance.md", "The world at a glance", true), doc("World Lore/README.md", "All world lore")] },
        { id: "table", short: "How it works", title: "Learn how an open table works",
          why: "This is a West March: there's a pool of players, not a fixed party. Whoever signs up for a session is the party that day.",
          todo: ["Every session starts at a Forway <b>embassy</b> and should end back at one.",
            "The players pick where to go: a quest from the board, a rumor or a spot on the map.",
            "It's one shared world. Whatever your party kills, maps or angers stays that way for everyone."],
          links: [doc("README.md", "About this campaign", true), doc("World Lore/05 - Adventurers, Guilds & Professions.md", "Adventurers & guilds")] },
        { id: "make", short: "Your adventurer", title: "Make your adventurer",
          why: "Normal 5e character creation with a Vraki twist. You start at level 1 as a Pearl adventurer, unless the DM says otherwise.",
          todo: ["Pick a people: mixed-blood human, Darfaries, Wozefaries, Cruro and more. There are no elves or dwarves.",
            "Pick any class (magic is soul energy science) and a background.",
            "Your name is <b>NAME PLACE GUILD</b>. Starting money: class gear plus " + roll("2d4") + " × 10 pearls. Roll " + roll("1d6") + " for starting debt.",
            "In a hurry? Take one of the nine pre-made level 3 adventurers."],
          links: [doc(D + "02 - Making an Adventurer.md", "Making an adventurer", true), doc(D + "Adventurers/README.md", "Pre-made adventurers"), tool("mine", "Save it in My adventurers")] },
        { id: "rules", short: "House rules", title: "Learn what's different from normal 5e",
          why: "A handful of rules change how the game feels. Skim them now; the DM will remind you at the table.",
          todo: ["<b>Travel by circles:</b> count the circles on the map; each is 1, 2 or 3 days.",
            "<b>Soul Points</b> = proficiency bonus + Constitution modifier. Sigil rings and nari gels spend them.",
            "<b>Death:</b> get your body to an embassy in time and Forway revives you, then takes 50% of your quest pay until the debt is paid."],
          links: [doc(D + "01 - Travel by Circles.md", "Travel by circles", true), doc(D + "03 - Soul Energy, Interfaces & Sigil Rings.md", "Soul energy"), doc(D + "04 - Nari Gels & Gear.md", "Nari gels & gear"), doc(D + "05 - Death, Revival & Debt.md", "Death, revival & debt")] },
        { id: "quest", short: "Pick a quest", title: "Pick a quest and find a party",
          why: "Players drive a West March. Before a session, agree on a quest with whoever's free and tell the DM so they can prepare.",
          todo: ["Choose a quest at your rank (Pearl to start) from the quest board.",
            "Post a <b>Party Wanted</b> sign-up so others can join.",
            "Mind the deadline: the round trip in days, plus 50%."],
          links: [doc(D + "06 - Quest Board.md", "Quest board", true), tool("handouts", "Party Wanted and other handouts"), doc(D + "09 - Factions & Reputation.md", "Factions & reputation")] },
        { id: "play", short: "At the table", title: "Bring it to the table",
          why: "This site is your character sheet helper during play.",
          todo: ["Track HP, Soul Points, balls and debt in <b>My adventurers</b>.",
            "Any roll in the rules, like " + roll("2d6+3") + ", is a button; the dice tray has the rest.",
            "Your work saves in this browser. Use the save button at the top to download a file for another device.",
            "After the session, help fill in the expedition report so the next party knows what's out there."],
          links: [tool("mine", "My adventurers", true), tool("calculators", "Calculators"), { href: encPath("Handouts/images/16-Adventurers-Reference.jpg"), label: "One-page reference card", ext: true }] }
      ]
    },
    dm: {
      kicker: "DM 101", title: "Get ready to run the West March",
      lede: "Six steps to run your first session, and the loop you'll repeat before and after each one. Open the links when you need the details.",
      skip: { href: "#/t/travel", label: "the travel planner" },
      done: "You're ready. Put the quest board out and let the players choose.",
      finish: [tool("travel", "Travel planner", true), tool("party", "Party"), tool("campaign", "Campaign")],
      steps: [
        { id: "guide", short: "The DM guide", title: "Read the DM guide",
          why: "It sets the pitch and the six rules of an open table: a pool of players, players drive, start and end at an embassy, one shared world, real-ish time, rewards from the world.",
          todo: ["Read <b>How a West March runs</b> in the DM guide.",
            "Pick your in-world year (default: the 1040s A.G.) and who's alive.",
            "Skim the world at a glance if you don't know the series."],
          links: [doc(D + "README.md", "DM guide", true), doc("World Lore/01 - The World at a Glance.md", "The world at a glance")] },
        { id: "travel", short: "Travel & events", title: "Learn travel and events",
          why: "Travel is the heart of the game, and it has no math: circles on the map, and you turn the pace knob.",
          todo: ["Each circle is 1, 2 or 3 days (Fast, Standard, Slow). You choose, to make a trip shorter or longer.",
            "Each day has four shifts. Roll the event die on Graveyard and Night: " + roll("d6") + ", 1 is an encounter, 2 a sign of one.",
            "Encounters come from the d12 table for the region."],
          links: [doc(D + "01 - Travel by Circles.md", "Travel by circles", true), doc(D + "07 - Events & Encounters.md", "Events & encounters"), doc("Maps/README.md", "The travel map")] },
        { id: "danger", short: "Secrets & danger", title: "Learn the secrets and the dangers",
          why: "The world bites back. These pages are DM-only: players shouldn't read them.",
          todo: ["Dangerous places: Bahyum's Castle Mood, Hifuna exposure, the desert, the caverns.",
            "The Inside Job: on cargo escorts, bandits may offer the party a cut.",
            "Death, revival and debt, and how factions remember the party.",
            "DM secrets: the hidden truths of the world."],
          links: [doc(D + "08 - Dangerous Places.md", "Dangerous places", true), doc(D + "10 - The Inside Job (Bandit Offer).md", "The Inside Job"), doc(D + "05 - Death, Revival & Debt.md", "Death, revival & debt"), doc(D + "DM Secrets.md", "DM secrets")] },
        { id: "setup", short: "Set up", title: "Set up the campaign",
          why: "One shared world needs one shared record. Set it up once; every session adds to it.",
          todo: ["On the <b>Campaign</b> page: name it, set the in-world date, and start the Castle Mood, Heat and faction reputation.",
            "Print or share the handouts: quest board, Party Wanted, badge cards, the players' reference card.",
            "Keep a shared copy of the travel map to mark explored circles."],
          links: [tool("campaign", "Campaign", true), tool("handouts", "Handouts"), doc(D + "06 - Quest Board.md", "Quest board")] },
        { id: "prep", short: "Before a session", title: "Prepare a session",
          why: "The players tell you where they're going; you prep that trip.",
          todo: ["Add the adventurers who signed up on the <b>Party</b> page (pre-mades load in one click).",
            "Plan the trip in the <b>travel planner</b>: circles, days per circle, region, then roll the events.",
            "Look up the creatures you'll need in the bestiary.",
            "First session? The Alpha one-shot (a wagon escort) is ready to run."],
          links: [tool("travel", "Travel planner", true), tool("party", "Party"), tool("bestiary", "Bestiary"), doc(D + "Alpha One-Shot - Wagon Escort.md", "Alpha one-shot")] },
        { id: "run", short: "Run & wrap up", title: "Run it, then wrap it up",
          why: "Start at the embassy, run the trip shift by shift, and end with the party back somewhere safe.",
          todo: ["Open each shift in the travel planner to run it: creatures, HP, initiative and notes.",
            "Afterwards: write the session log, move the in-world date, and have the party fill in an expedition report.",
            "Download a save file now and then as a backup."],
          links: [tool("travel", "Travel planner", true), tool("campaign", "Session log"), tool("tables", "Random tables")] }
      ]
    }
  };

  function progress(who) {
    const s = store.state;
    s.ready = s.ready || {};
    s.ready[who] = s.ready[who] || {};
    return s.ready[who];
  }

  function render(m, params, who) {
    const g = GUIDES[who];
    const done = progress(who);
    const n = g.steps.length;
    const firstOpen = g.steps.findIndex((st) => !done[st.id]);
    const p = params && params.get("step");
    const i = p != null && p !== "" ? clamp(num(p, 1) - 1, 0, n) : (firstOpen < 0 ? n : firstOpen);
    const base = "#/t/start-" + who;
    const count = g.steps.filter((st) => done[st.id]).length;
    const link = (l) => `<a class="btn${l.primary ? " primary" : ""}" href="${l.href}"${l.ext ? ' target="_blank" rel="noopener"' : ""}>${esc(l.label)}</a>`;

    const rail = `<ol class="wz-steps" aria-label="Steps">${g.steps.map((st, k) =>
      `<li><a href="${base}?step=${k + 1}" class="${done[st.id] ? "done" : ""}"${k === i ? ' aria-current="step"' : ""}>
        <span class="wz-num">${done[st.id] ? "✓" : k + 1}</span><span class="wz-short">${esc(st.short)}</span></a></li>`).join("")}
      <li><a href="${base}?step=${n + 1}"${i === n ? ' aria-current="step"' : ""} class="${count === n ? "done" : ""}"><span class="wz-num">★</span><span class="wz-short">Ready</span></a></li></ol>`;

    let card;
    if (i < n) {
      const st = g.steps[i];
      card = `<section class="wz-card" aria-labelledby="wz-h">
        <p class="wz-count">Step ${i + 1} of ${n}</p>
        <h2 id="wz-h">${esc(st.title)}</h2>
        <p class="wz-why">${st.why}</p>
        <ul class="wz-todo">${st.todo.map((x) => `<li>${x}</li>`).join("")}</ul>
        <div class="btn-row wz-links">${st.links.map(link).join("")}</div>
        <div class="wz-nav">
          ${i > 0 ? `<a class="btn quiet" href="${base}?step=${i}">Back</a>` : "<span></span>"}
          <div class="wz-next">
            ${done[st.id] ? `<button class="btn quiet" data-action="wz-undo" data-id="${st.id}">Mark as not done</button>` : ""}
            <button class="btn primary" data-action="wz-done" data-id="${st.id}" data-next="${base}?step=${i + 2}">${done[st.id] ? "Next step" : "Done, next step"}</button>
          </div>
        </div>
      </section>`;
    } else {
      card = `<section class="wz-card wz-final" aria-labelledby="wz-h">
        <p class="wz-count">${count} of ${n} steps done</p>
        <h2 id="wz-h">${count === n ? esc(g.done) : "Almost there"}</h2>
        <ul class="wz-check">${g.steps.map((st, k) => `<li class="${done[st.id] ? "done" : ""}"><span aria-hidden="true">${done[st.id] ? "✓" : "○"}</span>
          <a href="${base}?step=${k + 1}">${esc(st.title)}</a>${done[st.id] ? "" : ' <span class="muted">(not done yet)</span>'}</li>`).join("")}</ul>
        <div class="btn-row">${g.finish.map(link).join("")}</div>
        <p class="wz-nav-end"><a class="btn quiet" href="${base}?step=${n}">Back</a>
          ${count ? `<button class="btn quiet" data-action="wz-reset">Start the guide over</button>` : ""}</p>
      </section>`;
    }

    m.innerHTML = `<div class="page wide tool wizard">
      <p class="wz-kicker">${esc(g.kicker)}</p>
      <h1>${esc(g.title)}</h1>
      <p class="lede">${esc(g.lede)}</p>
      ${rail}
      ${card}
      <p class="muted small wz-skip">Know your way around already? <a href="${g.skip.href}">Skip to ${esc(g.skip.label)}</a>.</p>
    </div>`;
  }

  function onAction(who) {
    return (a, el) => {
      const done = progress(who);
      if (a === "wz-done") { done[el.dataset.id] = true; store.save(); app.go(el.dataset.next); }
      if (a === "wz-undo") { delete done[el.dataset.id]; store.save(); app.rerender(); }
      if (a === "wz-reset") { store.state.ready[who] = {}; store.save(); app.go("#/t/start-" + who + "?step=1"); }
    };
  }

  app.register("start-player", { title: "Player 101", nav: "Player 101", role: "player", order: 0, playerOnly: true,
    render: (m, params) => render(m, params, "player"), onAction: onAction("player") });
  app.register("start-dm", { title: "DM 101", nav: "DM 101", role: "dm", order: 0,
    render: (m, params) => render(m, params, "dm"), onAction: onAction("dm") });
  VW.start = { GUIDES };
})();
