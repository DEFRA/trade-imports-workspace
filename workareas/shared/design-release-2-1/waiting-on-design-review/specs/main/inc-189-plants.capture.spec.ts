import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type Locator, type Page } from '@playwright/test';
import { test, expect } from '@fixtures';
import { type TypeAhead } from '@page-objects/shared/type-ahead';
import { POTATOES } from '@flows/plants/journey';

const ROW = 'inc-189';
const SIDE = 'main';
const REVIEW_DIR = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SCREENS_DIR = join(REVIEW_DIR, 'screens', ROW, SIDE);
const VIDEOS_DIR = join(REVIEW_DIR, 'videos');
const PAUSE_MS = 1000;
const STATUS_DEBOUNCE_MS = 1600;
const TYPING_DELAY_MS = 150;
const FIELD_ID = 'countryOfOrigin';

test.use({ video: 'on', viewport: { width: 1280, height: 800 } });

const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const pause = (page: Page) => page.waitForTimeout(PAUSE_MS);

async function shot(page: Page, state: string, options: { fullPage?: boolean; locator?: Locator } = {}): Promise<void> {
  const path = join(SCREENS_DIR, `${state}.png`);
  if (options.locator) {
    await options.locator.screenshot({ path });
    return;
  }
  await page.screenshot({ path, fullPage: options.fullPage ?? false });
}

async function saveAriaSnapshot(typeAhead: TypeAhead, state: string): Promise<void> {
  mkdirSync(SCREENS_DIR, { recursive: true });
  writeFileSync(join(SCREENS_DIR, `${state}.aria.txt`), `${await typeAhead.formGroup.ariaSnapshot()}\n`);
}

async function readScreenReaderText(page: Page): Promise<string[]> {
  return page.evaluate((fieldId) => {
    const input = document.getElementById(fieldId) as HTMLInputElement | null;
    const label = document.querySelector(`label[for="${fieldId}"]`);
    const listbox = document.getElementById(`${fieldId}__listbox`);
    const hintId = input?.getAttribute('aria-describedby')?.split(' ').find((id) => id.includes('assistiveHint'));
    const statusText = (suffix: string) => document.getElementById(`${fieldId}__status--${suffix}`)?.textContent?.trim() ?? '';
    const shownOptions = listbox ? listbox.querySelectorAll('[role="option"]').length : 0;
    return [
      `Search box: <${input?.tagName.toLowerCase()}> role="${input?.getAttribute('role')}" placeholder="${input?.placeholder}"`,
      `Search box <label>: "${label?.textContent?.trim()}"`,
      `Assistive hint (aria-describedby): "${hintId ? document.getElementById(hintId)?.textContent?.trim() : 'none'}"`,
      `Typed value: "${input?.value}"`,
      `Results list: role="${listbox?.getAttribute('role')}" aria-labelledby="${listbox?.getAttribute('aria-labelledby')}" aria-label="${listbox?.getAttribute('aria-label') ?? 'none'}"`,
      `Results shown: ${shownOptions} options`,
      `Live region A (role=status, polite): "${statusText('A')}"`,
      `Live region B (role=status, polite): "${statusText('B')}"`,
    ];
  }, FIELD_ID);
}

async function shotScreenReaderPanel(page: Page, state: string, title: string): Promise<void> {
  await page.waitForTimeout(STATUS_DEBOUNCE_MS);
  const lines = await readScreenReaderText(page);
  await page.evaluate(
    ({ title, lines }) => {
      const panel = document.createElement('div');
      panel.setAttribute('data-capture-panel', '');
      panel.setAttribute('aria-hidden', 'true');
      Object.assign(panel.style, {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        maxWidth: '620px',
        zIndex: '2147483647',
        background: '#fff7bf',
        border: '3px solid #0b0c0c',
        padding: '12px 16px',
        font: '15px/1.45 monospace',
        color: '#0b0c0c',
        whiteSpace: 'pre-wrap',
      });
      panel.textContent = [`What a screen reader is given: ${title}`, '', ...lines].join('\n');
      document.body.append(panel);
    },
    { title, lines },
  );
  await pause(page);
  await shot(page, state);
  await page.evaluate(() => document.querySelector('[data-capture-panel]')?.remove());
}

async function typeIntoCountrySearch(page: Page, typeAhead: TypeAhead, text: string): Promise<void> {
  await typeAhead.field.click();
  await pause(page);
  await typeAhead.field.fill('');
  await typeAhead.field.pressSequentially(text, { delay: TYPING_DELAY_MS });
  await pause(page);
}

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video();
  await page.close();
  if (!video) {
    return;
  }
  mkdirSync(VIDEOS_DIR, { recursive: true });
  copyFileSync(await video.path(), join(VIDEOS_DIR, `${ROW}--${SIDE}--${slugOf(testInfo.title)}.webm`));
});

test.describe('High-risk plants country of origin with JavaScript', () => {
  test('plants results label and count', async ({ pages, plantsJourney, plantsPages }) => {
    const { page } = pages;
    const { country } = plantsPages.origin;
    await plantsJourney.toOriginOfNewNotification(POTATOES);
    await pause(page);
    await shot(page, 'plants--origin-empty', { fullPage: true });
    await saveAriaSnapshot(country, 'plants--origin-empty');

    await typeIntoCountrySearch(page, country, 'Fra');
    await expect(country.option('France')).toBeVisible();
    await shot(page, 'plants--results-open', { fullPage: true });
    await shot(page, 'plants--results-list', { locator: country.formGroup });
    await saveAriaSnapshot(country, 'plants--results-open');
    await shotScreenReaderPanel(page, 'plants--results-screen-reader', 'after typing "Fra"');
  });

  test('plants selected announcement', async ({ pages, plantsJourney, plantsPages }) => {
    const { page } = pages;
    const { country } = plantsPages.origin;
    await plantsJourney.toOriginOfNewNotification(POTATOES);
    await pause(page);
    await typeIntoCountrySearch(page, country, 'Fra');
    await expect(country.option('France')).toBeVisible();

    await country.option('France').click();
    await pause(page);
    await expect(country.field).toHaveValue('France');
    await shot(page, 'plants--country-chosen', { locator: country.formGroup });
    await shotScreenReaderPanel(page, 'plants--selected-screen-reader', 'after clicking France');
  });
});

test.describe('High-risk plants country of origin without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('plants no javascript country select', async ({ pages, plantsJourney, plantsPages }) => {
    const { page } = pages;
    const { country } = plantsPages.origin;
    await plantsJourney.toOriginOfNewNotification(POTATOES);
    await pause(page);
    await shot(page, 'plants--no-js-origin-empty', { fullPage: true });
    await saveAriaSnapshot(country, 'plants--no-js-origin-empty');
  });
});
