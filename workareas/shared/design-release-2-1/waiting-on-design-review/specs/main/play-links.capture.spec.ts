import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { test } from '@fixtures';
import { heldAsConsignor, heldAsPlaceOfOrigin } from '@domain/shared/constants/address-types';
import { POTATOES } from '@flows/plants/journey';

const OUT = join(
  homedir(),
  'git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/waiting-on-design-review/play-links-main.json',
);

const readLinks = (): Record<string, string> => {
  try {
    return JSON.parse(readFileSync(OUT, 'utf8'));
  } catch {
    return {};
  }
};

const record = (key: string, page: Page): void => {
  writeFileSync(OUT, `${JSON.stringify({ ...readLinks(), [key]: page.url() }, null, 2)}\n`);
};

const DANISH_ADDRESS = {
  addressLine1: 'Havnegade 21',
  townOrCity: 'Copenhagen',
  postcode: '1058',
  countryCode: 'DK',
  phone: '01228 555 0197',
  email: 'searchable@example.co.uk',
};

test.describe.configure({ mode: 'serial' });

test('commodity search', async ({ animalsJourney, page }) => {
  await animalsJourney.toCommoditySelection();
  record('commodity', page);
});

test('transit countries', async ({ animalsJourney, page }) => {
  await animalsJourney.toTransitedCountries();
  record('transit', page);
});

test('origin country search, animals', async ({ animalsJourney, page }) => {
  await animalsJourney.toOriginOfImport();
  record('originAnimals', page);
});

test('origin country search, plants', async ({ plantsJourney, page }) => {
  await plantsJourney.toOriginOfNewNotification(POTATOES);
  record('originPlants', page);
});

test('consignor and place of origin pickers, with Danish addresses to search for', async ({
  animalsJourney,
  addressBookApi,
  page,
}) => {
  for (const name of ['Danish Meat Export Kolding', 'Jutland Swine Kolding']) {
    await addressBookApi.createAddress({ ...heldAsConsignor, ...DANISH_ADDRESS, name });
    await addressBookApi.createAddress({ ...heldAsPlaceOfOrigin, ...DANISH_ADDRESS, name: `${name} Farm` });
  }
  await animalsJourney.toPartyPicker('Consignor');
  record('pickerConsignor', page);
  await animalsJourney.toPartyPicker('Place of origin');
  record('pickerPlaceOfOrigin', page);
});

test('consignee picker', async ({ animalsJourney, page }) => {
  await animalsJourney.toPartyPicker('Consignee');
  record('pickerConsignee', page);
});

test('transporter list', async ({ animalsJourney, page }) => {
  await animalsJourney.toTransporter();
  record('transporter', page);
});

test('commercial transporter', async ({ animalsJourney, page }) => {
  await animalsJourney.toCommercialTransporter();
  record('commercialTransporter', page);
});

test('submitted notification', async ({ animalsSeededJourney, animalsPages, page }) => {
  const reference = await animalsSeededJourney.createSubmittedNotification();
  await animalsSeededJourney.resumeInUi(reference, animalsPages.notificationView);
  record('submitted', page);
});
