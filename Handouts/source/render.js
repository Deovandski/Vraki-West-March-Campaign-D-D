// Renders handouts.html to a combined PDF and one JPEG per page, in English or in a translation.
// Usage (from this folder): npm i playwright && npx playwright install chromium, then
//   node render.js [outDir]                 English, into the Handouts folder (one level up)
//   node render.js --lang ja [outDir]       the Japanese handouts, into Handouts/ja/ (same file names)
//   node render.js --all                    every language that has handout translations (the Pages workflow)
//   node render.js --segments               prints the text pieces to translate, as JSON (tools/i18n.js uses it)
// Output: <outDir>/Vraki West March - Handouts.pdf and <outDir>/images/NN-Name.jpg (150 dpi)
//
// Translations live in i18n/<lang>/Handouts/source/handouts.html.json (see i18n/README.md). Each piece is a
// run of text with its inline tags (a paragraph's words, a label, a heading), keyed by a hash of its English,
// using the same hash as site/js/i18n.js. The Vraki-script lines (.vk) stay in Vraki. Untranslated pieces
// stay in English.
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
const ROOT = path.resolve(__dirname, '..', '..');
const I18N = path.join(ROOT, 'site', 'js', 'i18n.js');

// Runs in the page: finds the translatable pieces and, given translations, swaps them in.
function pieces(tr) {
  const { hash, norm } = window.VW.i18n;
  const LETTER = /\p{L}/u;
  const inline = (n) => n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('vk') &&
    /^inline/.test(getComputedStyle(n).display) && ![...n.querySelectorAll('*')].some((c) => !/^inline/.test(getComputedStyle(c).display)));
  const html = (nodes) => nodes.map((n) => (n.nodeType === 3 ? n.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : n.outerHTML)).join('');
  const found = [];
  (function walk(el) {
    if (el.nodeType !== 1 || /^(SCRIPT|STYLE|SVG|svg)$/.test(el.tagName) || el.classList.contains('vk')) return;
    let run = [];
    const flush = () => {
      const en = norm(html(run));
      if (en && LETTER.test(run.map((n) => n.textContent).join(''))) found.push({ en, nodes: run });
      run = [];
    };
    [...el.childNodes].forEach((n) => {
      if (inline(n)) run.push(n);
      else { flush(); walk(n); }
    });
    flush();
  })(document.body);
  if (tr) found.forEach(({ en, nodes }) => {
    const t = tr[hash(en)];
    if (!t) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = t;
    const first = nodes[0];
    first.parentNode.insertBefore(tpl.content, first);
    nodes.forEach((n) => n.remove());
  });
  return found.map((f) => f.en);
}

const langsWithHandouts = () => fs.readdirSync(path.join(ROOT, 'i18n')).filter((l) => /^[a-z]{2}$/.test(l) &&
  fs.existsSync(path.join(ROOT, 'i18n', l, 'Handouts', 'source', 'handouts.html.json')));

async function render(browser, lang, out) {
  fs.mkdirSync(path.join(out, 'images'), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 150 / 96 });
  await page.goto('file://' + path.resolve(__dirname, 'handouts.html'));
  await page.addScriptTag({ path: I18N });
  // File names come from the English footers, so every language uses the same ones.
  const ids = await page.$$eval('section.page', (s) => s.map((e) => e.id));
  const names = await page.$$eval('section.page .foot span:first-child', (s) => s.map((e) => e.textContent.split('·').slice(1).join('·').trim()));
  if (lang && lang !== 'en') {
    const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', lang, 'Handouts', 'source', 'handouts.html.json'), 'utf8'));
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'i18n', lang, 'meta.json'), 'utf8'));
    const tr = Object.fromEntries(Object.entries(store).filter(([, v]) => v && v.t).map(([h, v]) => [h, v.t]));
    await page.evaluate(pieces, tr);
    await page.evaluate((m) => {
      document.documentElement.lang = m.html_lang || 'en';
      document.documentElement.dir = m.dir || 'ltr';
      // Chinese, Japanese, Korean and Arabic letters aren't in the handouts' fonts: add fallbacks after them.
      const fb = { zh: '"Noto Serif CJK SC", "Noto Sans CJK SC"', ja: '"Noto Serif CJK JP", "Noto Sans CJK JP"', ko: '"Noto Serif CJK KR", "Noto Sans CJK KR"', ar: '"Noto Naskh Arabic", "Noto Sans Arabic", "DejaVu Sans"' }[m.code];
      if (fb) {
        const s = document.createElement('style');
        s.textContent = `:root { --head: "TeX Gyre Bonum", ${fb}, serif; --body: "TeX Gyre Pagella", ${fb}, serif; --hand: "TeX Gyre Chorus", ${fb}, cursive; }`;
        document.head.appendChild(s);
      }
    }, Object.assign({ code: lang }, meta));
  }
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  for (let i = 0; i < ids.length; i++) {
    const slug = names[i].replace(/^Handout\s*/, '').replace(/['’()]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await (await page.$('#' + ids[i])).screenshot({ path: path.join(out, 'images', slug + '.jpg'), type: 'jpeg', quality: 85 });
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'Vraki West March - Handouts.pdf'), width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
  await page.close();
  console.error('rendered', ids.length, 'pages', lang ? '(' + lang + ')' : '', 'to', path.relative(ROOT, out) || '.');
}

(async () => {
  const a = process.argv.slice(2);
  const browser = await chromium.launch();
  try {
    if (a.includes('--segments')) {
      const page = await browser.newPage();
      await page.goto('file://' + path.resolve(__dirname, 'handouts.html'));
      await page.addScriptTag({ path: I18N });
      process.stdout.write(JSON.stringify(await page.evaluate(pieces, null)));
      return;
    }
    const li = a.indexOf('--lang');
    const rest = a.filter((x, i) => !x.startsWith('--') && i !== li + 1);
    if (a.includes('--all')) {
      for (const l of langsWithHandouts()) await render(browser, l, path.join(ROOT, 'Handouts', l));
    } else if (li >= 0) {
      const l = a[li + 1];
      await render(browser, l, rest[0] || path.join(ROOT, 'Handouts', l));
    } else {
      await render(browser, 'en', rest[0] || path.resolve(__dirname, '..'));
    }
  } finally { await browser.close(); }
})();
