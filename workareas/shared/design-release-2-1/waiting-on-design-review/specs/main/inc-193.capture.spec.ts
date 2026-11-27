import { copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Browser, Locator, Page, TestInfo } from '@playwright/test';
import { test, expect } from '@fixtures';
import type { AddressBookApiClient, AddressBookRecord } from '@adapters/http/address-book-api-client';
import { addressRoles, heldAsConsignor, heldAsPlaceOfOrigin, type HeldRoles } from '@domain/shared/constants/address-types';
import { roleOptionLabels } from '@domain/ins/constants/address-book-types';
import { nurseryAddress, PLANTS_FOR_PLANTING } from '@flows/plants/journey';

const REVIEW_DIR = join(homedir(), 'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review');
const SCREENS_DIR = join(REVIEW_DIR, 'screens/inc-193/main');
const VIDEOS_DIR = join(REVIEW_DIR, 'videos');
const VIEWPORT = { width: 1280, height: 800 };

test.use({ video: 'on', viewport: VIEWPORT });

const recording: { name: string; page: Page | null } = { name: '', page: null };

const pause = (page: Page) => page.waitForTimeout(1000);

async function shoot(page: Page, state: string, element?: Locator): Promise<void> {
  mkdirSync(SCREENS_DIR, { recursive: true });
  const path = join(SCREENS_DIR, `${state}.png`);
  if (element) {
    await element.screenshot({ path });
  } else {
    await page.screenshot({ path, fullPage: true });
  }
}

async function typeSlowly(page: Page, box: Locator, text: string): Promise<void> {
  await box.click();
  await pause(page);
  await box.pressSequentially(text, { delay: 250 });
  await pause(page);
}

async function openWithoutJavaScript(browser: Browser, page: Page, testInfo: TestInfo): Promise<Page> {
  const context = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: VIEWPORT,
    javaScriptEnabled: false,
    storageState: await page.context().storageState(),
    recordVideo: { dir: testInfo.outputPath('js-off-video'), size: VIEWPORT },
  });
  const jsOffPage = await context.newPage();
  recording.page = jsOffPage;
  await jsOffPage.goto(page.url());
  await pause(jsOffPage);
  return jsOffPage;
}

const DANISH_ADDRESS = {
  addressLine1: 'Havnegade 21',
  townOrCity: 'Copenhagen',
  postcode: '1058',
  countryCode: 'DK',
  phone: '01228 555 0197',
  email: 'searchable@example.co.uk',
};

async function seedDanishAddresses(api: AddressBookApiClient, token: string, held: HeldRoles): Promise<AddressBookRecord[]> {
  const records: AddressBookRecord[] = [];
  for (const name of [`Danish Meat Export ${token}`, `Jutland Swine ${token}`]) {
    records.push(await api.createAddress({ ...held, ...DANISH_ADDRESS, name }));
  }
  return records;
}

async function deleteAll(api: AddressBookApiClient, records: AddressBookRecord[]): Promise<void> {
  for (const record of records) {
    await api.deleteAddress(record.id);
  }
}

const runToken = () => `Kolding${Date.now()}`;

test.beforeEach(() => {
  recording.name = '';
  recording.page = null;
});

test.afterEach(async ({ page }) => {
  const recorded = recording.page ?? page;
  await recorded.close();
  if (recorded !== page) {
    await recorded.context().close();
    await page.close();
  }
  const video = recorded.video();
  if (video && recording.name) {
    mkdirSync(VIDEOS_DIR, { recursive: true });
    copyFileSync(await video.path(), join(VIDEOS_DIR, `inc-193--main--${recording.name}.webm`));
  }
});

test.describe('live animals party pickers', () => {
  test('consignor picker: typing changes nothing until the search button or Enter searches on the server', async ({
    animalsJourney,
    addressBookApi,
    page,
  }) => {
    recording.name = 'animals-consignor-picker-js-on';
    const token = runToken();
    const seeded = await seedDanishAddresses(addressBookApi, token, heldAsConsignor);
    try {
      await animalsJourney.toPartyPicker('Consignor');
      const picker = animalsJourney.partyPicker('Consignor');
      await pause(page);
      await shoot(page, 'animals-consignor-picker-initial');
      await shoot(page, 'animals-consignor-picker-search-box', picker.searchRow);

      await typeSlowly(page, picker.searchBox, token);
      await expect.soft(picker.resultsSummary).toHaveText(/^Showing 5 out of \d+ results$/);
      await shoot(page, 'animals-consignor-picker-typed-no-change');

      await picker.searchButton.click();
      await pause(page);
      await expect.soft(picker.resultsSummary).toHaveText('Showing 2 out of 2 results');
      await shoot(page, 'animals-consignor-picker-searched');
      await shoot(page, 'animals-consignor-picker-searched-count', picker.resultsSummary);

      await picker.searchBox.fill('');
      await pause(page);
      await picker.searchBox.press('Enter');
      await pause(page);
      await shoot(page, 'animals-consignor-picker-cleared-with-enter');
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });

  test('place of origin picker: a country name searched on the server', async ({ animalsJourney, addressBookApi, page }) => {
    recording.name = 'animals-place-of-origin-picker-js-on';
    const token = runToken();
    const seeded = await seedDanishAddresses(addressBookApi, token, heldAsPlaceOfOrigin);
    try {
      await animalsJourney.toPartyPicker('Place of origin');
      const picker = animalsJourney.partyPicker('Place of origin');
      await pause(page);
      await shoot(page, 'animals-place-of-origin-picker-initial');

      await typeSlowly(page, picker.searchBox, 'Denmark');
      await shoot(page, 'animals-place-of-origin-picker-typed-denmark-no-change');

      await picker.searchButton.click();
      await pause(page);
      await shoot(page, 'animals-place-of-origin-picker-searched-denmark');

      await picker.searchBox.fill('Copenhagen');
      await pause(page);
      await picker.searchButton.click();
      await pause(page);
      await shoot(page, 'animals-place-of-origin-picker-searched-copenhagen');
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });

  test('consignor picker without JavaScript: Enter in the search box searches on the server', async ({
    browser,
    page,
    animalsJourney,
    addressBookApi,
  }, testInfo) => {
    recording.name = 'animals-consignor-picker-js-off';
    const token = runToken();
    const seeded = await seedDanishAddresses(addressBookApi, token, heldAsConsignor);
    try {
      await animalsJourney.toPartyPicker('Consignor');
      const jsOffPage = await openWithoutJavaScript(browser, page, testInfo);
      const searchBox = jsOffPage.getByLabel('Search', { exact: true });
      await shoot(jsOffPage, 'animals-consignor-picker-js-off-initial');

      await searchBox.fill(token);
      await pause(jsOffPage);
      await searchBox.press('Enter');
      await jsOffPage.waitForLoadState('load');
      await pause(jsOffPage);
      await shoot(jsOffPage, 'animals-consignor-picker-js-off-searched');
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });

  test('transporter list: typing narrows the rows in the page and bolds the matching letters', async ({ animalsJourney, animalsPages, page }) => {
    recording.name = 'animals-transporter-list-js-on';
    await animalsJourney.toTransporter();
    const transporters = animalsPages.transporter;
    await pause(page);
    await shoot(page, 'animals-transporter-list-initial');

    const firstName = (await transporters.listedTransporters.first().getByRole('cell').nth(1).innerText()).trim();
    await typeSlowly(page, transporters.searchBox, firstName.slice(0, 4));
    await shoot(page, 'animals-transporter-list-typed');

    await transporters.searchBox.fill('zzzz');
    await pause(page);
    await shoot(page, 'animals-transporter-list-no-matches');
  });
});

test.describe('INS address book list', () => {
  test('typing or choosing a Type changes nothing until Enter or the search button reloads the page', async ({
    insPages,
    addressBookApi,
    page,
  }) => {
    recording.name = 'ins-address-book-list-js-on';
    const token = runToken();
    const seeded = await seedDanishAddresses(addressBookApi, token, heldAsConsignor);
    try {
      const list = insPages.addressBookList;
      await list.navigateToInsFrontend(list.expectedUrl);
      await list.completeSignInIfRequested();
      await list.heading.waitFor();
      await pause(page);
      await shoot(page, 'ins-address-book-initial');

      await list.filterSummary.click();
      await pause(page);
      await shoot(page, 'ins-address-book-filter-open');
      await shoot(page, 'ins-address-book-filter-controls', page.locator('form').filter({ has: list.inputSearch }));

      await typeSlowly(page, list.inputSearch, token);
      await shoot(page, 'ins-address-book-typed-no-change');

      await list.selectRoleFilter.selectOption({ label: roleOptionLabels[addressRoles.consignor] });
      await pause(page);
      await shoot(page, 'ins-address-book-type-chosen-no-change');

      await list.inputSearch.press('Enter');
      await page.waitForLoadState('load');
      await pause(page);
      await expect.soft(list.resultsLine).toHaveText('Showing 1-2 of 2');
      await shoot(page, 'ins-address-book-submitted');
      await shoot(page, 'ins-address-book-submitted-results-line', list.resultsLine);
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });

  test('without JavaScript the search button submits the GET form and the server narrows the list', async ({
    browser,
    insPages,
    addressBookApi,
    page,
  }, testInfo) => {
    recording.name = 'ins-address-book-list-js-off';
    const token = runToken();
    const seeded = await seedDanishAddresses(addressBookApi, token, heldAsConsignor);
    try {
      const list = insPages.addressBookList;
      await list.navigateToInsFrontend(list.expectedUrl);
      await list.completeSignInIfRequested();
      await list.heading.waitFor();
      const jsOffPage = await openWithoutJavaScript(browser, page, testInfo);
      await shoot(jsOffPage, 'ins-address-book-js-off-initial');

      await jsOffPage.getByText('Filter addresses', { exact: true }).click();
      await pause(jsOffPage);
      const searchBox = jsOffPage.getByRole('searchbox', { name: 'Search', exact: true });
      await searchBox.fill(token);
      await pause(jsOffPage);
      await jsOffPage.getByRole('button', { name: 'Search', exact: true }).click();
      await jsOffPage.waitForLoadState('load');
      await pause(jsOffPage);
      await expect.soft(jsOffPage.getByTestId('address-book-results-label')).toHaveText('Showing 1-2 of 2');
      await shoot(jsOffPage, 'ins-address-book-js-off-searched');
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });
});

test.describe('high-risk plants party pickers', () => {
  test('place of destination picker: typing changes nothing until the search button searches on the server', async ({
    plantsJourney,
    plantsPages,
    addressBookApi,
    page,
  }) => {
    recording.name = 'plants-place-of-destination-picker-js-on';
    const token = runToken();
    const seeded: AddressBookRecord[] = [];
    for (const name of [`Perth Nursery ${token}`, `Tay Valley Plants ${token}`]) {
      seeded.push(await addressBookApi.createAddress(nurseryAddress(name)));
    }
    try {
      await plantsJourney.toDestinationOfNewNotification(PLANTS_FOR_PLANTING);
      const picker = plantsPages.placeOfDestination;
      await pause(page);
      await shoot(page, 'plants-place-of-destination-picker-initial');

      await typeSlowly(page, picker.searchBox, token);
      await shoot(page, 'plants-place-of-destination-picker-typed-no-change');

      await picker.searchButton.click();
      await pause(page);
      await expect.soft(picker.resultsSummary).toHaveText('Showing 2 out of 2 results');
      await shoot(page, 'plants-place-of-destination-picker-searched');
    } finally {
      await deleteAll(addressBookApi, seeded);
    }
  });
});
