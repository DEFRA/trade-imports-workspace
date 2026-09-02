# Playwright — Best Practices

Project baseline: Playwright with TypeScript, Allure reporting, multiple config files for different environments. Used in `trade-imports-animals-tests`.

---

## 1. Project structure

```
repos/trade-imports-animals-tests/
├── playwright.config.ts        ← base config
├── playwright.config.local.ts  ← local workspace-stack run
├── playwright.config.local-fast.ts  ← local without Allure
├── tests/
│   ├── journeys/               ← full user journey tests
│   │   └── notification.spec.ts
│   └── smoke/                  ← quick smoke tests
├── page-objects/               ← Page Object Model classes
│   ├── pages/
│   │   ├── origin-page.ts
│   │   ├── commodity-page.ts
│   │   └── sign-in-page.ts
│   └── journeys.ts             ← Journeys class composing page objects
├── fixtures/
│   └── index.ts                ← test.extend() with pages + journeys
└── helpers/
    └── ...
```

Tags used in this project:

| Tag | Purpose |
|-----|---------|
| `@agent` | Agent-driven tests |
| `@compose` | Requires full workspace stack |
| `@integration` | Integration-level tests |

---

## 2. playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,      // fail if test.only committed
  retries: process.env.CI ? 2 : 0,   // retry flaky tests in CI
  workers: process.env.CI ? 1 : undefined,
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

```typescript
import { test, expect } from '../fixtures/index.js'

test.describe('Origin journey', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display origin page heading @compose', async ({ pages }) => {
    await pages.origin.goto()
    await expect(pages.origin.heading).toBeVisible()
    await expect(pages.origin.heading).toHaveText('Where are the goods coming from?')
  })

  test('should show error when no country selected @compose', async ({ pages }) => {
    await pages.origin.goto()
    await pages.origin.submit()

    await expect(pages.origin.errorSummary).toBeVisible()
    await expect(page).toHaveURL('/origin')
  })
})
```

```typescript
// Single test with steps
test('complete notification journey @compose', async ({ journeys }) => {
  await test.step('Sign in', async () => {
    await journeys.signIn()
  })

  await test.step('Fill origin', async () => {
    await journeys.fillOrigin({ countryCode: 'DE' })
  })

  await test.step('Fill commodities', async () => {
    await journeys.fillCommodities({ code: '0101' })
  })

  await test.step('Check answers and submit', async () => {
    await journeys.submitNotification()
  })
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

**Journeys class** — composes page objects for multi-step flows:

```typescript
// page-objects/journeys.ts
import { type Page } from '@playwright/test'
import { SignInPage } from './pages/sign-in-page.js'
import { OriginPage } from './pages/origin-page.js'

export class Journeys {
  readonly signInPage: SignInPage
  readonly originPage: OriginPage

  constructor(page: Page) {
    this.signInPage = new SignInPage(page)
    this.originPage = new OriginPage(page)
  }

  async signIn(credentials?: { username: string; password: string }) {
    await this.signInPage.goto()
    await this.signInPage.signIn(credentials)
  }

  async completeOriginStep(options: { countryCode: string }) {
    await this.originPage.goto()
    await this.originPage.fill({ countryCode: options.countryCode, requiresRegionCode: 'no' })
  }
}
```

---

## 7. Fixtures

```typescript
// fixtures/index.ts
import { test as base, type Page } from '@playwright/test'
import { OriginPage } from '../page-objects/pages/origin-page.js'
import { CommodityPage } from '../page-objects/pages/commodity-page.js'
import { Journeys } from '../page-objects/journeys.js'

type Pages = {
  origin: OriginPage
  commodity: CommodityPage
}

type TestFixtures = {
  pages: Pages
  journeys: Journeys
}

export const test = base.extend<TestFixtures>({
  pages: async ({ page }, use) => {
    await use({
      origin: new OriginPage(page),
      commodity: new CommodityPage(page)
    })
  },
  journeys: async ({ page }, use) => {
    await use(new Journeys(page))
  }
})

export { expect } from '@playwright/test'
```

Import in tests:

```typescript
import { test, expect } from '../fixtures/index.js'

test('example', async ({ pages, journeys }) => {
  await pages.origin.goto()
  await journeys.completeOriginStep({ countryCode: 'DE' })
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

For `@compose` tagged tests, the full workspace stack must be running first:
```bash
cd /path/to/workspace
./scripts/stack/run-stack.sh
cd repos/trade-imports-animals-tests
npm run test:docker-compose
```

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

**3. Not using Page Object Model for repeated interactions**
```typescript
// Wrong — duplicated locators across tests
await page.getByRole('combobox', { name: 'Country' }).selectOption('DE')
await page.getByRole('button', { name: 'Continue' }).click()

// Correct — encapsulated in page object
await pages.origin.fill({ countryCode: 'DE', requiresRegionCode: 'no' })
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

**10. Not cleaning up state between tests**
```typescript
// If tests create data, ensure teardown or use test-isolated data
test.afterEach(async ({ request }) => {
  // Delete test data via API if needed
  await request.delete('/api/test/notifications')
})
```
