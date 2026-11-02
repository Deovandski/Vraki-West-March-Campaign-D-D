// Renders handouts.html to a combined PDF and one JPEG per page.
// Usage (from this folder): npm i playwright && npx playwright install chromium && node render.js [outDir]
// outDir defaults to the Handouts folder (one level up).
// Output: <outDir>/Vraki West March - Handouts.pdf and <outDir>/images/NN-Name.jpg (150 dpi)
const { chromium } = require('playwright');
const path = require('path'); const fs = require('fs');
(async () => {
  const out = process.argv[2] || path.resolve(__dirname, '..'); fs.mkdirSync(path.join(out, 'images'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 1100 }, deviceScaleFactor: 150 / 96 });
  await page.goto('file://' + path.resolve(__dirname, 'handouts.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const ids = await page.$$eval('section.page', s => s.map(e => e.id));
  const names = await page.$$eval('section.page .foot span:first-child', s => s.map(e => e.textContent.split('·').slice(1).join('·').trim()));
  for (let i = 0; i < ids.length; i++) {
    const slug = names[i].replace(/^Handout\s*/, '').replace(/['’()]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await (await page.$('#' + ids[i])).screenshot({ path: path.join(out, 'images', slug + '.jpg'), type: 'jpeg', quality: 85 });
  }
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: path.join(out, 'Vraki West March - Handouts.pdf'), width: '8.5in', height: '11in', printBackground: true, preferCSSPageSize: true });
  await browser.close();
  console.log('rendered', ids.length, 'pages');
})();
