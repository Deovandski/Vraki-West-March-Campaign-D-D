/* Writes stats.json: facts about this build that the /debug/ page ("Stats for nerds", issue #34) reads, so the
   browser never has to work them out. The Pages workflow runs it last, on the folder it deploys:
     node tools/stats.js [folder]          (default: _site if it exists, else the repo itself)
   What's in it:
     code       which commit and pull request this build came from, when, and with which tools
     site       pages, languages, files and size of what gets deployed
     i18n       how much of each language is translated (the same counting as `node tools/i18n.js status`)
     campaign   what the campaign holds: pages per menu part, stat blocks, quests, handouts, maps, glossary names
   Commit, branch, pull request and repository are left out when the repo is private (GitHub Actions says so in
   its event file); a local build reads them from git.
   Adapted from Deovandski-repo-template's tools/stats.ts (#19, PR #20). */
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || (fs.existsSync(path.join(ROOT, "_site")) ? path.join(ROOT, "_site") : ROOT));
const env = process.env;
const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { return null; } };
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const git = (...args) => {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || null; } catch (e) { return null; }
};
const i18n = require("./i18n.js");

/* ---------------- code ---------------- */
const ci = env.GITHUB_ACTIONS === "true";
const event = env.GITHUB_EVENT_PATH ? readJson(env.GITHUB_EVENT_PATH) : null;
const isPrivate = ci ? !(event && event.repository && event.repository.private === false) : false; // unknown in CI counts as private
const commit = env.GITHUB_SHA || git("rev-parse", "HEAD");
const message = (event && event.head_commit && event.head_commit.message) || git("log", "-1", "--format=%B");
const subject = message ? message.split("\n")[0] : null;
// "Merge pull request #18 from …" (merge) or "Title (#18)" (squash).
const prMatch = subject && (subject.match(/Merge pull request #(\d+)/) || subject.match(/\(#(\d+)\)\s*$/));
const pr = prMatch ? Number(prMatch[1]) : null;
const remote = git("config", "--get", "remote.origin.url");
const remoteRepo = remote && remote.match(/github\.com[/:]([^/]+\/[^/.]+?)(\.git)?$/);
const repo = env.GITHUB_REPOSITORY || (remoteRepo && remoteRepo[1]) || null;
const repoUrl = repo ? (env.GITHUB_SERVER_URL || "https://github.com") + "/" + repo : null;
const tool = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim().split("\n")[0]; } catch (e) { return null; } };

const code = Object.assign({
  builtAt: new Date().toISOString(),
  builtBy: ci ? "GitHub Actions" : "local build",
  public: ci ? !isPrivate : null,
  run: ci ? Number(env.GITHUB_RUN_NUMBER) || null : null,
  runUrl: ci && !isPrivate && repoUrl && env.GITHUB_RUN_ID ? repoUrl + "/actions/runs/" + env.GITHUB_RUN_ID : null
}, isPrivate ? {} : {
  repo, repoUrl,
  branch: env.GITHUB_REF_NAME || git("rev-parse", "--abbrev-ref", "HEAD"),
  commit,
  commitUrl: repoUrl && commit ? repoUrl + "/commit/" + commit : null,
  commitDate: (event && event.head_commit && event.head_commit.timestamp) || git("log", "-1", "--format=%cI"),
  commitSubject: subject,
  pr,
  prUrl: repoUrl && pr ? repoUrl + "/pull/" + pr : null
}, {
  tools: {
    node: process.version,
    git: (tool("git", ["--version"]) || "").replace(/^git version /, "") || null,
    marked: ((read("site/vendor/marked.umd.js").match(/marked v?([\d.]+)/) || [])[1]) || null,
    playwright: (readJson(path.join(ROOT, "Handouts/source/node_modules/playwright/package.json")) || {}).version || null
  }
});

/* ---------------- site ---------------- */
const lang = i18n.languageStats();
let files = 0, bytes = 0;
const byType = {};
(function walk(dir) {
  for (const n of fs.readdirSync(dir)) {
    if (n.startsWith(".") || n === "node_modules") continue;
    const f = path.join(dir, n), st = fs.statSync(f);
    if (st.isDirectory()) { walk(f); continue; }
    files++; bytes += st.size;
    const ext = path.extname(n).slice(1).toLowerCase() || "(none)";
    const t = (byType[ext] = byType[ext] || { files: 0, bytes: 0 });
    t.files++; t.bytes += st.size;
  }
})(OUT);
const sw = (fs.readFileSync(path.join(fs.existsSync(path.join(OUT, "sw.js")) ? OUT : ROOT, "sw.js"), "utf8").match(/const VERSION = '([^']+)'/) || [])[1] || null;
const site = {
  url: "https://deovandski.github.io/Vraki-West-March-Campaign-D-D",
  pages: lang.english.pages,
  languages: lang.languages.length + 1,
  files, bytes,
  byType: Object.fromEntries(Object.entries(byType).sort(([, a], [, b]) => b.bytes - a.bytes)),
  serviceWorker: sw
};

/* ---------------- campaign (read the same way the site's tools read it) ---------------- */
const sb = { window: {}, console };
vm.runInNewContext(read("site/js/parse.js"), sb);
vm.runInNewContext(read("site/js/content.js"), sb);
const P = sb.window.VW.parse, groups = sb.window.VW.content.groups;
const D = "D&D Campaign/";
const docsIn = (...ids) => groups.filter((g) => ids.includes(g.id)).reduce((n, g) => n + g.docs.length, 0);
const creatures = { beasts: P.parseBeasts(read(D + "Stat Blocks/Beasts.md")).length, fauna: P.parseFauna(read(D + "Stat Blocks/Fauna.md")).length, people: P.parsePeople(read(D + "Stat Blocks/People.md")).length };
const quests = P.parseQuests(read(D + "06 - Quest Board.md"));
const campaign = {
  pages: Object.fromEntries(groups.map((g) => [g.id, g.docs.length])),
  menu: groups.map((g) => ({ id: g.id, title: g.title, pages: g.docs.length })),
  rulesPages: docsIn("start", "rules"), lorePages: docsIn("lore"), dmPages: docsIn("dm", "stats"),
  adventurers: groups.find((g) => g.id === "pregens").docs.filter((d) => !/README/.test(d[0])).length,
  statBlocks: creatures,
  quests: Object.fromEntries(Object.entries(quests).map(([rank, list]) => [rank, list.length])),
  handouts: fs.readdirSync(path.join(ROOT, "Handouts/images")).filter((f) => /\.jpg$/i.test(f)).length,
  maps: fs.readdirSync(path.join(ROOT, "Maps")).filter((f) => /\.(png|jpe?g)$/i.test(f)).length + fs.readdirSync(path.join(ROOT, "Maps/web")).length,
  glossary: Object.fromEntries(i18n.LANGS.map((l) => [l, Object.keys(i18n.glossaryNames(l)).length]))
};

fs.writeFileSync(path.join(OUT, "stats.json"), JSON.stringify({ code, site, i18n: lang, campaign }, null, 1) + "\n");
console.log(`stats.json: ${code.builtBy}${code.commit ? " @ " + code.commit.slice(0, 7) : ""}${pr ? " (PR #" + pr + ")" : ""} · ${files} files, ${(bytes / 1048576).toFixed(1)} MB → ${path.relative(ROOT, path.join(OUT, "stats.json")) || "stats.json"}`);
