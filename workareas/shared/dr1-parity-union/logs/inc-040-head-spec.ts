import { test, expect } from '@fixtures';

test.describe('Animal identifiers — conditional identifier surface', { tag: ['@integration', '@duplicated-in-frontend'] }, () => {
  test('a unit form shows only the identifier types the commodity requires, plus the permanent address for cats and dogs', async ({
    journey,
    pages,
  }) => {
    await journey.startNotification();

    // Batch-create a Cats commodity line. The animal count is save-blocking,
    // and a count of 2 keeps the identifier form open after the first record
    // is committed — at the declared count the maximum-reached state replaces
    // it, which is the cap spec's subject, not this one's.
    await pages.overview.task('What are you importing?').click();
    await pages.commoditySelection.selectSpecies(['Felis catus']);
    await pages.commoditySelection.saveAndContinue.click();
    await expect(pages.consignmentDetails.heading).toBeVisible();

    await pages.consignmentDetails.numberOfAnimals.fill('2');
    await pages.consignmentDetails.saveAndContinue.click();
    await expect(pages.overview.heading).toBeVisible();
    await pages.overview.task('Animal identification details').click();
    await expect(pages.animalIdentification.heading).toBeVisible();
    await expect(pages.page.getByRole('heading', { name: 'Enter details for Felis catus' })).toBeVisible();

    // Cats gate passport + tattoo + permanent address on; ear tag + horse name
    // are hidden, because they belong to other commodities. Nothing offers a
    // free-text identifier: the page asks for the commodity's own types or it
    // asks for nothing.
    await expect(pages.animalIdentification.passportNumber).toBeVisible();
    await expect(pages.page.getByLabel('Tattoo')).toBeVisible();
    await expect(pages.animalIdentification.earTag).toBeHidden();
    await expect(pages.page.getByLabel('Horse name')).toBeHidden();
    await expect(pages.page.getByLabel('Identification details')).toHaveCount(0);
    await expect(pages.page.getByLabel('Animal description')).toHaveCount(0);
    await expect(pages.page.getByLabel('Name or organisation name')).toBeVisible();
    // The permanent address block asks for eight fields and no country — an
    // address APHA can inspect is a Great Britain address, so there is nothing
    // to choose.
    await expect(pages.page.getByLabel('Country')).toHaveCount(0);

    // A partial permanent address blocks the add — the fieldGroup mandates apply
    // once any part of the record is provided.
    await pages.animalIdentification.passportNumber.fill('UK123456789');
    await pages.page.getByLabel('Name or organisation name').fill('Pet Owner');
    await pages.animalIdentification.saveAndAddAnother.click();
    await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
    await expect(pages.page.getByRole('link', { name: 'Enter address line 1' })).toBeVisible();

    // Completing the mandatory address fields commits the unit with its
    // { name, address } permanent address and keeps the surface open.
    await pages.page.getByLabel('Address line 1').fill('1 Farm Lane');
    await pages.page.getByLabel('Town or city').fill('Skipton');
    await pages.page.getByLabel('Postcode or Zip code').fill('BD23 1UD');
    await pages.page.getByLabel('Phone number').fill('+44 1756 555 0192');
    await pages.page.getByLabel('Email address').fill('owner@example.co.uk');
    await pages.animalIdentification.saveAndAddAnother.click();

    await expect(pages.animalIdentification.heading).toBeVisible();
    const unitRow = pages.animalIdentification.savedAnimalRow('Felis catus', 1);
    await expect(pages.animalIdentification.identifierColumn('Permanent address')).toBeVisible();
    await expect(unitRow.getByRole('cell', { name: 'UK123456789', exact: true })).toBeVisible();
    await expect(unitRow.getByRole('cell', { name: 'Pet Owner', exact: true })).toBeVisible();
  });

  test('a commodity with no identifier type of its own gets no panel, while the lines that have one keep theirs', async ({
    journey,
    pages,
  }) => {
    await journey.startNotification();

    // Cow carries an ear tag; Fish is on none of the identifier allowlists, so
    // it has nothing to be asked. One consignment holding both separates the
    // two: the page still exists for the Cow line and says nothing at all
    // about the Fish one.
    await pages.overview.task('What are you importing?').click();
    await pages.commoditySelection.selectSpecies(['Bos taurus', 'Salmo salar']);
    await pages.commoditySelection.saveAndContinue.click();
    await expect(pages.consignmentDetails.heading).toBeVisible();

    // The count is save-blocking on every line the page shows, so both are filled.
    await pages.consignmentDetails.fillEveryAnimalCount('1');
    await pages.consignmentDetails.saveAndContinue.click();
    await expect(pages.overview.heading).toBeVisible();
    await pages.overview.task('Animal identification details').click();
    await expect(pages.animalIdentification.heading).toBeVisible();

    await expect(pages.page.getByRole('heading', { name: 'Enter details for Bos taurus' })).toBeVisible();
    await expect(pages.animalIdentification.earTag).toBeVisible();
    // No panel for the Fish line, and no free-text stand-in for the identifier
    // it does not have.
    await expect(pages.page.getByRole('heading', { name: 'Enter details for Salmo salar' })).toHaveCount(0);
    await expect(pages.page.getByLabel('Identification details')).toHaveCount(0);
    await expect(pages.page.getByLabel('Animal description')).toHaveCount(0);
  });

  test('a consignment where no commodity has an identifier type never reaches the identification page', async ({ journey, pages }) => {
    await journey.startNotification();

    await pages.overview.task('What are you importing?').click();
    await pages.commoditySelection.selectSpecies(['Salmo salar']);
    await pages.commoditySelection.saveAndContinue.click();
    await expect(pages.consignmentDetails.heading).toBeVisible();

    await pages.consignmentDetails.numberOfAnimals.fill('2');
    await pages.consignmentDetails.saveAndContinue.click();
    await expect(pages.overview.heading).toBeVisible();

    // Nothing on this consignment carries an identifier, so the page does not
    // exist for this person: the request carries on to the next step of the
    // journey rather than rendering. Reached from the hub, that next step is
    // the hub — the point being that the page itself is never shown, and no
    // free-text stand-in is offered anywhere.
    const journeyId = pages.overview.journeyIdFromUrl();
    await pages.animalIdentification.open(journeyId);
    await expect(pages.overview.heading).toBeVisible();
    await expect(pages.animalIdentification.heading).toHaveCount(0);
    await expect(pages.page.getByLabel('Identification details')).toHaveCount(0);
    await expect(pages.page.getByLabel('Animal description')).toHaveCount(0);
  });
});
