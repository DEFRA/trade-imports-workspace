# Playwright — Best Practices

Project baseline: Playwright with TypeScript, Allure reporting, multiple config files for different environments. Used in `trade-imports-ins-tests`.

---

## 1. Project structure

```
repos/trade-imports-ins-tests/
├── playwright.config.ts                 ← CDP config
├── playwright.docker-compose.config.ts  ← local workspace-stack config
├── utils/playwright/shared-config.ts    ← the `chromium` project, reporters, retries shared by both
├── tests/
│   └── <domain>/                        ← one domain per directory:
│       ├── a11y/                        ←   animals, animals-admin, ins, plants
│       ├── e2e/
│       │   ├── features/
│       │   ├── journeys/
│       │   ├── pages/
│       │   └── visual/
│       └── security/
├── page-objects/<domain>/, shared/      ← Page Object Model classes: locators and single-page actions
├── flows/<domain>/, shared/             ← journey flows: to* methods that reach a page, and seeding
├── domain/<domain>/, shared/            ← test data and domain types
├── resources/reference-data/            ← captured copies of real reference-data responses
└── fixtures/
    └── ui.ts                            ← test.extend() with animalsPages, plantsPages, animalsJourney, …
```

Not every domain has every folder. Each domain has a local script per suite,
`test:docker-compose:<domain>[:a11y|:security]`, and a CDP profile per suite,
`<domain>:<suite>`.

Tags used in this project. Tags select the suite; the path selects the domain (`tests/<domain>/`).

| Tag | Purpose |
|-----|---------|
| `@a11y` | Accessibility suite |
| `@active` | ZAP active-scan suite (destructive, docker-compose only) |
| `@compose` | Requires the full workspace stack |
| `@visual` | Visual regression snapshots |

Fixtures are named per domain, as in `fixtures/ui.ts`: `animalsPages`,
`plantsPages` and so on for page objects, `animalsJourney` and
`plantsJourney` for journey flows, and `animalsSeededJourney` for seeding.
`pages` holds the shared page objects. Specs import `test` and `expect` from
`@fixtures`.

The rules for what a spec does (reaching pages, when to seed, test data,
assertions, running and diagnosing) are in
[`playwright/BEST_PRACTICES.md`](../playwright/BEST_PRACTICES.md).

---

## 2. playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,      // fail if test.only committed
  retries: process.env.CI ? 2 : 0,   // retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined,  // the suite reads PLAYWRIGHT_WORKERS instead
  reporter: [
    ['list'],
    ['allure-playwright']            // Allure HTML report
  ],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',         // capture trace on first retry
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
})
```

Environment-specific configs override the base:

```typescript
// playwright.config.local.ts
import base from './playwright.config.js'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  ...base,
  use: {
    ...base.use,
    baseURL: 'http://localhost:3000'
  }
})
```

---

## 3. Writing tests

A page spec reaches its page through a journey flow `to*` method, then tests that page:

```typescript
import { test, expect } from '@fixtures'

test.describe('Origin of the import page', () => {
  test.beforeEach(async ({ animalsJourney }) => {
    await animalsJourney.toOriginOfImport()
  })

  test('renders the page controls', async ({ animalsPages }) => {
    await expect(animalsPages.originOfImport.heading).toBeVisible()
    await expect(animalsPages.originOfImport.countryOfOrigin).toBeVisible()
    await expect(animalsPages.originOfImport.saveAndContinue).toBeVisible()
  })
})
```

A journey spec clicks through the pages it is about, then asserts what the user's answers became:

```typescript
test('shows the origin answers on the notification view after the opening run', async ({ animalsJourney, animalsPages }) => {
  await animalsJourney.toReview()

  const importDetails = animalsPages.notificationView.summaryCard('Import details')
  await expect(animalsPages.notificationView.summaryValue(importDetails, 'Region of origin code')).toHaveText('FR-75')
})
```

Never commit `test.only()` — it's caught by `forbidOnly: !!process.env.CI`.

---

## 4. Locators — preferred approach

Use **accessible locators** in this order (most to least preferred):

```typescript
// 1. By ARIA role + accessible name (best)
page.getByRole('button', { name: 'Continue' })
page.getByRole('link', { name: 'Back' })
page.getByRole('heading', { name: 'Origin of the import' })
page.getByRole('radio', { name: 'Yes' })
page.getByRole('checkbox', { name: 'Health certificate' })
page.getByRole('combobox', { name: 'Country of origin' })  // select elements
page.getByRole('textbox', { name: 'Reference number' })
page.getByRole('alert')  // error summary (role="alert" on govuk-error-summary)

// 2. By form label text
page.getByLabel('National Insurance number')
page.getByLabel('Date of birth')

// 3. By visible text
page.getByText('Confirm and submit')
page.getByText('There is a problem', { exact: true })

// 4. By test ID (data-testid attribute)
page.getByTestId('submit-button')

// 5. CSS selector (last resort)
page.locator('.govuk-button')
page.locator('form')
```

**Never use:** `page.locator('#id')` (fragile to ID changes), XPath.

**GOV.UK Frontend specific patterns:**

```typescript
// Error summary — role is "alert"
const errorSummary = page.getByRole('alert')
await expect(errorSummary).toBeVisible()
await expect(errorSummary).toContainText('There is a problem')

// Individual field error
const fieldError = page.getByText('Select a country')
await expect(fieldError).toBeVisible()

// Error summary links to fields
const errorLink = errorSummary.getByRole('link', { name: 'Select a country' })
await errorLink.click()  // should focus the field

// Radios — use label text
await page.getByRole('radio', { name: 'Yes' }).check()

// Checkboxes
await page.getByRole('checkbox', { name: 'Health certificate' }).check()

// Select dropdown
await page.getByRole('combobox', { name: 'Country of origin' }).selectOption('DE')

// Notification banner success
await expect(page.getByRole('region', { name: 'Success' })).toBeVisible()

// Phase banner tag
await expect(page.getByText('Beta')).toBeVisible()

// Table rows
const rows = page.getByRole('table').getByRole('row')
await expect(rows).toHaveCount(5)  // including header row

// Specific cell
await expect(page.getByRole('cell', { name: 'DRAFT.IMP.2026.1' })).toBeVisible()
```

---

## 5. Assertions

```typescript
// Locator assertions — these auto-wait
await expect(locator).toBeVisible()
await expect(locator).toBeHidden()
await expect(locator).toBeEnabled()
await expect(locator).toBeDisabled()
await expect(locator).toBeChecked()
await expect(locator).toBeEmpty()
await expect(locator).toHaveText('exact text')
await expect(locator).toContainText('partial text')
await expect(locator).toHaveValue('input value')
await expect(locator).toHaveAttribute('href', '/path')
await expect(locator).toHaveClass(/govuk-button/)
await expect(locator).toHaveCount(3)
await expect(locator).toHaveCSS('color', 'rgb(0, 0, 0)')

// Page-level assertions
await expect(page).toHaveURL('/origin')
await expect(page).toHaveURL(/\/notifications\/\d+/)
await expect(page).toHaveTitle('Origin — Import Notifications')

// Non-locator assertions
expect(someArray).toHaveLength(3)
expect(someString).toContain('partial')
expect(someValue).toBe('exact')

// Soft assertions — continue on failure, report all at end
await expect.soft(locator).toBeVisible()
await expect.soft(page).toHaveURL('/expected')
// All soft failures reported together
```

**`expect.poll`** — for async conditions outside the DOM (used in this project):

```typescript
await expect.poll(async () => {
  const response = await fetch('/api/status')
  return response.status
}, { timeout: 10000 }).toBe(200)
```

---

## 6. Page Object Model

```typescript
// page-objects/pages/origin-page.ts
import { type Page, type Locator } from '@playwright/test'

export class OriginPage {
  readonly page: Page
  readonly heading: Locator
  readonly countrySelect: Locator
  readonly regionCodeYes: Locator
  readonly regionCodeNo: Locator
  readonly continueButton: Locator
  readonly errorSummary: Locator

  // Convention in this project
  readonly expectedUrl = '/origin'
  readonly expectedHeading = 'Where are the goods coming from?'

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByRole('heading', { name: this.expectedHeading })
    this.countrySelect = page.getByRole('combobox', { name: 'Country of origin' })
    this.regionCodeYes = page.getByRole('radio', { name: 'Yes' })
    this.regionCodeNo = page.getByRole('radio', { name: 'No' })
    this.continueButton = page.getByRole('button', { name: 'Continue' })
    this.errorSummary = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto(this.expectedUrl)
  }

  async selectCountry(countryCode: string) {
    await this.countrySelect.selectOption(countryCode)
  }

  async selectRequiresRegionCode(value: 'yes' | 'no') {
    if (value === 'yes') {
      await this.regionCodeYes.check()
    } else {
      await this.regionCodeNo.check()
    }
  }

  async submit() {
    await this.continueButton.click()
  }

  async fill(options: { countryCode: string; requiresRegionCode: 'yes' | 'no' }) {
    await this.selectCountry(options.countryCode)
    await this.selectRequiresRegionCode(options.requiresRegionCode)
    await this.submit()
  }
}
```

**Journey flows** compose page objects into the steps that reach a page. Each domain has one, in `flows/<domain>/journey.ts`:

```typescript
// flows/plants/journey.ts
export class PlantsJourney {
  constructor(
    private readonly plantsPages: PlantsPages,
    private readonly context: JourneyContext,
  ) {}

  async toDashboard(): Promise<void> {
    await this.plantsPages.dashboard.open()
    await this.plantsPages.dashboard.heading.waitFor()
  }

  async toArrivalStatus(country: string): Promise<void> {
    await this.plantsPages.origin.selectCountry(country)
    await this.plantsPages.origin.btnSaveAndContinue.click()
    await this.plantsPages.arrivalStatus.heading.waitFor()
  }
}
```

- A `to*` method reaches one page and ends by waiting for its heading.
- Specs reach pages through `to*` methods, not by repeating the clicks.
- A sequence of steps two specs share becomes a `to*` method, and the copies in the specs are deleted in the same change.
- Flows hold no assertions.
- Seeding lives in its own flow (`flows/animals/seeded-journey.ts`), which posts each page's form through the frontend.

---

## 7. Fixtures

`fixtures/ui.ts` builds every page object and flow per test. A new flow gets a fixture there:

```typescript
// fixtures/ui.ts
export const test = base.extend<PageFixtures, AuthWorkerFixtures>({
  plantsPages: async ({ page }, use) => {
    await use(createPlantsPages(page))
  },
  journeyContext: async ({}, use) => {
    await use({})
  },
  plantsJourney: async ({ plantsPages, journeyContext }, use) => {
    await use(new PlantsJourney(plantsPages, journeyContext))
  },
})
```

Import in tests:

```typescript
import { test, expect } from '@fixtures'

test.beforeEach(async ({ plantsJourney }) => {
  await plantsJourney.toDashboard()
})
```

---

## 8. Authentication

OIDC login flow:

```typescript
// page-objects/pages/sign-in-page.ts
export class SignInPage {
  readonly page: Page
  readonly usernameInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  constructor(page: Page) {
    this.page = page
    this.usernameInput = page.getByLabel('Email address')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: 'Sign in' })
  }

  async goto() {
    await this.page.goto('/auth/sign-in')
  }

  async signIn(credentials = {
    username: process.env.TEST_USERNAME!,
    password: process.env.TEST_PASSWORD!
  }) {
    await this.usernameInput.fill(credentials.username)
    // fillSensitiveInput — used for password fields to avoid trace capture
    await this.page.locator('[type="password"]').fill(credentials.password)
    await this.submitButton.click()
    await this.page.waitForURL('/')
  }
}
```

**Reuse auth state** across tests (avoid signing in for every test):

```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test'

setup('authenticate', async ({ page }) => {
  await page.goto('/auth/sign-in')
  await page.getByLabel('Email').fill(process.env.TEST_USERNAME!)
  await page.locator('[type="password"]').fill(process.env.TEST_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('/')

  await page.context().storageState({ path: 'auth-state.json' })
})
```

```typescript
// playwright.config.ts
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'auth-state.json'
    },
    dependencies: ['setup']
  }
]
```

---

## 9. Navigation and actions

```typescript
// Navigation
await page.goto('/origin')
await page.goto('/', { waitUntil: 'networkidle' })

// Waiting for URL change after action
await Promise.all([
  page.waitForURL('/commodities'),
  page.getByRole('button', { name: 'Continue' }).click()
])

// Actions
await locator.click()
await locator.fill('value')          // clears then types
await locator.type('value')          // types character by character (for masked inputs)
await locator.selectOption('DE')     // by value
await locator.selectOption({ label: 'Germany' })  // by label
await locator.check()
await locator.uncheck()
await locator.focus()
await locator.press('Enter')
await locator.press('Tab')
await page.keyboard.press('Enter')

// File upload
await page.locator('input[type="file"]').setInputFiles('path/to/file.csv')
```

---

## 10. Waiting — auto-wait vs explicit

Playwright **auto-waits** for: element to exist, be visible, be stable (not animating), be enabled, receive events. You don't need explicit waits for most interactions.

```typescript
// Auto-wait — just click, Playwright waits
await page.getByRole('button', { name: 'Continue' }).click()

// Do NOT use — arbitrary sleep, makes tests flaky
await page.waitForTimeout(1000)  // ← never use this

// waitForURL — after navigation actions
await page.waitForURL('/confirmation')

// waitForLoadState — only when content loads asynchronously after navigation
await page.waitForLoadState('networkidle')

// waitFor — for conditionally-present elements
await page.getByText('Processing complete').waitFor({ state: 'visible', timeout: 30000 })

// expect.poll — for polling async conditions
await expect.poll(
  async () => page.getByRole('status').textContent(),
  { timeout: 15000, intervals: [500] }
).toBe('Complete')
```

---

## 11. Debugging

```bash
# Headed mode — watch the browser
npx playwright test --headed

# Debug inspector
npx playwright test --debug

# Single test
npx playwright test tests/journeys/notification.spec.ts --debug

# Specific test by title
npx playwright test -g "should display origin page"

# Show report after run
npx playwright show-report

# Generate Allure report
npm run report
```

```typescript
// Breakpoint in test code
await page.pause()  // opens Playwright inspector at this point
```

Traces (configured in `playwright.config.ts`):

```typescript
use: {
  trace: 'on-first-retry'  // captures trace on first retry — view at trace.playwright.dev
}
```

```bash
npx playwright show-trace trace.zip
```

---

## 12. How tests run in this project

```bash
npm install
npx playwright install chromium    # first time — install browser binary

npm run test:docker-compose       # against the local workspace stack
npm run test:docker-compose:a11y  # the accessibility suite against the same stack
npm test                          # CDP Portal config
```

Environment variables:

| Variable | Purpose |
|---------|---------|
| `BASE_URL` | Target URL, defaults to `http://localhost:3000` |
| `TEST_USERNAME` | OIDC username for auth |
| `TEST_PASSWORD` | OIDC password for auth |
| `ALLURE_RESULTS_DIR` | Output dir for Allure results |
| `PLAYWRIGHT_WORKERS` | How many browsers run at once: a whole number or a percentage |

For `@compose` tagged tests, the full workspace stack must be running first. Start it with `tim docker dev` (or `scripts/stack/run-stack.sh -d`) so it runs your local changes, then:
```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose             # every domain
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose:animals     # one domain
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests run test:docker-compose -- tests/plants/  # any domain, by path (trailing slash: paths are regexes)
```

`test:docker-compose` is the one local runner. Redirect its output to a file and read the file once.

### Reading a failure

Playwright saves each failed test's evidence in its own folder under `test-results/` in the tests repo:

| File | What it holds |
|------|---------------|
| `error-context.md` | The failed assertion and the page's accessibility tree when it failed |
| `test-failed-1.png` | A screenshot of the page when it failed |
| `trace.zip` | The trace of a retried test; open it with `npx playwright show-trace` or the `playwright-trace` skill |

Read `error-context.md` first. The console's last lines drop the assertion detail and element state.

---

## 13. Common mistakes

**1. CSS selectors instead of ARIA locators**
```typescript
// Wrong — brittle, breaks on CSS changes
page.locator('.govuk-button--start')

// Correct — resilient to styling changes
page.getByRole('link', { name: 'Start now' })
```

**2. `waitForTimeout` instead of auto-wait**
```typescript
// Wrong — arbitrary sleep, flaky
await page.waitForTimeout(2000)
await page.getByText('Done').click()

// Correct — Playwright auto-waits
await page.getByText('Done').click()
```

**3. Walking to a page step by step in the spec**
```typescript
// Wrong — the same clicks copied into every spec that needs the page
await plantsPages.origin.selectCountry('Germany')
await plantsPages.origin.btnSaveAndContinue.click()
await plantsPages.arrivalStatus.heading.waitFor()

// Correct — one to* method on the journey flow
await plantsJourney.toArrivalStatus('Germany')
```

**4. Committing `test.only()`**
```typescript
// Wrong — will be caught by CI
test.only('my test', async ({ page }) => { ... })

// Remove .only before committing
test('my test', async ({ page }) => { ... })
```

**5. Hardcoding base URLs**
```typescript
// Wrong
await page.goto('http://localhost:3000/origin')

// Correct — uses baseURL from config
await page.goto('/origin')
```

**6. Not using `storageState` for auth**
```typescript
// Wrong — signs in before every test (slow, brittle)
beforeEach(async ({ page }) => {
  await page.goto('/sign-in')
  await page.fill('[name="email"]', email)
  // ...
})

// Correct — reuse auth state from setup project
// Configured in playwright.config.ts with storageState
```

**7. Testing CSS classes instead of user-visible behaviour**
```typescript
// Wrong — tests implementation detail
await expect(button).toHaveClass('govuk-button--disabled')

// Correct — tests what the user experiences
await expect(button).toBeDisabled()
```

**8. Chaining locators incorrectly**
```typescript
// Wrong — breaks auto-wait
const text = await page.getByRole('heading').textContent()
expect(text).toBe('Expected')

// Correct — auto-waits
await expect(page.getByRole('heading')).toHaveText('Expected')
```

**9. Using `page.locator('#id')` for form fields**
```typescript
// Wrong — IDs in GOV.UK macros can change
page.locator('#countryCode')

// Correct — uses accessible label
page.getByRole('combobox', { name: 'Country of origin' })
```

**10. Tests that share state**

Each test creates the notification it needs, so tests can run in any order and in parallel. A test that creates records outside a notification, such as address-book entries, removes them when it finishes.

**11. Seeding a journey test**
```typescript
// Wrong — the test is about the opening run, but the run is seeded
test('walks a notification through every opening-run task', async ({ animalsSeededJourney }) => {
  await animalsSeededJourney.createDraftNotification('readyToSubmit')
  // ...
})

// Correct — the opening run is clicked through, because the clicks are what it tests
test('walks a notification through every opening-run task', async ({ animalsJourney }) => {
  await animalsJourney.walkOpeningRunCattleByAir(document)
  // ...
})
```

See [When to seed](../playwright/BEST_PRACTICES.md#when-to-seed).

**12. Invented test data**
```typescript
// Wrong — a country the reference-data service never returns
await plantsJourney.toArrivalStatus('Narnia')

// Correct — a country from the captured reference-data list
await plantsJourney.toArrivalStatus(countryByCode('DE').display)
```

See [Test data is copied, never invented](../playwright/BEST_PRACTICES.md#test-data-is-copied-never-invented).
