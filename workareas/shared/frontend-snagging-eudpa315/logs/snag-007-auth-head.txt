import { test, expect } from '@fixtures';

test.describe('Authentication', { tag: ['@auth', '@integration'] }, () => {
  test.beforeEach(async ({ journey, pages }) => {
    await journey.toSignIn((attemptSignIn) => pages.notificationDashboard.open(attemptSignIn));
  });

  test('lands on the sign in page when opening the notification dashboard', async ({ pages }) => {
    await expect(pages.page).toHaveURL(pages.signIn.expectedUrl);
    await expect(pages.signIn.heading).toBeVisible();
  });

  test('allows signing into the notification dashboard', { tag: '@smoke' }, async ({ pages }) => {
    await pages.signIn.signIn();
    await expect(pages.page).toHaveURL(pages.notificationDashboard.expectedUrl);
    await expect(pages.notificationDashboard.heading).toBeVisible();
  });

  test('displays an error message when signing in with invalid user id', async ({ pages }) => {
    await pages.signIn.signIn({ userId: 'invalid' });
    await expect(pages.page).toHaveURL(pages.signIn.expectedUrl);
    await expect(pages.signIn.errorSummary).toContainText('Enter a valid 10-digit customer reference number (CRN) and password');
  });

  test('displays an error message when signing in with invalid password', async ({ pages }) => {
    await pages.signIn.signIn({ password: 'invalid' });
    await expect(pages.page).toHaveURL(pages.signIn.expectedUrl);
    await expect(pages.signIn.errorSummary).toContainText('Enter a valid 10-digit customer reference number (CRN) and password');
  });

  test('allows signing out after signing in', async ({ pages }) => {
    await pages.signIn.signIn();
    await pages.notificationDashboard.linkSignOut.click();
    await expect(pages.page).toHaveURL(pages.signOut.expectedUrl);
    await expect(pages.signOut.heading).toBeVisible();
  });

  test('displays signed in user after signing in', async ({ pages }) => {
    await pages.signIn.signIn();
    await expect(pages.notificationDashboard.user()).toBeVisible();
  });

  test('lands on the sign in page when reopening the notification dashboard after sign out', async ({ pages }) => {
    await pages.signIn.signIn();
    await pages.notificationDashboard.linkSignOut.click();
    await pages.signOut.heading.waitFor();
    await pages.notificationDashboard.open(false);
    await expect(pages.page).toHaveURL(pages.signIn.expectedUrl);
    await expect(pages.signIn.heading).toBeVisible();
  });

  test.describe('Origin of the import (unauthenticated entry)', () => {
    let journeyId: string;

    test.beforeEach(async ({ pages }) => {
      await pages.signIn.signIn();
      await pages.notificationDashboard.btnCreateNewNotification.click();
      journeyId = pages.importType.journeyIdFromUrl();
      await pages.importType.liveAnimals.check();
      await pages.importType.continueButton.click();
      await pages.originOfImport.selectCountry('France');
      await pages.originOfImport.radioRequiresOriginCode('No').check();
      await pages.originOfImport.saveAndContinue.click();
      const journeyCookies = (await pages.page.context().cookies()).filter(({ name }) => name.startsWith('liveAnimals'));
      await pages.page.context().clearCookies();
      await pages.page.context().addCookies(journeyCookies);
      await pages.originOfImport.open(journeyId, false);
    });

    test('lands on the sign in page when opening a page further in the journey', async ({ pages }) => {
      await expect(pages.page).toHaveURL(pages.signIn.expectedUrl);
      await expect(pages.signIn.heading).toBeVisible();
    });

    test('allows signing into a page further in the journey', async ({ pages }) => {
      await pages.signIn.signIn();
      await expect(pages.page).toHaveURL(new RegExp(`/notifications/${journeyId}/origin$`));
      await expect(pages.originOfImport.heading).toBeVisible();
    });
  });
});
