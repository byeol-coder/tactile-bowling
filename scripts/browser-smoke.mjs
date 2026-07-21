import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.SCREENSHOT_DIR || 'artifacts/ui-smoke';

const cases = [
  { name: 'intro-1440x900', width: 1440, height: 900, url: '/' },
  { name: 'intro-1366x768', width: 1366, height: 768, url: '/' },
  { name: 'intro-390x844', width: 390, height: 844, url: '/' },
  { name: 'intro-embed-1366x768', width: 1366, height: 768, url: '/?embed=1' },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const testCase of cases) {
    const page = await browser.newPage({
      viewport: { width: testCase.width, height: testCase.height },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });

    try {
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.goto(new URL(testCase.url, baseURL).toString(), { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: /TACTILE BOWLING/i }).waitFor({ state: 'visible' });

      const startButton = page.getByRole('button', { name: /^게임 시작$/ });
      const multiButton = page.getByRole('button', { name: /로컬 멀티플레이/ });
      await startButton.waitFor({ state: 'visible' });
      await multiButton.waitFor({ state: 'visible' });

      const metrics = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        innerHeight: window.innerHeight,
        scrollHeight: document.documentElement.scrollHeight,
        fontFamily: getComputedStyle(document.body).fontFamily,
      }));

      if (metrics.scrollWidth > metrics.innerWidth + 1) {
        throw new Error(`horizontal overflow: ${metrics.scrollWidth}px > ${metrics.innerWidth}px`);
      }
      if (!metrics.fontFamily.toLowerCase().includes('noto sans')) {
        throw new Error(`Noto Sans was not applied: ${metrics.fontFamily}`);
      }

      for (const locator of [startButton, multiButton]) {
        const box = await locator.boundingBox();
        if (!box || box.height < 44 || box.width < 44) {
          throw new Error(`button target is smaller than 44px: ${JSON.stringify(box)}`);
        }
      }

      if (testCase.name === 'intro-1440x900') {
        const settingsButton = page.getByRole('button', { name: /접근성 및 게임 설정 열기/ });
        await settingsButton.click();
        await page.getByRole('dialog', { name: /설정 · 접근성/ }).waitFor({ state: 'visible' });
        await page.keyboard.press('Escape');
        await page.getByRole('dialog', { name: /설정 · 접근성/ }).waitFor({ state: 'detached' });
        if (!(await settingsButton.evaluate((element) => element === document.activeElement))) {
          throw new Error('focus did not return to settings trigger after closing dialog');
        }
      }

      if (consoleErrors.length > 0) {
        throw new Error(`console errors: ${consoleErrors.join(' | ')}`);
      }

      await page.screenshot({
        path: path.join(outputDir, `${testCase.name}.png`),
        fullPage: true,
      });

      console.log(`PASS ${testCase.name}`, metrics);
    } catch (error) {
      failures.push(`${testCase.name}: ${error instanceof Error ? error.message : String(error)}`);
      await page.screenshot({
        path: path.join(outputDir, `${testCase.name}-failure.png`),
        fullPage: true,
      }).catch(() => undefined);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}