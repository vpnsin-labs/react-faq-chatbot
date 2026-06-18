// Headless smoke-drive of the playground with puppeteer-core + an installed
// Chrome. Writes screenshots to ./shots and logs the asserted state. Start the
// dev server first (`npm run dev`), then `npm run drive` in another terminal.
//
// Point at your Chrome via CHROME_PATH if the default below isn't right.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const DEFAULT_CHROME = {
  win32: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux: '/usr/bin/google-chrome',
};
const CHROME = process.env.CHROME_PATH || DEFAULT_CHROME[process.platform] || DEFAULT_CHROME.linux;
const URL = process.env.PLAYGROUND_URL || 'http://localhost:5173/';

mkdirSync('shots', { recursive: true });
const shot = (n) => `shots/${n}.png`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.info('[drive]', ...a);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--window-size=1120,820'],
  defaultViewport: { width: 1120, height: 820 },
});
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  // Closed state: chat launcher + WhatsApp launcher FAB.
  await page.waitForSelector('.rfc-launcher', { timeout: 15000 });
  await sleep(400);
  await page.screenshot({ path: shot('1-closed') });
  const waLauncher = await page.$eval('.rfc-wa-launcher', (a) => a.getAttribute('href'));
  log('WhatsApp launcher href:', waLauncher);

  // Open the panel.
  await page.click('.rfc-launcher');
  await page.waitForSelector('.rfc-panel', { timeout: 5000 });
  await sleep(400);
  await page.screenshot({ path: shot('2-open') });
  log('preset title:', await page.$eval('.rfc-title', (e) => e.textContent.trim()));
  log(
    'quick topics:',
    JSON.stringify(await page.$$eval('.rfc-topic', (els) => els.map((e) => e.textContent.trim())))
  );
  log('WhatsApp panel CTA:', await page.$eval('.rfc-wa-cta', (a) => a.getAttribute('href')));

  // Keyword search: "where is my package" only matches the track FAQ via keywords.
  await page.type('.rfc-input', 'where is my package');
  await page.click('.rfc-send');
  await sleep(1300);
  await page.screenshot({ path: shot('3-keyword-answer') });
  log(
    'bubbles:',
    JSON.stringify(
      await page.$$eval('.rfc-bubble__text', (els) => els.map((e) => e.textContent.trim()))
    )
  );

  log('DONE');
} finally {
  await browser.close();
}
