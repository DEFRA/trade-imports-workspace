import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '@fixtures';
import { type AnimalsTransitedCountriesPage } from '@page-objects/animals/transited-countries-page';

// Capture only: photographs how the transit countries page adds, removes and announces countries today.
// Copy to tests/animals/capture/ and run with playwright.docker-compose.config.ts.

const REVIEW = path.join(os.homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SCREENS = path.join(REVIEW, 'screens/inc-030/main');
const VIDEOS = path.join(REVIEW, 'videos');
const PAUSE_MS = 1000;

const TWELVE_COUNTRIES = [
  'Austria',
  'Belgium',
  'Croatia',
  'Denmark',
  'Estonia',
  'Finland',
  'Germany',
  'Greece',
  'Hungary',
  'Italy',
  'Poland',
  'Portugal',
];

test.use({ video: 'on', viewport: { width: 1280, height: 800 } });
test.describe.configure({ mode: 'default' });

const pause = (page: Page) => page.waitForTimeout(PAUSE_MS);

async function shoot(target: Page | Locator, state: string, { fullPage = true } = {}): Promise<void> {
  fs.mkdirSync(SCREENS, { recursive: true });
  const file = path.join(SCREENS, `${state}.png`);
  if ('goto' in target) {
    await target.screenshot({ path: file, fullPage });
  } else {
    await target.screenshot({ path: file });
  }
}

/** Shows the visually hidden live region's text in a labelled box, records it, and photographs the page. */
async function shootAnnouncement(page: Page, region: Locator, state: string): Promise<void> {
  await page.waitForTimeout(400);
  const text = ((await region.textContent()) ?? '').trim();
  fs.mkdirSync(SCREENS, { recursive: true });
  fs.writeFileSync(path.join(SCREENS, `${state}.announcement.txt`), `${text}\n`);
  await page.evaluate((spoken) => {
    document.getElementById('capture-announcement')?.remove();
    const box = document.createElement('div');
    box.id = 'capture-announcement';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText =
      'position:fixed;right:16px;bottom:16px;z-index:9999;max-width:420px;padding:12px 16px;background:#fff;border:3px dashed #d4351c;font:16px/1.4 Arial,sans-serif;color:#0b0c0c';
    box.textContent = `Screen reader hears: "${spoken}"`;
    document.body.appendChild(box);
  }, text);
  await shoot(page, state, { fullPage: false });
  await pause(page);
  await page.evaluate(() => document.getElementById('capture-announcement')?.remove());
}

async function recordRemoveNames(transitedCountries: AnimalsTransitedCountriesPage, state: string): Promise<void> {
  const names = await transitedCountries.addedCountries.getByRole('button').evaluateAll((buttons) =>
    buttons.map((button) => (button.textContent ?? '').replace(/\s+/g, ' ').trim()),
  );
  fs.mkdirSync(SCREENS, { recursive: true });
  fs.writeFileSync(path.join(SCREENS, `${state}.remove-names.json`), `${JSON.stringify(names, null, 2)}\n`);
}

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video();
  await page.close();
  if (video) {
    fs.mkdirSync(VIDEOS, { recursive: true });
    const name = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await video.saveAs(path.join(VIDEOS, `inc-030--main--${name}.webm`));
  }
});

test.describe('Transit countries with JavaScript', () => {
  test.beforeEach(async ({ animalsJourney }) => {
    await animalsJourney.toTransitedCountries();
  });

  test('add on Add country', async ({ page, animalsPages }) => {
    const { transitedCountries } = animalsPages;
    await pause(page);
    await shoot(page, 'js--01-empty');

    await transitedCountries.country.search('Germ');
    await transitedCountries.country.option('Germany').waitFor();
    await pause(page);
    await shoot(page, 'js--02-search-open', { fullPage: false });
    await shoot(transitedCountries.country.formGroup, 'js--02-search-open--widget');

    await transitedCountries.country.option('Germany').click();
    await pause(page);
    await shoot(page, 'js--03-picked-not-yet-added');

    await transitedCountries.addCountryButton.click();
    await transitedCountries.row('Germany').waitFor();
    await pause(page);
    await shoot(page, 'js--04-germany-added');
    await shootAnnouncement(page, transitedCountries.statusRegion, 'js--04-germany-added--announcement');

    await transitedCountries.country.search('Belg');
    await pause(page);
    await transitedCountries.country.option('Belgium').click();
    await pause(page);
    await transitedCountries.addCountryButton.click();
    await transitedCountries.row('Belgium').waitFor();
    await pause(page);
    await expect(transitedCountries.addedCountryNames).toHaveText(['Germany', 'Belgium']);
    await shoot(page, 'js--05-two-added-in-order-added');
    await shoot(transitedCountries.addedCountries.first().locator('xpath=ancestor::table[1]'), 'js--05-two-added--table');
    await recordRemoveNames(transitedCountries, 'js--05-two-added');
  });

  test('remove on Remove', async ({ page, animalsPages }) => {
    const { transitedCountries } = animalsPages;
    await transitedCountries.addCountry('Germany');
    await pause(page);
    await transitedCountries.addCountry('Belgium');
    await pause(page);
    await shoot(transitedCountries.removeCountry('Germany'), 'js--06-remove-button--widget');

    await transitedCountries.removeCountry('Germany').focus();
    await pause(page);
    await shoot(page, 'js--06-remove-focused', { fullPage: false });

    await transitedCountries.removeCountry('Germany').click();
    await page.waitForLoadState('load');
    await pause(page);
    await expect(transitedCountries.addedCountryNames).toHaveText(['Belgium']);
    await shoot(page, 'js--07-germany-removed');
    await shootAnnouncement(page, transitedCountries.statusRegion, 'js--07-germany-removed--announcement');
  });

  test('twelve country limit', async ({ page, animalsPages }) => {
    const { transitedCountries } = animalsPages;
    for (const country of TWELVE_COUNTRIES) {
      await transitedCountries.addCountry(country);
      await pause(page);
    }
    await expect(transitedCountries.addedCountryNames).toHaveText(TWELVE_COUNTRIES);
    await shoot(page, 'js--08-twelve-added-limit');
    await shootAnnouncement(page, transitedCountries.statusRegion, 'js--08-twelve-added-limit--announcement');
  });
});

test.describe('Transit countries without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test.beforeEach(async ({ animalsJourney }) => {
    await animalsJourney.toTransitedCountries();
  });

  test('add and remove without JavaScript', async ({ page, animalsPages }) => {
    const { transitedCountries } = animalsPages;
    await pause(page);
    await shoot(page, 'nojs--01-empty');
    await shoot(transitedCountries.country.formGroup, 'nojs--01-native-select--widget');

    await transitedCountries.country.choose('Germany');
    await pause(page);
    await transitedCountries.addCountryButton.click();
    await transitedCountries.row('Germany').waitFor();
    await pause(page);
    await shoot(page, 'nojs--02-germany-added');
    await shootAnnouncement(page, transitedCountries.statusRegion, 'nojs--02-germany-added--announcement');

    await transitedCountries.country.choose('Belgium');
    await pause(page);
    await transitedCountries.addCountryButton.click();
    await transitedCountries.row('Belgium').waitFor();
    await pause(page);
    await recordRemoveNames(transitedCountries, 'nojs--03-two-added');

    await transitedCountries.removeCountry('Germany').click();
    await page.waitForLoadState('load');
    await pause(page);
    await expect(transitedCountries.addedCountryNames).toHaveText(['Belgium']);
    await shoot(page, 'nojs--03-germany-removed');
    await shootAnnouncement(page, transitedCountries.statusRegion, 'nojs--03-germany-removed--announcement');

    const referenceNumber = transitedCountries.referenceNumberFromUrl();
    await transitedCountries.saveAndContinue.click();
    await animalsPages.overview.heading.waitFor();
    await pause(page);
    await transitedCountries.open(referenceNumber);
    await pause(page);
    await expect(transitedCountries.addedCountryNames).toHaveText(['Belgium']);
    await shoot(page, 'nojs--04-reopened-after-save');
  });
});
