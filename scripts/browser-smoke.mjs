import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outputDir = process.env.SCREENSHOT_DIR || 'artifacts/ui-smoke';

const cases = [
  { name: 'intro-1440x900', width: 1440, height: 900, url: '/', screen: 'intro' },
  { name: 'intro-390x844', width: 390, height: 844, url: '/', screen: 'intro' },
  { name: 'game-1440x900', width: 1440, height: 900, url: '/', screen: 'game' },
  { name: 'game-1366x768', width: 1366, height: 768, url: '/', screen: 'game' },
  { name: 'game-390x844', width: 390, height: 844, url: '/', screen: 'game' },
  { name: 'game-embed-1366x768', width: 1366, height: 768, url: '/?embed=1', screen: 'game' },
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const reports = [];

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
      await page.getByRole('heading', { name: /택타일 볼링/i }).waitFor({ state: 'visible' });

      if (testCase.screen === 'intro') {
        const startButton = page.getByRole('button', { name: /^게임 시작$/ });
        const multiButton = page.getByRole('button', { name: /로컬 멀티플레이/ });
        await startButton.waitFor({ state: 'visible' });
        await multiButton.waitFor({ state: 'visible' });

        for (const locator of [startButton, multiButton]) {
          const box = await locator.boundingBox();
          if (!box || box.height < 44 || box.width < 44) {
            throw new Error(`intro button target is smaller than 44px: ${JSON.stringify(box)}`);
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
      } else {
        await page.getByRole('button', { name: /^게임 시작$/ }).click();
        const stage = page.getByRole('application', { name: /볼링 플레이 영역/ });
        await stage.waitFor({ state: 'visible' });
        await page.getByRole('button', { name: /차례 시작/ }).click();
        await page.getByRole('region', { name: /투구 조작/ }).waitFor({ state: 'visible' });

        const laneBox = await stage.boundingBox();
        const tactileBox = await page.getByRole('region', { name: /촉각 미리보기/ }).boundingBox();
        if (!laneBox || laneBox.width < 300 || laneBox.height < 400) {
          throw new Error(`game stage is too small: ${JSON.stringify(laneBox)}`);
        }
        if (testCase.width >= 900 && tactileBox && laneBox.width <= tactileBox.width * 1.7) {
          throw new Error(`tactile preview competes with the game stage: lane=${laneBox.width}, tactile=${tactileBox.width}`);
        }

        const primaryAction = page.getByRole('button', { name: /다음 단계/ });
        const actionBox = await primaryAction.boundingBox();
        if (!actionBox || actionBox.height < 44 || actionBox.width < 44) {
          throw new Error(`game action target is smaller than 44px: ${JSON.stringify(actionBox)}`);
        }

        if (testCase.name === 'game-1440x900') {
          const helpButton = page.getByRole('button', { name: /게임 도움말 열기/ });
          await helpButton.click();
          await page.getByRole('dialog', { name: /도움말 · 조작 방법/ }).waitFor({ state: 'visible' });
          await page.keyboard.press('Escape');
          if (!(await helpButton.evaluate((element) => element === document.activeElement))) {
            throw new Error('focus did not return to gameplay help trigger');
          }
        }
      }

      const metrics = await page.evaluate(() => {
        const overflowing = Array.from(document.querySelectorAll('body *'))
          .map((element) => {
            const node = element;
            const rect = node.getBoundingClientRect();
            const style = getComputedStyle(node);
            return {
              selector: `${node.tagName.toLowerCase()}${node.id ? `#${node.id}` : ''}${node.className && typeof node.className === 'string' ? `.${node.className.trim().replace(/\s+/g, '.')}` : ''}`,
              left: Math.round(rect.left),
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              clientWidth: node.clientWidth,
              scrollWidth: node.scrollWidth,
              overflowX: style.overflowX,
              position: style.position,
            };
          })
          .filter((item) => item.left < -1 || item.right > window.innerWidth + 1)
          .sort((a, b) => b.right - a.right)
          .slice(0, 12);

        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          innerHeight: window.innerHeight,
          scrollHeight: document.documentElement.scrollHeight,
          fontFamily: getComputedStyle(document.body).fontFamily,
          overflowing,
        };
      });

      if (metrics.scrollWidth > metrics.innerWidth + 1) {
        throw new Error(`horizontal overflow: ${metrics.scrollWidth}px > ${metrics.innerWidth}px; elements=${JSON.stringify(metrics.overflowing)}`);
      }
      if (!metrics.fontFamily.toLowerCase().includes('noto sans')) {
        throw new Error(`Noto Sans was not applied: ${metrics.fontFamily}`);
      }
      if (testCase.screen === 'game' && testCase.width >= 1200 && metrics.scrollHeight > metrics.innerHeight + 24) {
        throw new Error(`desktop gameplay exceeds viewport: ${metrics.scrollHeight}px > ${metrics.innerHeight}px`);
      }
      if (consoleErrors.length > 0) {
        throw new Error(`console errors: ${consoleErrors.join(' | ')}`);
      }

      reports.push({ name: testCase.name, status: 'PASS', metrics });
      await page.screenshot({
        path: path.join(outputDir, `${testCase.name}.png`),
        fullPage: true,
      });

      console.log(`PASS ${testCase.name}`, metrics);
    } catch (error) {
      const message = `${testCase.name}: ${error instanceof Error ? error.message : String(error)}`;
      failures.push(message);
      reports.push({ name: testCase.name, status: 'FAIL', error: message });
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

await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(reports, null, 2));

if (failures.length > 0) {
  await fs.writeFile(path.join(outputDir, 'failures.txt'), `${failures.join('\n')}\n`);
  console.error(failures.join('\n'));
  process.exitCode = 1;
}