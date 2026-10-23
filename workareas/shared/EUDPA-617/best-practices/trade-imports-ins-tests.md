# Best practices applicable to trade-imports-ins-tests

Concatenated from `docs/best-practices/` at prepare-review time.
Apply these standards when reviewing files in this repo.


---

## Source: `docs/best-practices/playwright/BEST_PRACTICES.md`

# Playwright Best Practices

**Golden rule:** design tests for simplicity. A spec reads like the page it tests, not like a logic puzzle.

These rules apply to every spec in `trade-imports-ins-tests`. That repo has one domain per frontend (`animals`, `animals-admin`, `ins`, `plants`) and one directory per test type (`e2e`, `a11y`, `security`) inside each. The words are defined in [Test and spec vocabulary](../../testing/test-and-spec-vocabulary.md). For layout, fixtures, locators and config, see [`node/playwright.md`](../node/playwright.md).

## Test design

### Arrange, act, assert

Keep the three parts in that order, separated by a blank line.

```typescript
test('shows an error summary when submitted unconfirmed', async ({ pages, animalsPages }) => {
  await animalsPages.declaration.continueButton.click();

  await expect(pages.page.getByRole('heading', { name: 'There is a problem' })).toBeVisible();
});
```

### A title states what the assertions prove

Read the assertions, then write the title. If the title says "submitted", the test must assert a submitted state.

```typescript
// Bad: the body checks one heading
test('checkout test', ...)
test('declaration works end to end', ...)

// Good
test('shows an error summary when submitted unconfirmed', ...)
```

No ticket keys, backlog or acceptance-criteria ids, release names or session words in titles, describe blocks or comments. No history: no "after the change", no `REMOVED_*` constants. A test that proves something was removed asserts the exact text that is there now.

A test must fail without the change it covers.

### Keep specs flat

No conditionals in a spec. If a spec needs a branch, it is two tests.

## Reaching the page under test

A spec reaches its page through a `to*` method on its domain's journey flow, in `flows/<domain>/journey.ts`. The fixture is `animalsJourney` or `plantsJourney`. A domain with no journey flow yet gets one the first time two specs share a route to a page; `animals-admin` uses its `animalsAdminNavigation` flow.

```typescript
// Bad: the spec walks the journey itself
test.beforeEach(async ({ animalsPages }) => {
  await animalsPages.dashboard.open();
  await animalsPages.dashboard.btnCreateNewNotification.click();
  await animalsPages.originOfImport.heading.waitFor();
});

// Good
test.beforeEach(async ({ animalsJourney }) => {
  await animalsJourney.toOriginOfImport();
});
```

A sequence of steps used by two specs becomes a `to*` method on the journey flow, and the local copies are deleted in the same change.

```typescript
// Bad: the same helper written into arrival.spec.ts and overview-task-return.spec.ts
const toArrivalStatus = async (plantsJourney: PlantsJourney): Promise<string> => {
  const reference = await plantsJourney.startNotification();
  await plantsJourney.chooseCommodityType(PLANTS_FOR_PLANTING);
  await plantsJourney.addCommodityLine(PLANTS_FOR_PLANTING, plantsLine);
  await plantsJourney.toOrigin();
  await plantsJourney.toArrivalStatus(GERMANY);
  return reference;
};

// Good: one method on PlantsJourney, both specs call it, both local copies deleted
const reference = await plantsJourney.toPlantsForPlantingArrivalStatus(GERMANY);
```

A `to*` method ends by waiting for the target page's heading, so the spec starts on a loaded page.

Methods that answer a page (`fillOriginOfImport`, `answerArrivalStatus`) live on the same flow. Locators live on page objects under `page-objects/<domain>/`. Assertions stay in specs.

## When to seed

A journey test's value is the clicks: navigation, task-list progress, and what the user picked carrying through. Seeding a journey test keeps its name and loses its coverage.

Keep a test in the browser when its title, describe block or purpose is about:

- the journey, or the order of pages
- a lifecycle step: submit, amend, resubmit, cancel
- answers being saved and shown again
- what the user picked carrying through to later pages
- hub or task-list state between sections

Seed only when the journey is set-up for a different assertion: one page, one transition, one error message.

```typescript
// Good: the declaration page's own behaviour, reached from a seeded draft
test.beforeEach(async ({ animalsSeededJourney, animalsPages }) => {
  const referenceNumber = await animalsSeededJourney.createDraftNotification();
  await animalsSeededJourney.resumeInUi(referenceNumber, animalsPages.notificationView);
  await animalsPages.notificationView.continueButton.click();
  await animalsPages.declaration.heading.waitFor();
});
```

- Seed through the frontend's own save-and-continue routes (`AnimalsSeededJourney`), never by writing to the backend or the database. Only the frontend writes the full record the UI reads back.
- A seeded draft or submission carries only the mandatory answers, as `submitNotification()` does. Pass `ALL_ANSWERS_WITHOUT_DOCUMENT` when the test needs the optional ones. Never type the answers in the test: read them from the answer sets in `domain/animals/constants/journey-options.ts`.
- When unsure, keep the test in the browser and say so in the pull request.
- Never seed for speed. A slow journey test is coverage worth keeping.
- A test behaves the same on the local stack and on CDP. No flag that seeds on one environment and clicks through on the other.

## Test data is copied, never invented

Seeded state must be indistinguishable from state a user creates through the UI. Invented values break pages that read them back and make tests assert things a real user cannot produce.

- One seed step per page. Each step posts exactly the fields that page's save-and-continue posts. Steps compose in page order to reach any journey state, as in `flows/animals/seed-form-steps.ts`.
- Values come from the data the frontend itself serves. Copy canned entries verbatim; do not write lookalikes.
- Reference lists (countries, ports) are copies of a real call to the service the frontend uses, as in `resources/reference-data/`. Prefer fetching from the running service over a copy that can drift.
- Seeded answers stay in step with the answers the journey flow clicks. `api-seed-parity.spec.ts` compares the two.
- No Faker for a value the frontend serves or a picker chooses. Faker may only pick which canned entry to use, or fill a field a user types freely, such as an internal reference.

```typescript
// Bad: an address that no picker on the page can produce
const consignor = { name: faker.company.name(), postcode: faker.location.zipCode() };

// Good: the record the address book serves, by its real name
consignor: 'Astra Rosales',
```

## Locators

Use role-based and label-based locators. See [`node/playwright.md` §4](../node/playwright.md#4-locators--preferred-approach) for the order of preference and GOV.UK Frontend patterns.

Avoid CSS class selectors (`.govuk-button`), XPath and generated ids.

A page-object accessor returns what its name says. `options` means every rendered option. If a filtered view is useful, give it its own name, such as `selectableOptions`.

## Assertions

### Use web-first assertions

```typescript
// Bad: no retry
expect(await page.getByText('Success').isVisible()).toBe(true);

// Good
await expect(page.getByText('Success')).toBeVisible();
```

For state outside the DOM, use `expect.poll`:

```typescript
await expect.poll(() => collection.countDocuments({ referenceNumber }), { timeout: timeouts.short }).toBe(1);
```

### Assert the whole rendered list

When a test lists the options of a `<select>` or any rendered list, assert every item the page renders, in order: the placeholder, any divider, then the real options. Do not hide a divider with `option:not([disabled])` or filter it out in a page object. The full list catches a divider being removed by accident.

```typescript
// Bad
const options = page.locator('option:not([disabled])');

// Good
await expect(portOfEntry.options).toHaveText(['Select a port', 'Dover', '──────────', 'Felixstowe', 'Heathrow']);
```

The same applies to unit and component tests whose output includes visual decoration.

### No measured geometry

Do not assert on element positions, heights or spacing with a tolerance. A tolerance turns a design opinion into a magic number that stays red after a correct fix, or green over a real defect.

- Appearance belongs in a `@visual` baseline: one image, reviewed by a person, nothing to tune.
- A true-or-false layout check is fine. For example, no horizontal overflow: `scrollWidth > clientWidth`.

If you find yourself choosing a tolerance, use a baseline instead.

### Fixing a flaky assertion keeps its intent

When an assertion is flaky because it does not wait, replace it with the waiting form of the same check. Do not delete it because a later assertion happens to cover it.

```typescript
// Flaky: does not wait for the rows to render
expect(await rows.count()).toBeGreaterThan(4);

// Good: the same rule, waiting
await expect.poll(() => rows.count()).toBeGreaterThan(4);
```

Deleting the flaky line also stops the flake, but the rule "at least five rows" is then stated nowhere.

Delete an assertion only when it checks nothing, for example a precondition the next line already needs.

## Waiting

Actions such as `click()` and `fill()` wait on their own. When you need to wait, wait for a condition:

```typescript
await page.waitForURL('**/declaration');
await expect(animalsPages.declaration.heading).toBeVisible();
```

Never use `page.waitForTimeout()`.

Never raise a timeout to cure tests that queue behind each other. Find what is slow and fix that. Raising one budget is right only for a test that is slow on purpose on the real environment, through its own `test.setTimeout`.

## Running and diagnosing

### Always run E2E when the work calls for it

Never skip E2E because the change is "test-only", "a pure refactor" or "slow". E2E exists to catch the safe-looking change that is not. The suite is quick: do not hedge about its runtime or offer it as optional.

Run the standard script from the tests repo, against a running stack, and send the output to a file:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose > /tmp/e2e-run.log 2>&1
```

Use `test:docker-compose:<domain>` for one domain. The script list is in [`node/playwright.md` §12](../node/playwright.md#12-how-tests-run-in-this-project), and the tags and what each one selects are in [`node/playwright.md` §1](../node/playwright.md#1-project-structure). To run what a repo's pull request runs, look up its entry in [`config/e2e-tests-pr-scope.json`](../../../config/e2e-tests-pr-scope.json).

### Diagnose from the test results, not the console

When a test fails, read the files Playwright saves under `test-results/`:

- `test-results/*/error-context.md`: the failed assertion and the page's accessibility tree at the moment it failed
- `test-results/*/test-failed-1.png`: a screenshot of that moment
- `test-results/*/trace.zip`: the trace, when the run retried

Do not diagnose from the last lines of the console output. They lose the assertion detail and element state.

### Run ported specs against the live app

When you port specs from one version of a UI to another, for example when resolving a merge, run each ported spec and each spec that uses a page object you touched against the running app before you report it done. Run them one at a time:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose -- tests/animals/e2e/pages/origin.spec.ts --workers=1
```

Adapt locators from the failure's `error-context.md` and the frontend's source, never from the old specs. Locators copied from the old UI look right and fail together.

### Keep coverage on the real environment

E2E stability work removes causes of flakiness. Speed is a side effect, never the goal.

- Do not tag a test `@compose` to keep it off CDP, cut its iterations, or replace it with a unit test because it is slow there. Give it its own `test.setTimeout`.
- Name the cause of flakiness each change removes. A change that only makes the suite faster is not a stability fix.
- Fixing the worst flaky test does not make a suite green; it shows the next cause.

### Worker count

`PLAYWRIGHT_WORKERS` sets how many browsers run at once. On the local stack, 16 workers against one frontend is the measured ceiling: 32 workers took no less time. The frontend is the bottleneck, so more workers only queue. Raise it only if the frontend gains real concurrency, and re-measure.

## Common review flags

| Issue | Problem |
|-------|---------|
| `waitForTimeout()` | Slow and flaky |
| A raised timeout to fix queueing | Hides the slow service |
| CSS class selectors | Break on styling |
| `isVisible()` inside `expect()` | No retry |
| A test that depends on another test | Breaks isolation |
| A spec that walks to its page step by step | Use or add a journey `to*` method |
| The same step sequence in two specs | Move it to a `to*` method |
| A journey, lifecycle or persistence test that seeds | Loses the coverage its title claims |
| Seeding by writing to the backend or database | State the UI never produces |
| Faker or invented values | Data a user cannot produce |
| A locator that filters out rendered items | Hides what the page shows |
| Geometry asserted with a tolerance | Use a `@visual` baseline |
| A flaky assertion deleted rather than made to wait | Loses the rule it stated |
| A slow CDP test tagged `@compose` | Drops real-environment coverage |
| Assertions in page objects or flows | Hides intent |
| Missing `await` | Silent failures |
| A title that claims more than the assertions prove | Misleads the reader |
| Ticket keys, ids or history in titles or comments | Meaningless to the next reader |
| Conditionals in a spec | Hides intent; write two tests |
| Signing in inside every test | Slow; the fixtures reuse the session |
