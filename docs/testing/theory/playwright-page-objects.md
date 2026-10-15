# Playwright page objects

A pattern for keeping Playwright UI/E2E tests (the top of [test-pyramid.md](test-pyramid.md)) maintainable. Synthesised from Fowler's `PageObject` bliki entry and Playwright's official Page Object Models documentation.

## The problem it solves

UI tests are already the pyramid's most brittle layer — see [test-pyramid.md](test-pyramid.md)'s ice-cream-cone anti-pattern. If tests also talk to the page directly (locators and selectors scattered through every test), a single UI change breaks every test that touches that part of the page, and the breakage is duplicated across however many tests happen to use it.

## The pattern

A page object wraps a page (or a meaningful fragment of one) behind an application-specific API: "a page object wraps an HTML page, or fragment, with an application-specific API, allowing you to manipulate page elements without digging around in the HTML." Tests call methods like `login(user, password)` or `submitApplication()`, not `page.getByRole('button', { name: 'Submit' })` inline.

Two guarantees this gives:
- The test reads in terms of what the user is doing, not how the page is built — supporting the **readable** property from [test-desiderata.md](test-desiderata.md).
- When the UI changes, exactly one place needs to change (the page object) — every test that uses it keeps working unmodified.

## Structure: locators as getters

The preferred way to expose a locator is a **getter**:

```typescript
get formLayoutsMenuItem(): Locator {
  return this.page.getByText('Form Layouts');
}
```

A getter defines the locator only when it's actually accessed, rather than resolving every field up front — it stays cheap regardless of how many locators a page object declares, and it's what this workspace's own page objects use throughout. Playwright's own official example instead declares locators as public readonly fields assigned once in the constructor:

```typescript
readonly getStartedLink: Locator;

constructor(page: Page) {
  this.page = page;
  this.getStartedLink = page.locator('a', { hasText: 'Get started' });
}
```

Both expose the same thing — a lazy, auto-waiting `Locator`, not a resolved reference — and the test uses either one identically:

```typescript
// in the test
const playwrightDev = new PlaywrightDevPage(page);
await playwrightDev.goto();
await expect(playwrightDev.tocList).toHaveText([...]);
```

This is safe either way because a `Locator` is a lazy query descriptor — it re-resolves the DOM and auto-waits (visibility, actionability) every time it's used, so exposing it doesn't hand the test a fragile handle. The assertion (`toHaveText`, `toBeVisible`, and what value is expected) is still written in the test — the page object exposes the locator, not a pre-built check.

## What still belongs strictly inside the page object

**Model the page the way a user thinks about it, not the way the HTML is structured.** A page object typically represents a meaningful chunk of UI (a form, a list, a nav header) rather than one object per literal HTML page — several page objects can compose a single page, and one page object's methods can return another page object to represent navigation.

**Selector strings never appear inline in a test.** `page.locator(...)`, `getByRole(...)`, and any other selector logic live only inside the page object's getters — a test only ever touches the named field or method.

## Anti-pattern: bypassing the locator, or reaching for it in the test body

Two ways this pattern gets undone in practice:

- **Raw element handles.** Reaching for `page.$()` or an `ElementHandle` instead of `page.locator()`/`getByRole()` — often on the mistaken belief that "page objects shouldn't expose elements" — reintroduces the exact staleness and timing brittleness Playwright's locator model exists to remove. A `Locator` field is the correct, resilient way to give a test something to query or assert against; an `ElementHandle` is not.
- **Selector logic inside the test.** Simon Stewart's rule, endorsed by Fowler, still applies to the selector itself: if a test is building its own `page.locator(...)` call rather than reading a field the page object already exposes, the test is back to being coupled to the page's implementation, and the next selector change breaks it directly instead of being absorbed by the page object.

## Anti-pattern: baking a specific test's expectations into the page object

A page object method that hardcodes one scenario's expected value (e.g. `expectWelcomeMessageForNewUser()` asserting a specific string) overfits the API to a single test and defeats the point of having a reusable page object at all. Keep the page object's surface generic — expose the locator or read the value — and let each test decide what value it expects.

## References

- Fowler, M. — [PageObject](http://martinfowler.com/bliki/PageObject.html) (bliki entry)
- Playwright — [Page object models](https://playwright.dev/docs/pom)
- Naghavipour, M. — [Mastering Locator Management in Playwright's Page Object Model (POM)](https://medium.com/@m.naghavipour/mastering-locator-management-in-playwrights-page-object-model-pom-best-practices-and-patterns-b3a77da641cc) (lazy-loaded getters)
