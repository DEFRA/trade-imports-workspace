import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { type Page } from '@playwright/test';
import { test, expect } from '@fixtures';

const REVIEW = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SCREENS = join(REVIEW, 'screens/inc-198/main');
const VIDEOS = join(REVIEW, 'videos');
const LOGS = join(REVIEW, 'logs');

const pause = (page: Page) => page.waitForTimeout(1000);
const shot = (name: string) => join(SCREENS, `${name}.png`);
const slugOf = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const recordFinding = (name: string, finding: object) => {
  mkdirSync(LOGS, { recursive: true });
  writeFileSync(join(LOGS, `inc-198--main--${name}.json`), JSON.stringify(finding, null, 2));
};

test.use({ video: 'on', viewport: { width: 1280, height: 800 } });

test.beforeAll(() => {
  mkdirSync(SCREENS, { recursive: true });
  mkdirSync(VIDEOS, { recursive: true });
});

test.afterEach(async ({ page }, testInfo) => {
  const video = page.video();
  await page.close();
  if (!video) return;
  copyFileSync(await video.path(), join(VIDEOS, `inc-198--main--${slugOf(testInfo.title)}.webm`));
});

test.describe('import reference numbers on the live animals view', () => {
  test('submitted view shows the reference only in the journey strip, with no Copy buttons', async ({
    animalsSeededJourney,
    animalsPages,
    page,
  }) => {
    const reference = await animalsSeededJourney.createSubmittedNotification();
    const view = await animalsSeededJourney.resumeInUi(reference, animalsPages.notificationView);
    await view.btnDelete.waitFor();
    await pause(page);
    await page.screenshot({ path: shot('animals-view-js-on'), fullPage: true });
    await view.journeyStrip.screenshot({ path: shot('animals-journey-strip-js-on') });
    await pause(page);
    await expect(view.notificationReference).toHaveText(reference);
    recordFinding('js-on', {
      reference,
      importReferenceSection: await page.getByRole('heading', { name: 'Import reference numbers' }).count(),
      copyButtons: await page.getByRole('button', { name: 'Copy', exact: true }).count(),
      customsDocumentCode: await page.getByText('Customs document code').count(),
    });
  });

  test('the trader selects the reference by hand from the journey strip', async ({ animalsSeededJourney, animalsPages, page }) => {
    const reference = await animalsSeededJourney.createSubmittedNotification();
    const view = await animalsSeededJourney.resumeInUi(reference, animalsPages.notificationView);
    await pause(page);
    await view.notificationReference.click({ clickCount: 3 });
    await pause(page);
    await view.journeyStrip.screenshot({ path: shot('animals-journey-strip-reference-selected') });
    recordFinding('selection', {
      reference,
      selectedText: await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    });
  });

  test('the submission confirmation shows the reference in its panel', async ({ animalsSeededJourney, animalsPages, page }) => {
    const reference = await animalsSeededJourney.createSubmittedNotification();
    await animalsPages.confirmation.open(reference);
    await animalsPages.confirmation.heading.waitFor();
    await pause(page);
    await page.screenshot({ path: shot('animals-confirmation'), fullPage: true });
    await page.locator('.govuk-panel').screenshot({ path: shot('animals-confirmation-panel') });
  });
});

test.describe('import reference numbers on the live animals view without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('submitted view without JavaScript shows the same journey strip', async ({ animalsSeededJourney, animalsPages, page }) => {
    const reference = await animalsSeededJourney.createSubmittedNotification();
    const view = await animalsSeededJourney.resumeInUi(reference, animalsPages.notificationView);
    await pause(page);
    await page.screenshot({ path: shot('animals-view-js-off'), fullPage: true });
    await view.journeyStrip.screenshot({ path: shot('animals-journey-strip-js-off') });
    await expect(view.notificationReference).toHaveText(reference);
  });
});
