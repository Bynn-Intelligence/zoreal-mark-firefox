/**
 * Loads the built extension into a local Firefox, opens the demo page on the
 * mock record server and checks that every fixture case rendered the verdict
 * the fixture expects. Screenshots land in dev/screens/.
 *
 *   npm run build:local && npm run mock &   (in another shell)
 *   node dev/e2e.mjs
 *
 * A development build starts pointed at the mock, so nothing is typed into
 * the options page. Firefox is driven over WebDriver BiDi by puppeteer-core,
 * which installs the built extension as a temporary add-on. Point FIREFOX at
 * the binary if it is not the one in /Applications. Set E2E_SCREENSHOTS=0 to
 * skip the screenshots.
 */
import puppeteer from 'puppeteer-core';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const FIREFOX = process.env.FIREFOX ?? '/Applications/Firefox.app/Contents/MacOS/firefox';
const DIST = new URL('../dist', import.meta.url).pathname;
const MOCK = 'http://localhost:4820';
const shots = process.env.E2E_SCREENSHOTS !== '0';
mkdirSync('dev/screens', { recursive: true });

const require = createRequire(import.meta.url);
const cases = JSON.parse(readFileSync(require.resolve('@zoreal/mark-verify/fixtures/index.json'), 'utf8'));

const browser = await puppeteer.launch({
  browser: 'firefox',
  executablePath: FIREFOX,
  headless: false,
  defaultViewport: { width: 1200, height: 900 },
});
try {
  const extId = await browser.installExtension(DIST);
  console.log('extension', extId);

  const page = await browser.newPage();
  await page.goto(`${MOCK}/demo`, { waitUntil: 'networkidle0' });
  const HOSTS = '[data-zoreal-mark-host]:not([data-zoreal-mark-host="sign"]):not([data-zoreal-mark-host="card"])';
  await page.waitForSelector(HOSTS, { timeout: 30000 });
  const hosts = await page.$$eval(HOSTS, (els) => els.map((e) => e.getAttribute('data-zoreal-mark-host')));
  console.log(`${hosts.length} badges placed`);

  // Each badge writes its verdict on its host element once the background answers.
  await page.waitForFunction((sel) => {
    const hosts = [...document.querySelectorAll(sel)];
    return hosts.length > 0 && hosts.every((h) => h.hasAttribute('data-zoreal-verdict'));
  }, { timeout: 60000 }, HOSTS);
  const verdicts = await page.$$eval(HOSTS, (els) => els.map((e) => [e.getAttribute('data-zoreal-mark-host'), e.getAttribute('data-zoreal-verdict'), e.getAttribute('data-zoreal-reason')]));
  const byId = new Map();
  for (const [id, v, reason] of verdicts) byId.set(id, (byId.get(id) ?? new Set()).add(v + (reason ? ` (${reason})` : '')));
  console.log(`${verdicts.length} verdicts rendered`);
  // The observer rescans after every badge; the count must settle. A badge
  // count still climbing two seconds later is the scanner feeding itself.
  await new Promise((r) => setTimeout(r, 2000));
  const settled = await page.$$eval(HOSTS, (els) => els.length);
  if (settled !== verdicts.length) { console.log(`  WRONG: badge count moved from ${verdicts.length} to ${settled} after the scan; the scanner is rescanning its own output`); process.exitCode = 1; }

  let failures = 0;
  for (const c of cases.filter((c) => c.pageUrl !== undefined && c.text !== undefined)) {
    // The demo page renders every case; cases that reuse one id with different text or page cannot all be right at once,
    // so only compare cases whose text and page match what the demo shows.
    if (c.pageUrl !== null && !String(c.pageUrl).startsWith('https://www.youtube.com') && !String(c.pageUrl).startsWith('https://app.slack.com') && c.pageUrl !== 'https://example.org/repost' && c.pageUrl !== `${MOCK}/demo`) continue;
    if (c.name === 'ok-showcase-here') continue; // bound to /showcase, rendered there, not on the demo page
    const got = c.name === 'fail-1-bad-id' ? byId.get('broken') : byId.get(c.id);
    if (!got) { console.log(`  MISSING ${c.name}`); failures++; continue; }
    // On the demo page every page-bound record is "for another page", because the demo is not the page it was signed for.
    const expected = c.pageUrl !== `${MOCK}/demo` && (c.expect.verdict === 'verified_here' || c.expect.verdict === 'verified_in_channel') ? 'verified_other_page' : c.expect.verdict;
    const ok = [...got].some((g) => g.startsWith(expected)) || (c.name.startsWith('ok-email') && got.has('verified_unbound'));
    if (!ok) { console.log(`  WRONG ${c.name}: expected ${expected}, got ${[...got].join('/')}`); failures++; }
  }
  console.log(failures === 0 ? 'every case rendered as expected' : `${failures} mismatches`);

  // A strongly verified Mark shows its words and its badge, not its markers:
  // both marker strings are hidden, and a paragraph holding only a marker
  // is hidden with it. The block-form copy in #here is the one to check.
  const hidden = await page.evaluate(() => {
    const here = document.getElementById('here');
    if (!here) return null;
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const markers = [...here.querySelectorAll('[data-zoreal-marker]')];
    const paragraphs = [...here.querySelectorAll('p')];
    return { markers: markers.length, markersVisible: markers.filter(visible).length, paragraphsVisible: paragraphs.filter(visible).length,
      visibleText: here.innerText.replace(/\s+/g, ' ').trim().slice(0, 80), verdict: here.querySelector('[data-zoreal-verdict]')?.getAttribute('data-zoreal-verdict') };
  });
  console.log('verified block:', JSON.stringify(hidden));
  await page.evaluate(() => document.getElementById('here')?.scrollIntoView({ block: 'center' }));
  if (shots) await (await page.$('#here'))?.screenshot({ path: 'dev/screens/verified-block.png' });
  if (!hidden || hidden.verdict !== 'verified_here' || hidden.markers !== 2 || hidden.markersVisible !== 0 || hidden.visibleText.includes('::ZOREAL')) { console.log('  WRONG: markers of a verified Mark still visible'); failures++; }

  // Hover the first badge for the card, and focus the demo box for the sign control.
  await page.evaluate((sel) => document.querySelector(sel)?.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false })), HOSTS);
  await new Promise((r) => setTimeout(r, 400));
  if (shots) await page.screenshot({ path: 'dev/screens/demo-hover.png' });
  await page.bringToFront();
  await page.evaluate(() => { const b = document.querySelector('#demo-box'); b.focus(); b.value = 'I was at the launch and the demo was real.'; b.dispatchEvent(new Event('input', { bubbles: true })); });
  await new Promise((r) => setTimeout(r, 300));
  const controlShown = await page.$eval('[data-zoreal-mark-host="sign"]', (el) => el.style.display !== 'none');
  console.log(`sign control shown beside the listed box: ${controlShown}`);
  if (shots) await page.screenshot({ path: 'dev/screens/demo-sign-control.png' });
  process.exitCode = failures === 0 && controlShown ? 0 : 1;
} finally {
  await browser.close();
}
