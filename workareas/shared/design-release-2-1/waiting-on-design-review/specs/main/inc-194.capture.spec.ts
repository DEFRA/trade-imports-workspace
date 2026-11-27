import { copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Browser, BrowserContext, Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from '@fixtures';
import { addressTypes, type AddressType } from '@domain/shared/constants/address-types';
import type { InsPages } from '@page-objects';
import { InsAddressBookAddPage } from '@page-objects/ins/address-book/add-page';
import { AnimalsCommercialTransporterPage } from '@page-objects/animals/commercial-transporter-page';

// Photographs what main does today where the address search's search-only layout
// would go: the INS add page in address book and journey modes, the commercial
// transporter form, and the address lookup spike, with JavaScript on and off.
// Captures only: each test walks one behaviour so its video stays short.

const REVIEW_DIR = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SCREENS = join(REVIEW_DIR, 'screens/inc-194/main');
const VIDEOS = join(REVIEW_DIR, 'videos');
const VIEWPORT = { width: 1280, height: 800 };
const PAUSE = 1000;
const LOOKUP_SPIKE_POSTCODE = 'SW1A 1AA';

test.use({ video: 'on', viewport: VIEWPORT });

mkdirSync(SCREENS, { recursive: true });
mkdirSync(VIDEOS, { recursive: true });

const videoNameByTitle = new Map<string, string>();

const pause = (page: Page) => page.waitForTimeout(PAUSE);

const screenPath = (state: string) => join(SCREENS, `${state}.png`);

async function shoot(page: Page, state: string, { fullPage = true }: { fullPage?: boolean } = {}): Promise<void> {
  await page.screenshot({ path: screenPath(state), fullPage });
}

async function shootElement(locator: Locator, state: string): Promise<void> {
  await locator.screenshot({ path: screenPath(state) });
}

async function toInsAddForm(insPages: InsPages, page: Page, addressType: AddressType): Promise<void> {
  await insPages.addressBookAddressType.navigateToInsFrontend('/address-book/add/address-type?start=true');
  await insPages.addressBookAddressType.completeSignInIfRequested();
  await insPages.addressBookAddressType.heading.waitFor();
  await pause(page);
  await insPages.addressBookAddressType.choose(addressType);
  await pause(page);
  await insPages.addressBookAddressType.continue();
  await insPages.addressBookAdd.heading.waitFor();
  await pause(page);
}

async function openWithoutJavaScript(browser: Browser, page: Page, testInfo: TestInfo): Promise<{ context: BrowserContext; jsOffPage: Page }> {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: VIEWPORT,
    storageState: await page.context().storageState(),
    recordVideo: { dir: testInfo.outputPath('js-off-video'), size: VIEWPORT },
  });
  return { context, jsOffPage: await context.newPage() };
}

async function saveJsOffVideo(context: BrowserContext, jsOffPage: Page, name: string): Promise<void> {
  const video = jsOffPage.video();
  await context.close();
  if (video) copyFileSync(await video.path(), join(VIDEOS, `inc-194--main--${name}-js-off.webm`));
}

function capture(title: string, videoName: string): string {
  videoNameByTitle.set(title, videoName);
  return title;
}

test.afterEach(async ({ page }, testInfo) => {
  const videoName = videoNameByTitle.get(testInfo.title);
  const video = page.video();
  await page.close();
  if (videoName && video) copyFileSync(await video.path(), join(VIDEOS, `inc-194--main--${videoName}.webm`));
});

test.describe('INS add page from the address book', () => {
  test(
    capture('Destination, Consignee or Importer opens with every address and contact field and no search', 'ins-ab-destination-opens'),
    async ({ page, insPages }) => {
      await toInsAddForm(insPages, page, addressTypes.destinationConsigneeOrImporter);
      await expect(insPages.addressBookAdd.inputAddressLine1).toBeVisible();
      await shoot(page, 'ins-ab-destination-opens-all-fields');
    },
  );

  test(
    capture('Destination, Consignee or Importer saved empty shows each field error on a visible field', 'ins-ab-destination-empty-save'),
    async ({ page, insPages }) => {
      await toInsAddForm(insPages, page, addressTypes.destinationConsigneeOrImporter);
      await insPages.addressBookAdd.saveAndContinue();
      await pause(page);
      await expect(insPages.addressBookAdd.errorSummary).toBeVisible();
      await shoot(page, 'ins-ab-destination-empty-save-errors');
      await shootElement(insPages.addressBookAdd.errorSummary, 'ins-ab-destination-error-summary');

      await insPages.addressBookAdd.errorSummaryLinks.first().click();
      await pause(page);
      await shoot(page, 'ins-ab-destination-first-error-link-followed', { fullPage: false });
    },
  );

  test(capture('Branch opens with every address and contact field and no search', 'ins-ab-branch-opens'), async ({ page, insPages }) => {
    await toInsAddForm(insPages, page, addressTypes.branch);
    await expect(insPages.addressBookAdd.inputAddressLine1).toBeVisible();
    await shoot(page, 'ins-ab-branch-opens-all-fields');
  });

  test(
    capture('Destination, Consignee or Importer without JavaScript shows the same fields', 'ins-ab-destination-no-js'),
    async ({ browser, page, insPages }, testInfo) => {
      await toInsAddForm(insPages, page, addressTypes.destinationConsigneeOrImporter);
      const { context, jsOffPage } = await openWithoutJavaScript(browser, page, testInfo);
      const jsOffAddPage = new InsAddressBookAddPage(jsOffPage);
      await jsOffPage.goto(page.url());
      await jsOffAddPage.heading.waitFor();
      await pause(jsOffPage);
      await shoot(jsOffPage, 'nojs-ins-ab-destination-opens-all-fields');

      await jsOffAddPage.saveAndContinue();
      await pause(jsOffPage);
      await shoot(jsOffPage, 'nojs-ins-ab-destination-empty-save-errors');
      await saveJsOffVideo(context, jsOffPage, 'ins-ab-destination-no-js');
    },
  );
});

test.describe('INS add page from the notification journey', () => {
  test(
    capture('the Consignee picker opens the add page with every field and no search', 'ins-consignee-journey-add'),
    async ({ page, animalsJourney, insPages }) => {
      await animalsJourney.toPartyPicker('Consignee');
      await pause(page);
      await animalsJourney.openInsAddAddressFromPicker(insPages.addressBookAdd, 'Consignee');
      await pause(page);
      await expect(insPages.addressBookAdd.inputAddressLine1).toBeVisible();
      await shoot(page, 'ins-consignee-journey-add-opens-all-fields');
    },
  );
});

test.describe('commercial transporter form', () => {
  test(
    capture('opens with every address and contact field and no search; a blank record saves, a partial one shows errors', 'animals-commercial-transporter-opens'),
    async ({ page, animalsJourney, animalsPages }) => {
      await animalsJourney.toCommercialTransporter();
      await pause(page);
      await shoot(page, 'animals-commercial-transporter-opens-all-fields');

      await animalsPages.commercialTransporter.saveAndContinue.click();
      await pause(page);
      await expect(animalsPages.overview.heading).toBeVisible();
      await shoot(page, 'animals-commercial-transporter-empty-save-is-optional');

      await animalsJourney.toCommercialTransporter();
      await animalsPages.commercialTransporter.approvalNumber.fill('NI/TA/2026/0041');
      await pause(page);
      await animalsPages.commercialTransporter.saveAndContinue.click();
      await pause(page);
      await expect(animalsPages.commercialTransporter.errorSummary).toBeVisible();
      await shoot(page, 'animals-commercial-transporter-partial-save-errors');
    },
  );

  test(
    capture('without JavaScript shows the same fields', 'animals-commercial-transporter-no-js'),
    async ({ browser, page, animalsJourney }, testInfo) => {
      await animalsJourney.toCommercialTransporter();
      const { context, jsOffPage } = await openWithoutJavaScript(browser, page, testInfo);
      await jsOffPage.goto(page.url());
      await new AnimalsCommercialTransporterPage(jsOffPage).heading.waitFor();
      await pause(jsOffPage);
      await shoot(jsOffPage, 'nojs-animals-commercial-transporter-opens-all-fields');
      await saveJsOffVideo(context, jsOffPage, 'animals-commercial-transporter-no-js');
    },
  );
});

test.describe('address lookup spike', () => {
  test(capture('the dev and local spike page searches a postcode on the server', 'ins-address-lookup-spike'), async ({ page, insPages }) => {
    await insPages.addressBookAdd.navigateToInsFrontend('/address-lookup-spike');
    await insPages.addressBookAdd.completeSignInIfRequested();
    await pause(page);
    await shoot(page, 'ins-address-lookup-spike-opens');

    await page.getByLabel('Postcode or address').fill(LOOKUP_SPIKE_POSTCODE);
    await pause(page);
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await pause(page);
    await shoot(page, 'ins-address-lookup-spike-results');
  });
});
