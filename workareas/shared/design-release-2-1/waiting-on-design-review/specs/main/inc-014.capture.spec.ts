import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type Locator, type Page } from '@playwright/test';
import { commodityLines } from '@domain/animals/constants/commodity-lines';
import { createAnimalsPages } from '@page-objects';
import { test, expect } from '@fixtures';

const REVIEW_DIR = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SHOTS_DIR = join(REVIEW_DIR, 'screens/inc-014/main');
const VIDEOS_DIR = join(REVIEW_DIR, 'videos');
const VIEWPORT = { width: 1280, height: 800 };
const TYPING_DELAY_MS = 150;
const CATTLE_QUERY = 'cattle';
const NO_MATCH_QUERY = 'zzz';

test.use({ video: 'on', viewport: VIEWPORT });

const pause = (page: Page) => page.waitForTimeout(1000);

async function shot(page: Page, state: string, options: { locator?: Locator; fullPage?: boolean } = {}): Promise<void> {
  mkdirSync(SHOTS_DIR, { recursive: true });
  const path = join(SHOTS_DIR, `${state}.png`);
  if (options.locator) {
    await options.locator.screenshot({ path });
  } else {
    await page.screenshot({ path, fullPage: options.fullPage ?? true });
  }
}

async function shotSearchControl(page: Page, searchBox: Locator, searchButton: Locator): Promise<void> {
  const formGroup = searchBox.locator('xpath=ancestor::div[contains(@class, "govuk-form-group")][1]');
  const groupBox = await formGroup.boundingBox();
  const buttonBox = await searchButton.boundingBox();
  if (!groupBox || !buttonBox) {
    throw new Error('The search box or its Search button is not on screen');
  }
  const PADDING = 8;
  const x = Math.min(groupBox.x, buttonBox.x) - PADDING;
  const y = groupBox.y - PADDING;
  mkdirSync(SHOTS_DIR, { recursive: true });
  await page.screenshot({
    path: join(SHOTS_DIR, 'search-control.png'),
    fullPage: true,
    clip: {
      x,
      y,
      width: Math.max(groupBox.x + groupBox.width, buttonBox.x + buttonBox.width) - x + PADDING,
      height: buttonBox.y + buttonBox.height - y + PADDING,
    },
  });
}

function writeNotes(name: string, notes: Record<string, unknown>): void {
  mkdirSync(SHOTS_DIR, { recursive: true });
  writeFileSync(join(SHOTS_DIR, `${name}.json`), JSON.stringify(notes, null, 2));
}

const resultsList = (page: Page) => page.locator('form > div').filter({ has: page.getByRole('checkbox') });

test.afterEach(async ({ page }, testInfo) => {
  const videoName = testInfo.annotations.find((annotation) => annotation.type === 'video-name')?.description;
  await page.close();
  const video = page.video();
  if (!videoName || !video) {
    return;
  }
  mkdirSync(VIDEOS_DIR, { recursive: true });
  copyFileSync(await video.path(), join(VIDEOS_DIR, `inc-014--main--${videoName}.webm`));
});

test.describe('commodity search on the server', () => {
  test.beforeEach(async ({ animalsJourney, page }) => {
    await animalsJourney.toCommoditySelection();
    await pause(page);
  });

  test('lists results only when Search is pressed, never as the trader types', async ({ page, animalsPages }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'search-on-press' });
    const commodityPage = animalsPages.commoditySelection;

    await shot(page, 'empty');
    await shotSearchControl(page, commodityPage.searchBox, commodityPage.searchButton);

    await commodityPage.searchBox.click();
    await pause(page);
    await commodityPage.searchBox.pressSequentially(CATTLE_QUERY, { delay: TYPING_DELAY_MS });
    await pause(page);
    await expect(page.getByRole('checkbox')).toHaveCount(0);
    await shot(page, 'typed-nothing-listed');

    await commodityPage.searchButton.click();
    await commodityPage.heading.waitFor();
    await pause(page);
    await expect(commodityPage.species(commodityLines.cattle)).toBeVisible();
    await shot(page, 'results');
    await shot(page, 'results-list', { locator: resultsList(page) });

    await commodityPage.search(NO_MATCH_QUERY);
    await pause(page);
    await expect(page.getByText('No results found')).toBeVisible();
    await shot(page, 'no-results');

    writeNotes('search-on-press', {
      liveRegionsInMain: await page.locator('main [aria-live]').count(),
      searchButtonClasses: await commodityPage.searchButton.getAttribute('class'),
      searchBoxClasses: await commodityPage.searchBox.getAttribute('class'),
    });
  });

  test('a tick reaches the selected panel on the next search, Escape only empties the box, and Save and continue saves it', async ({
    page,
    animalsPages,
  }, testInfo) => {
    testInfo.annotations.push({ type: 'video-name', description: 'tick-escape-save' });
    const commodityPage = animalsPages.commoditySelection;

    await commodityPage.search(CATTLE_QUERY);
    await pause(page);
    await commodityPage.species(commodityLines.cattle).check();
    await pause(page);
    await expect(commodityPage.selectedSummary).toHaveCount(0);
    await shot(page, 'ticked-panel-not-yet-updated');

    await commodityPage.searchBox.press('Escape');
    await pause(page);
    await shot(page, 'after-escape');
    const searchBoxAfterEscape = await commodityPage.searchBox.inputValue();
    const resultsShownAfterEscape = await page.getByRole('checkbox').count();

    await commodityPage.search(CATTLE_QUERY);
    await pause(page);
    await expect(commodityPage.selectedSummary).toContainText('1 selected');
    await shot(page, 'selected-panel-after-search');
    await shot(page, 'selected-panel', { locator: commodityPage.selectedSummary });

    await commodityPage.saveAndContinue.click();
    await expect(animalsPages.overview.heading).toBeVisible();
    await pause(page);
    await shot(page, 'saved-next-page');

    writeNotes('tick-escape-save', { searchBoxAfterEscape, resultsShownAfterEscape });
  });

  test('without JavaScript the search, ticks and selected panel work the same', async ({ page, browser }, testInfo) => {
    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
      storageState: await page.context().storageState(),
      viewport: VIEWPORT,
      recordVideo: { dir: testInfo.outputPath('no-js-video'), size: VIEWPORT },
    });
    const noJsPage = await noJsContext.newPage();
    const commodityPage = createAnimalsPages(noJsPage).commoditySelection;

    await noJsPage.goto(page.url());
    await commodityPage.heading.waitFor();
    await pause(noJsPage);
    await shot(noJsPage, 'nojs-empty');

    await commodityPage.searchBox.click();
    await commodityPage.searchBox.pressSequentially(CATTLE_QUERY, { delay: TYPING_DELAY_MS });
    await pause(noJsPage);
    await commodityPage.searchBox.press('Enter');
    await commodityPage.heading.waitFor();
    await pause(noJsPage);
    await expect(commodityPage.species(commodityLines.cattle)).toBeVisible();
    await shot(noJsPage, 'nojs-enter-results');

    await commodityPage.species(commodityLines.cattle).check();
    await pause(noJsPage);
    await commodityPage.searchButton.click();
    await commodityPage.heading.waitFor();
    await pause(noJsPage);
    await expect(commodityPage.selectedSummary).toContainText('1 selected');
    await shot(noJsPage, 'nojs-selected-panel');

    await noJsPage.close();
    const video = noJsPage.video();
    if (video) {
      mkdirSync(VIDEOS_DIR, { recursive: true });
      copyFileSync(await video.path(), join(VIDEOS_DIR, 'inc-014--main--without-javascript.webm'));
    }
    await noJsContext.close();
  });
});
