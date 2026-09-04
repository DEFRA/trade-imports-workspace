# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/features/cancel-amend-ui.spec.ts >> Cancel amendment through the UI >> Yes cancels the amendment and restores the submitted answers
- Location: tests/e2e/features/cancel-amend-ui.spec.ts:47:8

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/notification-view\?cancelled=1$/
Received string:  "http://localhost:3000/notifications/GBN-AG-26-BA4RRB/cancel-amend"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:3000/notifications/GBN-AG-26-BA4RRB/cancel-amend"

```

```yaml
- link "Skip to main content":
  - /url: "#main-content"
- banner:
  - link "GOV.UK":
    - /url: https://www.gov.uk/
    - img "GOV.UK"
  - region "Service information":
    - link "Import notification service":
      - /url: /
    - navigation "Menu":
      - list:
        - listitem:
          - link "Dashboard":
            - /url: /
            - strong: Dashboard
        - listitem:
          - link "Address book":
            - /url: "#"
        - listitem:
          - link "Manage account":
            - /url: "#"
        - listitem:
          - link "Log out":
            - /url: /auth/sign-out
- paragraph:
  - strong: Alpha
  - text: This is a new service. Help us improve it and
  - link "give your feedback by email":
    - /url: mailto:APHAServiceDesk@apha.gov.uk
  - text: .
- link "Back":
  - /url: /notifications/GBN-AG-26-BA4RRB/notification-view
- main:
  - alert "There is a problem":
    - heading "There is a problem" [level=2]
    - paragraph: Sorry, there is a problem with the service. Your answers on this page have been saved. Try again in a few minutes.
  - strong: Amending
  - text: GBN-AG-26-BA4RRB
  - heading "Cancel this amendment?" [level=1]
  - paragraph: Your changes since you started amending will be discarded and the submitted version restored.
  - button "Yes, cancel amendment"
  - button "No, return to notification"
- contentinfo:
  - heading "Support links" [level=2]
  - list:
    - listitem:
      - link "Privacy":
        - /url: https://www.gov.uk/help/privacy-notice
    - listitem:
      - link "Cookies":
        - /url: https://www.gov.uk/help/cookies
    - listitem:
      - link "Accessibility statement":
        - /url: https://www.gov.uk/help/accessibility-statement
  - text: All content is available under the
  - link "Open Government Licence v3.0":
    - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
  - text: ", except where otherwise stated"
  - link "© Crown copyright":
    - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import { test, expect } from '@fixtures';
  2  | 
  3  | /**
  4  |  * Cancel-amendment through the UI. An amending notification offers a Cancel
  5  |  * amendment link on the notification view; the confirmation page's
  6  |  * No keeps the amendment, Yes discards the amend edits and restores the
  7  |  * submitted version.
  8  |  */
  9  | test.describe('Cancel amendment through the UI', { tag: ['@integration'] }, () => {
  10 |   test.describe('from an amending notification', () => {
  11 |     test.beforeEach(async ({ apiJourney, notificationActions }) => {
  12 |       const created = await apiJourney.createAmendNotification();
  13 |       await notificationActions.toNotificationView(created.referenceNumber);
  14 |     });
  15 | 
  16 |     test('shows the Cancel amendment link while the notification is amending', async ({ pages }) => {
  17 |       await expect(pages.notificationView.journeyStrip).toContainText('Amending');
  18 |       await expect(pages.notificationView.cancelAmendment).toBeVisible();
  19 |     });
  20 | 
  21 |     test('opens the confirmation page when Cancel amendment is selected', async ({ pages, journeyContext }) => {
  22 |       await pages.notificationView.cancelAmendment.click();
  23 | 
  24 |       await expect(pages.page).toHaveURL(new RegExp(`${pages.notificationCancelAmend.expectedUrl(journeyContext.referenceNumber)}$`));
  25 |       await expect(pages.notificationCancelAmend.heading).toBeVisible();
  26 |       await expect(
  27 |         pages.page.getByText('Your changes since you started amending will be discarded and the submitted version restored.'),
  28 |       ).toBeVisible();
  29 |       await expect(pages.notificationCancelAmend.confirm).toBeVisible();
  30 |       await expect(pages.notificationCancelAmend.reject).toBeVisible();
  31 |     });
  32 | 
  33 |     test('No returns to the notification view with the amendment still in progress', async ({ pages, journeyContext }) => {
  34 |       await pages.notificationView.cancelAmendment.click();
  35 |       await pages.notificationCancelAmend.reject.click();
  36 | 
  37 |       await expect(pages.page).toHaveURL(new RegExp(`${pages.notificationView.expectedUrl(journeyContext.referenceNumber)}$`));
  38 |       await expect(pages.notificationView.journeyStrip).toContainText('Amending');
  39 |       await expect(pages.notificationView.cancelAmendment).toBeVisible();
  40 |       await expect(pages.notificationView.changeLink('Change country of origin')).toBeVisible();
  41 |     });
  42 |   });
  43 | 
  44 |   // Fails on EUDPA-389: no actor is forwarded on cancel-amend, so the backend
  45 |   // cannot resolve the address-book parties and answers 400 — served as a 500.
  46 |   // Remove the test.fail() once it lands.
  47 |   test.fail(
  48 |     'Yes cancels the amendment and restores the submitted answers',
  49 |     { tag: '@smoke' },
  50 |     async ({ pages, apiJourney, notificationActions }) => {
  51 |       const created = await apiJourney.createAmendNotification();
  52 |       await notificationActions.toNotificationView(created.referenceNumber);
  53 | 
  54 |       const countryRow = pages.page.locator('.govuk-summary-list__row', { hasText: 'Country of origin' });
  55 |       await expect(countryRow).toContainText('France');
  56 | 
  57 |       await pages.notificationView.changeLink('Change country of origin').click();
  58 |       await expect(pages.originOfImport.heading).toBeVisible();
  59 |       await pages.originOfImport.selectCountry('Belgium');
  60 |       await pages.originOfImport.saveAndContinue.click();
  61 |       await expect(pages.notificationView.heading).toBeVisible();
  62 |       await expect(countryRow).toContainText('Belgium');
  63 | 
  64 |       await pages.notificationView.cancelAmendment.click();
  65 |       await pages.notificationCancelAmend.confirm.click();
  66 | 
> 67 |       await expect(pages.page).toHaveURL(/\/notification-view\?cancelled=1$/);
     |                                ^ Error: expect(page).toHaveURL(expected) failed
  68 |       await expect(pages.page.getByRole('alert')).toContainText('The amendment has been cancelled and the submitted version restored.');
  69 |       await expect(pages.notificationView.journeyStrip).toContainText('Submitted');
  70 |       await expect(pages.notificationView.cancelAmendment).not.toBeVisible();
  71 |       await expect(pages.page.getByRole('link', { name: /^Change/ })).toHaveCount(0);
  72 |       await expect(countryRow).toContainText('France');
  73 |     },
  74 |   );
  75 | });
  76 | 
```