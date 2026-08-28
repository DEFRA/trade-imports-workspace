# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/features/ins/aggregated-notification.spec.ts >> Aggregated notification store >> creates and updates aggregated notification document through the submission lifecycle
- Location: tests/e2e/features/ins/aggregated-notification.spec.ts:16:3

# Error details

```
Error: expect(received).toBeInstanceOf(expected)

Expected constructor: Date

Received value has no prototype
Received value: undefined
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to main content" [ref=e2] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e3]:
    - link "GOV.UK" [ref=e7] [cursor=pointer]:
      - /url: https://www.gov.uk/
      - img "GOV.UK" [ref=e8]
    - region "Service information" [ref=e21]:
      - generic [ref=e23]:
        - link "Import notification service" [ref=e25] [cursor=pointer]:
          - /url: /
        - navigation "Menu" [ref=e26]:
          - list [ref=e27]:
            - listitem [ref=e28]:
              - link "Dashboard" [ref=e29] [cursor=pointer]:
                - /url: /
                - strong [ref=e30]: Dashboard
            - listitem [ref=e31]:
              - link "Address book" [ref=e32] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e33]:
              - link "Manage account" [ref=e34] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e35]:
              - link "Log out" [ref=e36] [cursor=pointer]:
                - /url: /auth/sign-out
  - generic [ref=e37]:
    - paragraph [ref=e39]:
      - strong [ref=e40]: Alpha
      - generic [ref=e41]:
        - text: This is a new service. Help us improve it and
        - link "give your feedback by email" [ref=e42] [cursor=pointer]:
          - /url: mailto:APHAServiceDesk@apha.gov.uk
        - text: .
    - link "Back" [ref=e43] [cursor=pointer]:
      - /url: /notifications/GBN-AG-26-HRDK4W/notification-view
    - main [ref=e44]:
      - generic [ref=e46]:
        - generic [ref=e47]:
          - strong [ref=e48]: Draft
          - text: GBN-AG-26-HRDK4W
        - heading "Declaration" [level=1] [ref=e49]
        - heading "I am the contact for the authorities and located in the UK." [level=2] [ref=e50]
        - heading "I confirm I am responsible for this consignment until it has cleared border control checks or reached the place of destination." [level=2] [ref=e51]
        - heading "I confirm that I am accountable for:" [level=2] [ref=e52]
        - list [ref=e53]:
          - listitem [ref=e54]: payments for border control checks
          - listitem [ref=e55]: re-dispatch of the consignment
          - listitem [ref=e56]: quarantine or isolation of the animals
          - listitem [ref=e57]: the costs of destruction and disposal
        - paragraph [ref=e58]: I am authorised as being accountable for these things if raising notifications on behalf of a third party.
        - paragraph [ref=e59]: I can legally act on behalf of a third party in relation to the conditions of this declaration.
        - generic [ref=e60]:
          - generic [ref=e63]:
            - checkbox "I confirm that I have reviewed and comply with this declaration and that the information submitted in this notification is true and correct." [ref=e64] [cursor=pointer]
            - generic [ref=e65] [cursor=pointer]: I confirm that I have reviewed and comply with this declaration and that the information submitted in this notification is true and correct.
          - paragraph [ref=e66]: "Date of declaration: 28 August 2026"
          - button "Continue" [ref=e67] [cursor=pointer]
  - contentinfo [ref=e68]:
    - generic [ref=e81]:
      - generic [ref=e82]:
        - heading "Support links" [level=2] [ref=e83]
        - list [ref=e84]:
          - listitem [ref=e85]:
            - link "Privacy" [ref=e86] [cursor=pointer]:
              - /url: https://www.gov.uk/help/privacy-notice
          - listitem [ref=e87]:
            - link "Cookies" [ref=e88] [cursor=pointer]:
              - /url: https://www.gov.uk/help/cookies
          - listitem [ref=e89]:
            - link "Accessibility statement" [ref=e90] [cursor=pointer]:
              - /url: https://www.gov.uk/help/accessibility-statement
        - img [ref=e91]
        - generic [ref=e93]:
          - text: All content is available under the
          - link "Open Government Licence v3.0" [ref=e94] [cursor=pointer]:
            - /url: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
          - text: ", except where otherwise stated"
      - link "© Crown copyright" [ref=e96] [cursor=pointer]:
        - /url: https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright/
```

# Test source

```ts
  1  | import { test, expect } from '@fixtures';
  2  | import { MongoDbClient } from '@adapters/db/mongodb-client';
  3  | import { defaultJourneyOptions } from '@domain/constants/journey-options';
  4  | import { type AggregatedNotificationDocument } from '@domain/models/db/aggregated-notification-document';
  5  | import { timeouts } from '@config/timeouts';
  6  | import { getMongoDbUri } from '@config/service-base-urls';
  7  | import { skipUnlessComposeEnvironment } from '@utils/playwright/environment';
  8  | 
  9  | const aggregateIdFor = (referenceNumber: string): string => `Imports.Notification.GBN-AG.${referenceNumber}`;
  10 | 
  11 | test.describe('Aggregated notification store', { tag: ['@compose', '@integration', '@mongodb'] }, () => {
  12 |   test.beforeEach(() => {
  13 |     skipUnlessComposeEnvironment('aggregated notification assertions read Mongo directly, which only the compose stack exposes');
  14 |   });
  15 | 
  16 |   test('creates and updates aggregated notification document through the submission lifecycle', async ({
  17 |     journey,
  18 |     journeyContext,
  19 |     pages,
  20 |   }) => {
  21 |     test.slow();
  22 | 
  23 |     // Given — complete the journey up to the declaration page (notification is in DRAFT)
  24 |     await journey.toDeclaration();
  25 |     const referenceNumber = journeyContext.journeyId;
  26 |     const aggregateId = aggregateIdFor(referenceNumber);
  27 |     const client = new MongoDbClient(getMongoDbUri());
  28 | 
  29 |     try {
  30 |       await client.connect();
  31 |       const collection = client.collection<AggregatedNotificationDocument>('trade-imports-ins-backend', 'notifications');
  32 | 
  33 |       // When — notification has been edited but not yet submitted
  34 |       // Then — aggregated store should reflect DRAFT status with all fields populated
  35 |       await expect.poll(() => collection.findOne({ _id: aggregateId, status: 'DRAFT' }), { timeout: timeouts.long }).not.toBeNull();
  36 | 
  37 |       const draftDoc = await collection.findOne({ _id: aggregateId });
  38 |       expect(draftDoc._id).toBe(aggregateId);
  39 |       expect(draftDoc.referenceNumber).toBe(referenceNumber);
  40 |       expect(draftDoc.status).toBe('DRAFT');
  41 |       expect(draftDoc.originCountry).toBe(defaultJourneyOptions.countryCode.value);
  42 |       // commodity omitted: see EUDPA-348 — Commodity.name not included in outbox event
> 43 |       expect(draftDoc.arrivalDate).toBeInstanceOf(Date);
     |                                    ^ Error: expect(received).toBeInstanceOf(expected)
  44 |       expect(draftDoc.arrivalDate.getTime()).toBeGreaterThan(Date.now());
  45 |       expect(draftDoc.lastUpdated).toBeInstanceOf(Date);
  46 |       expect(draftDoc.aggregateVersion).toBeGreaterThan(0);
  47 | 
  48 |       const draftVersion = draftDoc.aggregateVersion;
  49 | 
  50 |       // When — notification is submitted
  51 |       await pages.declaration.confirmation.check();
  52 |       await pages.declaration.continueButton.click();
  53 |       await pages.page.getByRole('heading', { name: 'Import notification submitted' }).waitFor();
  54 | 
  55 |       // Then — same document is updated to SUBMITTED (no duplicate created)
  56 |       await expect.poll(() => collection.findOne({ _id: aggregateId, status: 'SUBMITTED' }), { timeout: timeouts.long }).not.toBeNull();
  57 | 
  58 |       expect(await collection.countDocuments({ _id: aggregateId })).toBe(1);
  59 | 
  60 |       const submittedDoc = await collection.findOne({ _id: aggregateId });
  61 |       expect(submittedDoc._id).toBe(aggregateId);
  62 |       expect(submittedDoc.referenceNumber).toBe(referenceNumber);
  63 |       expect(submittedDoc.status).toBe('SUBMITTED');
  64 |       expect(submittedDoc.originCountry).toBe(defaultJourneyOptions.countryCode.value);
  65 |       // commodity omitted: see EUDPA-348 — Commodity.name not included in outbox event
  66 |       expect(submittedDoc.arrivalDate).toBeInstanceOf(Date);
  67 |       expect(submittedDoc.arrivalDate.getTime()).toBeGreaterThan(Date.now());
  68 |       expect(submittedDoc.lastUpdated).toBeInstanceOf(Date);
  69 |       expect(submittedDoc.aggregateVersion).toBeGreaterThan(draftVersion);
  70 |     } finally {
  71 |       await client.close();
  72 |     }
  73 |   });
  74 | });
  75 | 
```