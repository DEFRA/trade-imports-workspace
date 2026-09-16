## What broke

`DEFRA/trade-imports-animals-frontend#352` (EUDPA-606, increment inc-040) renames six hub task rows to the Design release 1 wording. The E2E suite drives and asserts the hub **by row label**, so every spec that clicked one of the six timed out waiting for a link that no longer exists.

Four specs failed on the same locator, all of them through `flows/journey.ts:109`:

- `tests/e2e/features/admin/outbox-event-amendment.spec.ts`
- `tests/e2e/features/admin/outbox-event-notification.spec.ts`
- `tests/e2e/features/ins/aggregated-notification.spec.ts`
- `tests/e2e/features/ins/notification-dashboard-navigation.spec.ts`

each as `Test timeout of 90000ms exceeded — locator.click, waiting for getByRole('link', { name: 'Animal identification details', exact: true })`.

## What changed

The six labels the suite uses to reach and assert hub rows now match the frontend's `hub/copy/copy.en.js`:

| was | now |
|---|---|
| Main reason for importing | Main reason for import |
| Additional commodity details | Additional details |
| Animal identification details | Identification details |
| Transporter | Transport details |
| Contact address | Contact address for this consignment |
| Uploaded documents | Upload documents |

Touched: `flows/journey.ts`, `tests/e2e/features/hub-groups-and-cya-rows.spec.ts`, `tests/e2e/features/reason-purpose-scope.spec.ts`, `tests/e2e/features/additional-details-scope.spec.ts`, `tests/e2e/features/animal-identifiers-cap.spec.ts`, `tests/e2e/features/animal-identifiers-conditional.spec.ts`, `tests/e2e/features/documents-refresh-no-js.spec.ts`, `tests/a11y/notification-journey-initial-state.spec.ts`, `tests/a11y/notification-journey-filled-state.spec.ts`, `tests/security/frontend-conditional-pages.spec.ts`.

## What deliberately did not change

Only **hub row** labels move. The check-your-answers page has its own copy file, which this increment does not touch, so these assertions are left exactly as they were:

- `notificationView.summaryCard('Uploaded documents')` and `changeLink('Change uploaded documents')` — card title from `check-answers/copy/copy.en.js`.
- `value(contactAddress, 'Contact address')` — a summary-list row key, not a task row.
- The `6. Contact address` section heading — hub sections are inc-037, not this increment.

No test was weakened, skipped or deleted; every assertion still pins the same behaviour, at the new wording.

## Provenance

- Ticket: EUDPA-606
- Increment: inc-040 (`workareas/shared/dr1-parity-union/backlog.json`)
- Paired with: DEFRA/trade-imports-animals-frontend#352 — same branch name, cross-repo branch parity.

Verified locally: `npm run typecheck`, `npm run lint` and `npm run format:check` all clean. The E2E proof is CI, which runs the branch-tagged tests image against the branch-tagged frontend.
